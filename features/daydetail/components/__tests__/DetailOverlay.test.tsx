import { fireEvent, render, screen } from '@testing-library/react-native'
import { FontFamily } from '../../../../lib/design'
import { DetailOverlay } from '../DetailOverlay'

const noop = () => {}

async function renderOverlay(overrides: Partial<React.ComponentProps<typeof DetailOverlay>> = {}) {
  return render(
    <DetailOverlay
      visible
      locationName={null}
      noteValue=""
      notePlaceholder="Just type..."
      onNoteChangeText={noop}
      onNoteFocus={noop}
      onNoteBlur={noop}
      onDeletePhoto={noop}
      pageHeight={800}
      {...overrides}
    />,
  )
}

describe('DetailOverlay', () => {
  it('shows the note value when the day has one', async () => {
    await renderOverlay({ noteValue: 'A great day' })
    expect(screen.getByDisplayValue('A great day')).toBeTruthy()
  })

  it('shows the placeholder prompt when the day has no note yet', async () => {
    await renderOverlay({ noteValue: '', notePlaceholder: 'Just type...' })
    expect(screen.getByPlaceholderText('Just type...')).toBeTruthy()
  })

  it('calls onNoteChangeText as the user types', async () => {
    const onNoteChangeText = jest.fn()
    await renderOverlay({ onNoteChangeText })

    await fireEvent.changeText(screen.getByLabelText('Note for this day'), 'A great day')

    expect(onNoteChangeText).toHaveBeenCalledWith('A great day')
  })

  it('calls onNoteFocus and onNoteBlur as editing starts and ends', async () => {
    const onNoteFocus = jest.fn()
    const onNoteBlur = jest.fn()
    await renderOverlay({ onNoteFocus, onNoteBlur })

    const input = screen.getByLabelText('Note for this day')
    await fireEvent(input, 'focus')
    expect(onNoteFocus).toHaveBeenCalled()

    await fireEvent(input, 'blur')
    expect(onNoteBlur).toHaveBeenCalled()
  })

  it('shows the location name when available', async () => {
    await renderOverlay({ locationName: 'Mission District' })
    expect(screen.getByText('Mission District')).toBeTruthy()
  })

  it('does not render a location row when the day has no location', async () => {
    await renderOverlay({ locationName: null })
    expect(screen.queryByText('Mission District')).toBeNull()
  })

  it('centres the location text and sets it in the serif typeface', async () => {
    await renderOverlay({ locationName: 'Mission District' })
    const style = screen.getByText('Mission District').props.style
    expect(style).toEqual(
      expect.objectContaining({ textAlign: 'center', fontFamily: FontFamily.serif }),
    )
  })

  it('sets the note input to the sans typeface', async () => {
    await renderOverlay({ noteValue: 'A great day' })
    const style = screen.getByDisplayValue('A great day').props.style
    expect(style).toEqual(
      expect.arrayContaining([expect.objectContaining({ fontFamily: FontFamily.sans })]),
    )
  })

  it('caps the note at a maximum length', async () => {
    await renderOverlay({ noteValue: 'A great day' })
    expect(screen.getByDisplayValue('A great day').props.maxLength).toBe(8000)
  })

  it("bounds the note's height to its band, proportional to the page height", async () => {
    await renderOverlay({ noteValue: 'A great day', pageHeight: 800 })
    const style = screen.getByDisplayValue('A great day').props.style
    // Band spans 40%-80% of page height (800), so its height is 40% of 800 = 320
    expect(style).toEqual(expect.arrayContaining([expect.objectContaining({ maxHeight: 320 })]))
  })

  it('dims the whole photo while showing', async () => {
    await renderOverlay()
    expect(screen.getByTestId('detail-overlay-dim')).toBeTruthy()
  })

  it('allows touches to reach the note input while visible', async () => {
    await renderOverlay({ visible: true })
    expect(screen.getByTestId('detail-overlay').props.pointerEvents).toBe('auto')
  })

  it('lets touches pass through to the page below once hidden', async () => {
    await renderOverlay({ visible: false })
    expect(screen.getByTestId('detail-overlay').props.pointerEvents).toBe('none')
  })

  it('calls onDeletePhoto when the delete affordance is pressed', async () => {
    const onDeletePhoto = jest.fn()
    await renderOverlay({ onDeletePhoto })

    await fireEvent.press(screen.getByLabelText('Delete photo'))

    expect(onDeletePhoto).toHaveBeenCalledTimes(1)
  })
})
