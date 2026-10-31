import { Stack } from 'expo-router';

// Signed-in area. Becomes the Home / Progress / Profile tab bar once those screens exist.
export default function TabsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
