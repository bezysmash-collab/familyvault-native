module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['./jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind)',
  ],
  moduleNameMapper: {
    '^@/(.*)$':               '<rootDir>/$1',
    '^../../lib/supabase$':   '<rootDir>/lib/__mocks__/supabase.ts',
    '^../lib/supabase$':      '<rootDir>/lib/__mocks__/supabase.ts',
    '^./lib/supabase$':       '<rootDir>/lib/__mocks__/supabase.ts',
    '^expo-image$':           '<rootDir>/__tests__/mocks/expo-image.tsx',
    '^expo-video$':           '<rootDir>/__tests__/mocks/expo-video.tsx',
    '\\.(svg|png|jpg|jpeg|gif|webp)$': '<rootDir>/__tests__/mocks/asset.ts',
  },
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
  collectCoverageFrom: [
    'hooks/**/*.ts',
    'lib/**/*.ts',
    'components/**/*.tsx',
    '!lib/__mocks__/**',
  ],
}
