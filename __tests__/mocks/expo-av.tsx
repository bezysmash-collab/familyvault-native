import React from 'react'
import { View } from 'react-native'

export const Video: React.FC<any> = (props) => <View {...props} />
export const Audio = { Sound: { createAsync: jest.fn() } }
export const ResizeMode = { CONTAIN: 'contain', COVER: 'cover' }
