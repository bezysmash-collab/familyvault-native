import '@testing-library/jest-native/extend-expect'

jest.mock('expo-router', () => ({
  useRouter:            () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  usePathname:          () => '/',
  router:               { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Link:                 'Link',
  Slot:                 'Slot',
  Redirect:             ({ href }: { href: string }) => null,
  Stack:                { Screen: 'Stack.Screen' },
  Tabs:                 { Screen: 'Tabs.Screen' },
}))

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync:                  jest.fn().mockResolvedValue({ status: 'granted' }),
  getDevicePushTokenAsync:                  jest.fn().mockResolvedValue({ data: 'mock-apns-token' }),
  setNotificationHandler:                   jest.fn(),
  addNotificationReceivedListener:          jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener:  jest.fn(() => ({ remove: jest.fn() })),
  setBadgeCountAsync:                       jest.fn(),
}))

jest.mock('expo-secure-store', () => ({
  getItemAsync:    jest.fn(),
  setItemAsync:    jest.fn(),
  deleteItemAsync: jest.fn(),
}))

jest.mock('expo-linking', () => ({
  getInitialURL:  jest.fn().mockResolvedValue(null),
  openURL:        jest.fn(),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  parse:          jest.fn(() => ({ path: null, queryParams: {} })),
}))

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
  MediaTypeOptions:        { Images: 'Images', Videos: 'Videos' },
}))

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn().mockResolvedValue({ canceled: true }),
}))

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native')
  return {
    SafeAreaView:     View,
    SafeAreaProvider: View,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  }
})

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: any) => children,
  PanGestureHandler:      ({ children }: any) => children,
}))

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

// Silence React Native AppState in tests
jest.mock('react-native/Libraries/AppState/AppState', () => ({
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  currentState: 'active',
}))

// Silence the react-native-url-polyfill import in supabase.ts
jest.mock('react-native-url-polyfill/auto', () => {})
