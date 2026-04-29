import { useWindowDimensions } from 'react-native'
import { useHeaderHeight } from '@react-navigation/elements'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'

/**
 * Returns the exact available pixel height for the scrollable content area
 * inside a tab screen (window height minus navigation header minus tab bar).
 * Use this as an explicit `height` on a ScrollView when flex:1 misbehaves.
 */
export function useContentHeight(): number {
  const { height } = useWindowDimensions()
  const headerHeight = useHeaderHeight()
  const tabBarHeight = useBottomTabBarHeight()
  return height - headerHeight - tabBarHeight
}
