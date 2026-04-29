import React from 'react'
import { View } from 'react-native'

export const VideoView: React.FC<any> = (props) => <View {...props} />
export const useVideoPlayer = jest.fn(() => ({ loop: false }))
