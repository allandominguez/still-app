import { fireEvent, render } from '@testing-library/react-native'
import { PhotoPickerSheet } from '../PhotoPickerSheet'

const baseProps = {
  visible: true,
  allowCamera: true,
  onTakePhoto: jest.fn(),
  onChooseFromGallery: jest.fn(),
  onDismiss: jest.fn(),
}

beforeEach(() => jest.clearAllMocks())

describe('PhotoPickerSheet', () => {
  it('shows both capture options when visible', async () => {
    const { getByLabelText } = await render(<PhotoPickerSheet {...baseProps} />)

    expect(getByLabelText('Take photo')).toBeTruthy()
    expect(getByLabelText('Choose from gallery')).toBeTruthy()
  })

  it('hides Take photo and shows a backfill title when the camera is not allowed', async () => {
    const { getByText, queryByLabelText, getByLabelText } = await render(
      <PhotoPickerSheet {...baseProps} allowCamera={false} />,
    )

    expect(queryByLabelText('Take photo')).toBeNull()
    expect(getByLabelText('Choose from gallery')).toBeTruthy()
    expect(getByText('Add photo for this day')).toBeTruthy()
  })

  it('calls onTakePhoto when Take photo is pressed', async () => {
    const onTakePhoto = jest.fn()
    const { getByLabelText } = await render(
      <PhotoPickerSheet {...baseProps} onTakePhoto={onTakePhoto} />,
    )

    await fireEvent.press(getByLabelText('Take photo'))

    expect(onTakePhoto).toHaveBeenCalledTimes(1)
  })

  it('calls onChooseFromGallery when Choose from gallery is pressed', async () => {
    const onChooseFromGallery = jest.fn()
    const { getByLabelText } = await render(
      <PhotoPickerSheet {...baseProps} onChooseFromGallery={onChooseFromGallery} />,
    )

    await fireEvent.press(getByLabelText('Choose from gallery'))

    expect(onChooseFromGallery).toHaveBeenCalledTimes(1)
  })

  it('calls onDismiss when Cancel is pressed', async () => {
    const onDismiss = jest.fn()
    const { getByLabelText } = await render(
      <PhotoPickerSheet {...baseProps} onDismiss={onDismiss} />,
    )

    await fireEvent.press(getByLabelText('Cancel'))

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('calls onDismiss when the overlay is pressed', async () => {
    const onDismiss = jest.fn()
    const { getByLabelText } = await render(
      <PhotoPickerSheet {...baseProps} onDismiss={onDismiss} />,
    )

    await fireEvent.press(getByLabelText('Dismiss'))

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('does not show options when not visible', async () => {
    const { queryByLabelText } = await render(<PhotoPickerSheet {...baseProps} visible={false} />)

    expect(queryByLabelText('Take photo')).toBeNull()
    expect(queryByLabelText('Choose from gallery')).toBeNull()
  })
})
