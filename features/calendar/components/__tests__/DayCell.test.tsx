import { fireEvent, render, screen } from '@testing-library/react-native'
import { CalendarDayData } from '../../types'
import { DayCell } from '../DayCell'

const noop = () => {}
const SIZE = 44

function makeCell(overrides: Partial<CalendarDayData> = {}): CalendarDayData {
  return {
    date: '2026-07-14',
    dayNumber: 14,
    accentColor: null,
    hasPhoto: false,
    isToday: false,
    isFuture: false,
    ...overrides,
  }
}

describe('DayCell', () => {
  it('renders the day number', async () => {
    await render(<DayCell cell={makeCell()} size={SIZE} onPress={noop} onLongPress={noop} />)
    expect(screen.getByText('14')).toBeTruthy()
  })

  it('shows an accent dot when the day has a photo', async () => {
    await render(
      <DayCell
        cell={makeCell({ hasPhoto: true, accentColor: '#4A90E2' })}
        size={SIZE}
        onPress={noop}
        onLongPress={noop}
      />,
    )
    expect(screen.getByTestId('photo-dot')).toBeTruthy()
  })

  it('does not show a dot when the day has no photo', async () => {
    await render(<DayCell cell={makeCell()} size={SIZE} onPress={noop} onLongPress={noop} />)
    expect(screen.queryByTestId('photo-dot')).toBeNull()
  })

  it('calls onPress with the date when a photo day is pressed', async () => {
    const onPress = jest.fn()
    await render(
      <DayCell
        cell={makeCell({ hasPhoto: true, accentColor: '#4A90E2' })}
        size={SIZE}
        onPress={onPress}
        onLongPress={noop}
      />,
    )
    await fireEvent.press(screen.getByRole('button'))
    expect(onPress).toHaveBeenCalledWith('2026-07-14')
  })

  it('calls onLongPress with the date when a photo day is long-pressed', async () => {
    const onLongPress = jest.fn()
    await render(
      <DayCell
        cell={makeCell({ hasPhoto: true, accentColor: '#4A90E2' })}
        size={SIZE}
        onPress={noop}
        onLongPress={onLongPress}
      />,
    )
    await fireEvent(screen.getByRole('button'), 'longPress')
    expect(onLongPress).toHaveBeenCalledWith('2026-07-14')
  })

  it('is pressable when the day has no photo but is not in the future', async () => {
    const onPress = jest.fn()
    await render(<DayCell cell={makeCell()} size={SIZE} onPress={onPress} onLongPress={noop} />)
    await fireEvent.press(screen.getByRole('button'))
    expect(onPress).toHaveBeenCalledWith('2026-07-14')
  })

  it('renders future days with reduced visual emphasis', async () => {
    const { getByText } = await render(
      <DayCell cell={makeCell({ isFuture: true })} size={SIZE} onPress={noop} onLongPress={noop} />,
    )
    // Future days are not interactive — no button role
    expect(screen.queryByRole('button')).toBeNull()
    // Day number is still rendered
    expect(getByText('14')).toBeTruthy()
  })

  it('renders nothing for an empty leading cell', async () => {
    await render(
      <DayCell
        cell={{
          date: null,
          dayNumber: 0,
          accentColor: null,
          hasPhoto: false,
          isToday: false,
          isFuture: false,
        }}
        size={SIZE}
        onPress={noop}
        onLongPress={noop}
      />,
    )
    expect(screen.queryByText(/\d+/)).toBeNull()
    expect(screen.queryByTestId('photo-dot')).toBeNull()
  })
})
