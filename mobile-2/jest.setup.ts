jest.mock('expo-secure-store', () => {
  const mockSecureStore = new Map<string, string>();

  return {
    deleteItemAsync: jest.fn(async (key: string) => {
      mockSecureStore.delete(key);
    }),
    getItemAsync: jest.fn(async (key: string) => mockSecureStore.get(key) ?? null),
    isAvailableAsync: jest.fn(async () => true),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      mockSecureStore.set(key, value);
    }),
  };
});

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(async () => ({
    details: null,
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  })),
}));
