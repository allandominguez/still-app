import { render, screen } from '@testing-library/react-native'
import { createRef } from 'react'
import { View } from 'react-native'
import { PageBlur } from '../PageBlur'

const blurTarget = createRef<View>()

function currentOpacity(): number {
  return screen.getByTestId('page-blur').props.style.opacity
}

describe('PageBlur', () => {
  it('renders the blur when visible', async () => {
    await render(<PageBlur visible blurTarget={blurTarget} />)
    expect(screen.getByTestId('page-blur')).toBeTruthy()
  })

  it('still renders the blur when not visible, so it never cold-starts on reveal', async () => {
    await render(<PageBlur visible={false} blurTarget={blurTarget} />)
    expect(screen.getByTestId('page-blur')).toBeTruthy()
  })

  it('starts fully opaque when mounted visible', async () => {
    await render(<PageBlur visible blurTarget={blurTarget} />)
    expect(currentOpacity()).toBe(1)
  })

  it('starts fully transparent when mounted hidden', async () => {
    await render(<PageBlur visible={false} blurTarget={blurTarget} />)
    expect(currentOpacity()).toBe(0)
  })
})
