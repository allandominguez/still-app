import { fireEvent, render } from '@testing-library/react-native'
import { PhotoPreview } from '../PhotoPreview'

const baseProps = {
  uri: 'file://photo.jpg',
  isSaving: false,
  onConfirm: jest.fn(),
  onCancel: jest.fn(),
}

beforeEach(() => jest.clearAllMocks())

describe('PhotoPreview', () => {
  it('shows the photo and action buttons when a URI is provided', async () => {
    const { getByLabelText } = await render(<PhotoPreview {...baseProps} />)

    expect(getByLabelText('Selected photo preview')).toBeTruthy()
    expect(getByLabelText('Use photo')).toBeTruthy()
    expect(getByLabelText('Back')).toBeTruthy()
  })

  it('is not visible when uri is null', async () => {
    const { queryByLabelText } = await render(<PhotoPreview {...baseProps} uri={null} />)

    expect(queryByLabelText('Use photo')).toBeNull()
  })

  it('calls onConfirm when Use photo is pressed', async () => {
    const onConfirm = jest.fn()
    const { getByLabelText } = await render(<PhotoPreview {...baseProps} onConfirm={onConfirm} />)

    await fireEvent.press(getByLabelText('Use photo'))

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when Back is pressed', async () => {
    const onCancel = jest.fn()
    const { getByLabelText } = await render(<PhotoPreview {...baseProps} onCancel={onCancel} />)

    await fireEvent.press(getByLabelText('Back'))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('shows Saving… and disables buttons while saving', async () => {
    const onConfirm = jest.fn()
    const onCancel = jest.fn()
    const { getByLabelText } = await render(
      <PhotoPreview {...baseProps} isSaving={true} onConfirm={onConfirm} onCancel={onCancel} />,
    )

    await fireEvent.press(getByLabelText('Use photo'))
    await fireEvent.press(getByLabelText('Back'))

    expect(onConfirm).not.toHaveBeenCalled()
    expect(onCancel).not.toHaveBeenCalled()
  })
})
