import { render, screen } from '@testing-library/react-native'
import { DateOverlay } from '../DateOverlay'

const ACCESSIBILITY_LABEL = 'Monday, 8 June 2026'

describe('DateOverlay', () => {
  it('shows the provided label', async () => {
    await render(
      <DateOverlay
        label={'8\nMon'}
        accessibilityLabel={ACCESSIBILITY_LABEL}
        accentColor="#4A90E2"
        visible
      />,
    )
    expect(screen.getByText('8\nMon')).toBeTruthy()
  })

  it("colours the label with the day's accent colour when available", async () => {
    await render(
      <DateOverlay
        label={'8\nMon'}
        accessibilityLabel={ACCESSIBILITY_LABEL}
        accentColor="#4A90E2"
        visible
      />,
    )
    const style = screen.getByText('8\nMon').props.style
    expect(style).toEqual(expect.arrayContaining([expect.objectContaining({ color: '#4A90E2' })]))
  })

  it('falls back to white when the day has no accent colour', async () => {
    await render(
      <DateOverlay
        label={'8\nMon'}
        accessibilityLabel={ACCESSIBILITY_LABEL}
        accentColor={null}
        visible
      />,
    )
    const style = screen.getByText('8\nMon').props.style
    expect(style).toEqual(expect.arrayContaining([expect.objectContaining({ color: '#FFFFFF' })]))
  })

  it('exposes a full, spoken-friendly date to screen readers instead of the raw two-line label', async () => {
    await render(
      <DateOverlay
        label={'8\nMon'}
        accessibilityLabel={ACCESSIBILITY_LABEL}
        accentColor="#4A90E2"
        visible
      />,
    )
    expect(screen.getByLabelText(ACCESSIBILITY_LABEL)).toBeTruthy()
  })
})
