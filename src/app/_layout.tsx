import '../../global.css';

import { ClerkProvider, useAuth } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { useOnboardingGate, useSyncOnboardingDraft } from '@/hooks/use-me';

SplashScreen.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

if (!publishableKey) {
  throw new Error('Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to .env.local');
}

const queryClient = new QueryClient();

// Light theme only in v1 (plan.md). Matching the screens' background also stops white flashes between native tabs.
const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: '#FDFDFD' } };

function RootNavigator() {
  const { isLoaded, isSignedIn } = useAuth();
  const { needsOnboarding } = useOnboardingGate();
  useSyncOnboardingDraft();

  // Never show one account's cached data to the next one.
  useEffect(() => {
    if (isLoaded && !isSignedIn) queryClient.clear();
  }, [isLoaded, isSignedIn]);

  // Keep the native splash up while Clerk restores the session from the token cache,
  // so signed-in users never see the welcome screen flash.
  useEffect(() => {
    if (isLoaded) SplashScreen.hideAsync();
  }, [isLoaded]);

  if (!isLoaded) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Unguarded so "/" always resolves; it routes signed-in users to onboarding or home. */}
      <Stack.Screen name="index" />
      {/* Signed-in users without a profile go (back) through onboarding before reaching the app. */}
      <Stack.Protected guard={!isSignedIn || needsOnboarding}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      <Stack.Protected guard={!!isSignedIn && !needsOnboarding}>
        <Stack.Screen name="plan-reveal" />
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={theme}>
          <RootNavigator />
        </ThemeProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
