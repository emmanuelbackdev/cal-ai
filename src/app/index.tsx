import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function ArrowRight() {
  return (
    <View className="h-3 w-[19px] justify-center">
      <View className="h-[1.5px] w-full rounded-full bg-white" />
      <View className="absolute right-0 top-[5.25px] h-[1.5px] w-2 origin-right rotate-45 rounded-full bg-white" />
      <View className="absolute right-0 top-[5.25px] h-[1.5px] w-2 origin-right -rotate-45 rounded-full bg-white" />
    </View>
  );
}

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-[#FDFDFD] px-5"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View className="mt-[17.4px] flex-row items-center justify-center">
        <Image source={require('@/assets/images/welcome-logo.png')} style={{ width: 50.7, height: 49.6 }} />
        <Text className="ml-[9px] text-[32.4px] font-bold tracking-tight text-black">Bulky AI</Text>
      </View>

      {/* Shrinks on shorter screens so the copy below always fits. */}
      <Image
        source={require('@/assets/images/welcome-phone.png')}
        contentFit="contain"
        accessibilityLabel="Bulky AI scanning a plate of chicken, rice and broccoli"
        style={{ alignSelf: 'center', marginTop: 15.8, height: 469, aspectRatio: 425 / 795, flexShrink: 1 }}
      />

      <View className="flex-1" />

      <Text className="text-center text-[33px] font-semibold leading-[36px] text-black">
        Calorie tracking{'\n'}made easy
      </Text>
      <Text className="mt-[9px] text-center text-[14.6px] leading-[18.5px] text-[#333]">
        Scan meals, track calories and build{'\n'}healthy habits with AI.
      </Text>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/onboarding/sex')}
        className="mt-[18px] h-[47px] flex-row items-center justify-center rounded-full bg-black active:opacity-80">
        <Text className="text-base font-medium text-white">Get Started</Text>
        <View className="absolute right-6">
          <ArrowRight />
        </View>
      </Pressable>

      <Text className="mt-[15px] text-center text-[13.8px] leading-[16px] text-[#333]">
        Already have an account? <Text className="font-bold text-black">Sign In</Text>
      </Text>
    </View>
  );
}
