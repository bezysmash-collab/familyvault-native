import React from 'react'
import { Alert } from 'react-native'
import { render, fireEvent, act } from '@testing-library/react-native'
import * as SecureStore from 'expo-secure-store'

jest.mock('../../hooks/useVault', () => ({
  useVault: () => ({
    items: [], loading: false,
    createItem: jest.fn(), deleteItem: jest.fn(), getDownloadUrl: jest.fn(),
    refresh: jest.fn(),
  }),
}))

jest.mock('../../hooks/useContentHeight', () => ({
  useContentHeight: () => 700,
}))

jest.mock('expo-file-system', () => ({
  cacheDirectory: 'file:///cache/',
  downloadAsync:  jest.fn().mockResolvedValue({ uri: 'file:///cache/file.pdf' }),
}))

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync:       jest.fn(),
}))

import VaultScreen from '../../app/(tabs)/vault/index'

const VAULT_PIN_KEY = 'vault_pin'

beforeEach(() => {
  jest.clearAllMocks()
  ;(SecureStore.getItemAsync  as jest.Mock).mockResolvedValue(null)
  ;(SecureStore.setItemAsync  as jest.Mock).mockResolvedValue(undefined)
  ;(SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined)
})

describe('Vault PIN — security', () => {
  // SEC-T23: PIN shorter than 4 digits is rejected
  it('rejects a PIN shorter than 4 digits with a "PIN too short" alert', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert')
    const { getByPlaceholderText, getByText } = render(<VaultScreen />)
    fireEvent.changeText(getByPlaceholderText('Enter PIN'), '123')
    await act(async () => { fireEvent.press(getByText('Unlock')) })
    expect(alertSpy).toHaveBeenCalledWith('PIN too short', expect.any(String))
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled()
  })

  // SEC-T24: PIN of exactly 4 digits is accepted on first setup
  it('stores a 4-digit PIN and unlocks the vault on first setup', async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(<VaultScreen />)
    fireEvent.changeText(getByPlaceholderText('Enter PIN'), '1234')
    await act(async () => { fireEvent.press(getByText('Unlock')) })
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(VAULT_PIN_KEY, '1234')
    expect(queryByText('Unlock')).toBeNull()
  })

  // SEC-T25: wrong PIN shows remaining attempts count
  it('shows remaining attempt count after one wrong PIN', async () => {
    ;(SecureStore.getItemAsync as jest.Mock).mockResolvedValue('9999')
    const alertSpy = jest.spyOn(Alert, 'alert')
    const { getByPlaceholderText, getByText } = render(<VaultScreen />)
    fireEvent.changeText(getByPlaceholderText('Enter PIN'), '1234')
    await act(async () => { fireEvent.press(getByText('Unlock')) })
    expect(alertSpy).toHaveBeenCalledWith('Wrong PIN', expect.stringContaining('4 attempts remaining'))
  })

  // SEC-T26: 5 consecutive wrong PINs trigger the lockout
  it('locks the vault for 60 seconds after 5 consecutive wrong PINs', async () => {
    ;(SecureStore.getItemAsync as jest.Mock).mockResolvedValue('9999')
    const alertSpy = jest.spyOn(Alert, 'alert')
    const { getByPlaceholderText, getByText } = render(<VaultScreen />)

    for (let i = 0; i < 5; i++) {
      fireEvent.changeText(getByPlaceholderText('Enter PIN'), '1234')
      await act(async () => { fireEvent.press(getByText('Unlock')) })
    }

    expect(alertSpy).toHaveBeenLastCalledWith(
      'Too many attempts',
      expect.stringContaining('60 seconds'),
    )
  })

  // SEC-T27: lockout alert fires on attempt after 5 failures (not a 6th check)
  it('subsequent unlock attempt during lockout shows "too many attempts" immediately', async () => {
    ;(SecureStore.getItemAsync as jest.Mock).mockResolvedValue('9999')
    const alertSpy = jest.spyOn(Alert, 'alert')
    const { getByPlaceholderText, getByText } = render(<VaultScreen />)

    // Trigger lockout
    for (let i = 0; i < 5; i++) {
      fireEvent.changeText(getByPlaceholderText('Enter PIN'), '1234')
      await act(async () => { fireEvent.press(getByText('Unlock')) })
    }
    alertSpy.mockClear()

    // Try again immediately — should hit the lockedUntil guard
    fireEvent.changeText(getByPlaceholderText('Enter PIN'), '9999')
    await act(async () => { fireEvent.press(getByText('Unlock')) })
    expect(alertSpy).toHaveBeenCalledWith('Too many attempts', expect.stringContaining('seconds'))
    // Correct PIN during lockout must NOT unlock vault
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled()
  })

  // SEC-T28: correct PIN after failures resets attempt counter and unlocks
  it('correct PIN after some failures unlocks vault and resets attempt counter', async () => {
    ;(SecureStore.getItemAsync as jest.Mock).mockResolvedValue('1234')
    const { getByPlaceholderText, getByText, queryByText } = render(<VaultScreen />)

    // Two wrong attempts
    for (let i = 0; i < 2; i++) {
      fireEvent.changeText(getByPlaceholderText('Enter PIN'), '0000')
      await act(async () => { fireEvent.press(getByText('Unlock')) })
    }

    // Correct PIN
    fireEvent.changeText(getByPlaceholderText('Enter PIN'), '1234')
    await act(async () => { fireEvent.press(getByText('Unlock')) })

    // Unlock screen should be gone
    expect(queryByText('Unlock')).toBeNull()
  })
})
