type StoredValue = string | null;

let secureStoreValue: StoredValue = null;

jest.mock('expo-secure-store', () => ({
  deleteItemAsync: jest.fn(async () => {
    secureStoreValue = null;
  }),
  getItemAsync: jest.fn(async () => secureStoreValue),
  isAvailableAsync: jest.fn(async () => true),
  setItemAsync: jest.fn(async (_key: string, value: string) => {
    secureStoreValue = value;
  }),
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(async () => ({
    details: null,
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  })),
}));
