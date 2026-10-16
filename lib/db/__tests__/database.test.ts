import { migrations } from '../migrations'

const mockExecAsync = jest.fn().mockResolvedValue(undefined)
const mockGetFirstAsync = jest.fn().mockResolvedValue({ user_version: 999 })
const mockGetAllAsync = jest.fn().mockResolvedValue([])

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn().mockResolvedValue({
    execAsync: mockExecAsync,
    getFirstAsync: mockGetFirstAsync,
    getAllAsync: mockGetAllAsync,
  }),
}))

// __DEV__ is a global const to TypeScript, so reaching it as a property needs a cast.
const globalWithDev = globalThis as unknown as { __DEV__: boolean }
const originalDev = globalWithDev.__DEV__

describe('openDatabase', () => {
  beforeEach(() => {
    jest.resetModules()
    mockExecAsync.mockClear()
    mockGetFirstAsync.mockClear()
    mockGetAllAsync.mockReset().mockResolvedValue([])
  })

  afterEach(() => {
    globalWithDev.__DEV__ = originalDev
  })

  it('enables WAL mode and a busy timeout before applying migrations', async () => {
    const { openDatabase } = require('../database')
    await openDatabase()

    const calls = mockExecAsync.mock.calls.map((call) => call[0])
    expect(calls).toContain('PRAGMA journal_mode = WAL')
    expect(calls).toContain('PRAGMA busy_timeout = 3000')

    const walIndex = calls.indexOf('PRAGMA journal_mode = WAL')
    const versionCallIndex = mockGetFirstAsync.mock.invocationCallOrder[0]
    const walCallIndex = mockExecAsync.mock.invocationCallOrder[walIndex]
    expect(walCallIndex).toBeLessThan(versionCallIndex)
  })

  it('opens the connection only once when called concurrently before it resolves', async () => {
    const { openDatabase } = require('../database')
    const { openDatabaseAsync } = require('expo-sqlite')

    const [first, second] = await Promise.all([openDatabase(), openDatabase()])

    expect(openDatabaseAsync).toHaveBeenCalledTimes(1)
    expect(first).toBe(second)
  })

  it('reuses the same connection on subsequent calls instead of reopening', async () => {
    const { openDatabase } = require('../database')
    await openDatabase()
    await openDatabase()

    const walCalls = mockExecAsync.mock.calls.filter(
      (call) => call[0] === 'PRAGMA journal_mode = WAL',
    )
    expect(walCalls).toHaveLength(1)
  })

  it.each([
    ['development', true],
    ['a release build', false],
  ])('serializes concurrent calls instead of letting them overlap in %s', async (_name, isDev) => {
    globalWithDev.__DEV__ = isDev
    const order: string[] = []
    let resolveFirst!: () => void

    mockGetAllAsync
      .mockImplementationOnce(() => {
        order.push('first-start')
        return new Promise((resolve) => {
          resolveFirst = () => {
            order.push('first-end')
            resolve([])
          }
        })
      })
      .mockImplementationOnce(() => {
        order.push('second-start')
        return Promise.resolve([])
      })

    const { openDatabase } = require('../database')
    const database = await openDatabase()

    const firstCall = database.getAllAsync('select 1')
    const secondCall = database.getAllAsync('select 2')

    await Promise.resolve()
    await Promise.resolve()
    expect(order).toEqual(['first-start'])

    resolveFirst()
    await firstCall
    await secondCall

    expect(order).toEqual(['first-start', 'first-end', 'second-start'])
  })

  it('failing query rejects for its caller, later query still resolves', async () => {
    mockGetAllAsync.mockRejectedValueOnce(new Error('SQLITE_BUSY'))
    mockGetAllAsync.mockResolvedValueOnce([{ id: 2 }])

    const { openDatabase } = require('../database')
    const database = await openDatabase()

    const firstCall = database.getAllAsync('select 1')
    const secondCall = database.getAllAsync('select 2')

    await expect(firstCall).rejects.toThrow('SQLITE_BUSY')
    await expect(secondCall).resolves.toEqual([{ id: 2 }])
  })

  it('treats a database with no version as new and applies every migration', async () => {
    mockGetFirstAsync.mockResolvedValueOnce(null)

    const { openDatabase } = require('../database')
    await openDatabase()

    const expected = migrations.flatMap((sql, i) => [sql, `PRAGMA user_version = ${i + 1}`])
    const calls = mockExecAsync.mock.calls.map((call) => call[0])

    expect(calls.slice(-expected.length)).toEqual(expected)
  })
})
