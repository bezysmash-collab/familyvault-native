import { Image } from 'expo-image'
import { StyleProp, ImageStyle } from 'react-native'

interface Props {
  width?: number
  style?: StyleProp<ImageStyle>
}

// SVG viewBox is 680×565 — preserve that aspect ratio
const ASPECT = 565 / 680

export default function Logo({ width = 180, style }: Props) {
  return (
    <Image
      source={require('../../assets/logo.svg')}
      style={[{ width, height: Math.round(width * ASPECT) }, style]}
      contentFit="contain"
    />
  )
}
