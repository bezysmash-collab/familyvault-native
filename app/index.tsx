import { Redirect } from 'expo-router'

// The root layout handles all auth-based routing.
// This file is just a redirect target so Expo Router has a valid index route.
export default function Index() {
  return <Redirect href="/(tabs)/feed" />
}
