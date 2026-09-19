import * as Linking from 'expo-linking';

type PasswordResetAuth<T> = {
  resetPasswordForEmail: (
    email: string,
    options: { redirectTo: string },
  ) => Promise<T>;
};

/** Uses Expo's active runtime URL, including Expo Go and variant-specific schemes. */
export function requestPasswordReset<T>(auth: PasswordResetAuth<T>, email: string): Promise<T> {
  return auth.resetPasswordForEmail(email, {
    redirectTo: Linking.createURL('reset-password'),
  });
}
