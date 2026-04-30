import React from 'react'
import { Image as RNImage } from 'react-native'

// Forward all props (including cachePolicy) so tests can assert on them
export const Image: React.FC<any> = (props) => <RNImage {...props} />
