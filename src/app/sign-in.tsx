import { useSSO } from '@clerk/expo';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Provider = 'oauth_apple' | 'oauth_google';

const COPY = {
  save: {
    title: 'Save your plan',
    subtitle: 'Create your free account to keep your\nplan and start scanning meals.',
  },
  signin: {
    title: 'Welcome back',
    subtitle: 'Sign in to pick up right where\nyou left off.',
  },
};

function SocialButton({
  provider,
  label,
  pending,
  disabled,
  onPress,
}: {
  provider: Provider;
  label: string;
  pending: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const dark = provider === 'oauth_apple';
  const color = dark ? '#fff' : '#111';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy: pending }}
      disabled={disabled}
      onPress={onPress}
      className={`h-[54px] flex-row items-center justify-center rounded-2xl active:opacity-80 ${
        dark ? 'bg-black' : 'border border-[#E4E4E4] bg-white'
      } ${disabled && !pending ? 'opacity-50' : ''}`}>
      {pending ? (
        <ActivityIndicator color={color} />
      ) : (
        <>
          <View className="absolute left-6">
            <Ionicons name={dark ? 'logo-apple' : 'logo-google'} size={dark ? 22 : 19} color={color} />
          </View>
          <Text className="text-[17px] font-semibold" style={{ color }}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { mode } = useLocalSearchParams<{ mode?: 'signin' }>();
  const copy = COPY[mode === 'signin' ? 'signin' : 'save'];
  const { startSSOFlow } = useSSO();
  const [pending, setPending] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pre-launches the Custom Tab on Android so the provider sheet opens instantly.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void WebBrowser.warmUpAsync();
    return () => void WebBrowser.coolDownAsync();
  }, []);

  async function signInWith(provider: Provider) {
    setPending(provider);
    setError(null);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({ strategy: provider });
      // No session means the user closed the browser sheet — not an error.
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace('/home');
      }
    } catch (err) {
      console.error('SSO sign-in failed', JSON.stringify(err, null, 2));
      setError('Something went wrong. Please try again.');
    } finally {
      setPending(null);
    }
  }

  return (
    <View
      className="flex-1 bg-[#FDFDFD] px-6"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 12 }}>
      <View className="h-14 justify-center">
        {router.canGoBack() ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={12}
            onPress={() => router.back()}
            className="self-start active:opacity-60">
            <Ionicons name="arrow-back" size={24} color="#111" />
          </Pressable>
        ) : null}
      </View>

      <View className="flex-1 items-center justify-center">
        <View className="h-[132px] w-[132px] items-center justify-center rounded-full border border-[#F0F0F0] bg-white shadow-sm">
          <Image source={require('@/assets/images/welcome-logo.png')} style={{ width: 84, height: 82 }} />
        </View>
        <Text className="mt-8 text-center text-[32px] font-bold leading-10 tracking-tight text-[#111]">
          {copy.title}
        </Text>
        <Text className="mt-3 text-center text-base leading-[26px] text-[#444]">{copy.subtitle}</Text>
      </View>

      <View className="gap-3">
        <SocialButton
          provider="oauth_apple"
          label="Continue with Apple"
          pending={pending === 'oauth_apple'}
          disabled={pending !== null}
          onPress={() => signInWith('oauth_apple')}
        />
        <SocialButton
          provider="oauth_google"
          label="Continue with Google"
          pending={pending === 'oauth_google'}
          disabled={pending !== null}
          onPress={() => signInWith('oauth_google')}
        />
      </View>

      {error ? (
        <Text accessibilityRole="alert" className="mt-4 text-center text-sm text-[#D93F3F]">
          {error}
        </Text>
      ) : null}

      <Text className="mt-5 text-center text-[12.5px] leading-[18px] text-[#8A8A8A]">
        By continuing, you agree to our Terms of Service{'\n'}and Privacy Policy.
      </Text>
    </View>
  );
}
