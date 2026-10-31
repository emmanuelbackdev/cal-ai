import { useAuth } from '@clerk/expo';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

/**
 * Target of the OAuth redirect (`calai://sso-callback`). On Android the deep link can also reach
 * Expo Router while `useSSO` finishes the sign-in, so this holds a spinner until the session is active.
 */
export default function SSOCallback() {
  const { isSignedIn } = useAuth();
  if (isSignedIn) return <Redirect href="/home" />;
  return (
    <View className="flex-1 items-center justify-center bg-[#FDFDFD]">
      <ActivityIndicator color="#111" />
    </View>
  );
}
