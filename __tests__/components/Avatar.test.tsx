import React from 'react'
import { render } from '@testing-library/react-native'
import Avatar from '../../components/shared/Avatar'

const profile = { initials: 'AB', color: '#3b82f6', name: 'Alice Brown' }

describe('Avatar', () => {
  // RN-T06
  it('renders the profile initials as text', () => {
    const { getByText } = render(<Avatar profile={profile} />)
    expect(getByText('AB')).toBeTruthy()
  })

  // RN-T07
  it('applies the profile color as backgroundColor', () => {
    const { getByTestId } = render(<Avatar profile={profile} size={40} />)
    const view = getByTestId('avatar-container')
    expect(view.props.style).toMatchObject({ backgroundColor: '#3b82f6' })
  })

  // RN-T08
  it('renders a plain View with no text when profile is null', () => {
    const { queryByText, UNSAFE_getAllByType } = render(<Avatar profile={null} />)
    const { View } = require('react-native')
    expect(UNSAFE_getAllByType(View).length).toBeGreaterThan(0)
    expect(queryByText(/.+/)).toBeNull()
  })

  // RN-T09
  it('uses the size prop for width, height, and borderRadius', () => {
    const { getByTestId } = render(<Avatar profile={profile} size={56} />)
    const view = getByTestId('avatar-container')
    expect(view.props.style).toMatchObject({ width: 56, height: 56, borderRadius: 28 })
  })
})
