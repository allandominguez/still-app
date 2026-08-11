import * as SQLite from 'expo-sqlite'

import { trace } from '../logging/trace'
import { migrations } from './migrations'

let db: SQLite.SQLiteDatabase | null = null
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null

const TRACED_METHODS = new Set(['getFirstAsync', 'getAllAsync', 'runAsync', 'execAsync'])

// expo-sqlite's native binding isn't safe for concurrent calls on one connection — this
// queues every call so only one is ever in flight, avoiding a NativeDatabase NullPointerException.
function withSerialization(
  database: SQLite.SQLiteDatabase,
  connectionId: string,
): SQLite.SQLiteDatabase {
  let queue: Promise<unknown> = Promise.resolve()
  let seq = 0

  return new Proxy(database, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)
      if (typeof value !== 'function' || typeof prop !== 'string' || !TRACED_METHODS.has(prop)) {
        return typeof value === 'function' ? value.bind(target) : value
      }

      const original = value as (...args: unknown[]) => Promise<unknown>
      return (...args: unknown[]) => {
        const callSeq = ++seq
        trace('[db-queue] enqueue', { connectionId, callSeq, method: prop })

        const run = queue.then(async () => {
          const start = Date.now()
          trace('[db-queue] start', { connectionId, callSeq, method: prop })
          try {
            const result = await original.apply(target, args)
            trace('[db-queue] done', {
              connectionId,
              callSeq,
              method: prop,
              ms: Date.now() - start,
            })
            return result
          } catch (error) {
            trace('[db-queue] error', {
              connectionId,
              callSeq,
              method: prop,
              ms: Date.now() - start,
              error: String(error),
            })
            throw error
          }
        })
        queue = run.catch(() => undefined)
        return run
      }
    },
  })
}

// Diagnostic wrapper for an unconfirmed query-hang report — traces every call transparently.
// A hang shows up as a "start" log with no matching "done". Remove once root-caused.
function withTracing(database: SQLite.SQLiteDatabase): SQLite.SQLiteDatabase {
  return new Proxy(database, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)
      if (typeof value !== 'function' || typeof prop !== 'string' || !TRACED_METHODS.has(prop)) {
        return typeof value === 'function' ? value.bind(target) : value
      }

      const original = value as (...args: unknown[]) => Promise<unknown>
      return async (...args: unknown[]) => {
        const label = `[db] ${prop}(${JSON.stringify(args[0])})`
        const start = Date.now()
        console.log(`${label} start`)
        try {
          const result = await original.apply(target, args)
          console.log(`${label} done (${Date.now() - start}ms)`)
          return result
        } catch (error) {
          console.log(`${label} threw (${Date.now() - start}ms)`, error)
          throw error
        }
      }
    },
  })
}

async function applyMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  const row = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version')
  const version = row?.user_version ?? 0

  for (let i = version; i < migrations.length; i++) {
    await database.execAsync(migrations[i])
    // Integer interpolation is safe — i is always a loop-controlled number.
    await database.execAsync(`PRAGMA user_version = ${i + 1}`)
  }
}

export async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db
  if (!dbPromise) {
    dbPromise = (async () => {
      const connectionId = Math.random().toString(36).slice(2, 8)
      trace('[db] opening connection', { connectionId })
      const raw = await SQLite.openDatabaseAsync('still.db')
      // WAL lets reads/writes run concurrently instead of blocking; busy_timeout retries a
      // lock wait instead of immediately throwing SQLITE_BUSY.
      await raw.execAsync('PRAGMA journal_mode = WAL')
      await raw.execAsync('PRAGMA busy_timeout = 3000')
      await applyMigrations(raw)
      const serialized = withSerialization(raw, connectionId)
      db = __DEV__ ? withTracing(serialized) : serialized
      trace('[db] connection ready', { connectionId })
      return db
    })()
  }
  return dbPromise
}
