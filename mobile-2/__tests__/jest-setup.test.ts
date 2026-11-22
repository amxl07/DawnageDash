import * as SecureStore from 'expo-secure-store';

describe('Jest harness', () => {
  it('keeps SecureStore values isolated by key', async () => {
    await SecureStore.setItemAsync('session-token', 'token-123');
    await SecureStore.setItemAsync('server-url', 'https://fitness.example');

    await SecureStore.deleteItemAsync('session-token');

    await expect(SecureStore.getItemAsync('session-token')).resolves.toBeNull();
    await expect(SecureStore.getItemAsync('server-url')).resolves.toBe(
      'https://fitness.example',
    );
  });
});
