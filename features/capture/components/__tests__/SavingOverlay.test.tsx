import { render, screen } from '@testing-library/react-native'
import { SavingOverlay } from '../SavingOverlay'

describe('SavingOverlay', () => {
  it('is announced to screen readers while visible', async () => {
    await render(<SavingOverlay visible />)
    expect(screen.getByLabelText('Saving photo')).toBeTruthy()
  })

  it('renders nothing when not visible', async () => {
    await render(<SavingOverlay visible={false} />)
    expect(screen.queryByLabelText('Saving photo')).toBeNull()
  })
})
