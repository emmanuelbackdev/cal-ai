import { Stack } from 'expo-router';

import { useSyncOnboardingDraft } from '@/hooks/use-me';

// Signed-in area. Becomes the Home / Progress / Profile tab bar once those screens exist.
export default function TabsLayout() {
  useSyncOnboardingDraft();
  return <Stack screenOptions={{ headerShown: false }} />;
}
