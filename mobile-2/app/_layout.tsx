import { Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppProviders } from '@/query/query-provider';
import {
  createNavigationTheme,
  ThemeProvider,
  useTheme,
} from '@/theme/theme';

function RootNavigator() {
  const { colors, isDark } = useTheme();
  return (
    <NavigationThemeProvider value={createNavigationTheme(colors, isDark)}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ animation: 'default' }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="connect" options={{ title: 'Connect a server' }} />
        <Stack.Screen name="sign-in" options={{ title: 'Sign in' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppProviders>
        <RootNavigator />
      </AppProviders>
    </ThemeProvider>
  );
}
