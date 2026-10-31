import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { Redirect, router } from 'expo-router';
import { Text, View } from 'react-native';

import { OnboardingScreen } from '@/components/onboarding/onboarding-screen';
import { calculateBaselineTargets } from '@/shared/nutrition';
import { toProfileInput, useOnboarding } from '@/stores/onboarding';

// Decorative confetti around the avatar: offset from the avatar's center, in points.
const CONFETTI = [
  { x: -107, y: -95, color: '#B6A6EE', rotate: 30 },
  { x: -50, y: -92, color: '#9BD3E0', rotate: -20 },
  { x: 49, y: -91, color: '#F5BC93', rotate: 45 },
  { x: 140, y: -88, color: '#9ED9AE', rotate: 60 },
  { x: -153, y: -68, color: '#9ED9AE', rotate: -35 },
  { x: 95, y: -70, color: '#F5C46E', rotate: 20 },
  { x: -114, y: -51, color: '#F4A08C', rotate: 70 },
  { x: 120, y: -38, color: '#E3CBA8', rotate: -15 },
  { x: -153, y: -18, color: '#F5C84E', rotate: 15 },
  { x: 160, y: -23, color: '#E98AA6', rotate: -50 },
  { x: -120, y: 12, color: '#F2C2B4', rotate: 40 },
  { x: 120, y: 7, color: '#EBB2C4', rotate: -25 },
  { x: -160, y: 31, color: '#9FDBD8', rotate: 10 },
  { x: 157, y: 34, color: '#9CC8F0', rotate: 35 },
  { x: -120, y: 57, color: '#F0A5BE', rotate: -40 },
  { x: 116, y: 55, color: '#F5BC6E', rotate: 25 },
];

const withCommas = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

function Macro({ icon, grams, label }: { icon: React.ReactNode; grams: number; label: string }) {
  return (
    <View className="flex-1 items-center">
      <View className="h-7 items-center justify-center">{icon}</View>
      <Text className="mt-3 text-[17px] font-semibold text-[#111]">{grams}g</Text>
      <Text className="mt-1 text-[13px] text-[#555]">{label}</Text>
    </View>
  );
}

export default function ResultStep() {
  const draft = useOnboarding();
  const profile = toProfileInput(draft);
  if (!profile) return <Redirect href="/onboarding/sex" />;

  const targets = calculateBaselineTargets(profile);

  return (
    <OnboardingScreen buttonLabel="Continue" onNext={() => router.push('/onboarding/plan')}>
      <View className="mt-2 h-[170px] items-center justify-center">
        {CONFETTI.map((c, i) => (
          <View
            key={i}
            className="absolute h-[9px] w-[6px] rounded-[2px]"
            style={{ backgroundColor: c.color, transform: [{ translateX: c.x }, { translateY: c.y }, { rotate: `${c.rotate}deg` }] }}
          />
        ))}
        <View className="h-[150px] w-[150px] items-center justify-center rounded-full border border-[#F0F0F0] bg-white shadow-sm">
          <Image source={require('@/assets/images/welcome-logo.png')} style={{ width: 98, height: 96 }} />
        </View>
      </View>

      <Text className="mt-5 text-center text-2xl font-bold tracking-tight text-[#111]">
        Your daily calorie target
      </Text>
      <Text className="mx-4 mt-2 text-center text-[15px] leading-[22px] text-[#555]">
        {profile.goal === 'maintain'
          ? 'Based on your info, here’s your personalized target to maintain your weight.'
          : 'Based on your info, here’s your personalized target to reach your goal.'}
      </Text>

      <Text className="mt-6 text-center text-[52px] font-semibold tracking-tight text-[#111]">
        {withCommas(targets.calories)}
      </Text>
      <Text className="text-center text-[17px] text-[#555]">Calories / day</Text>

      <View className="mt-8 flex-row rounded-2xl border border-[#EDEDED] bg-white py-5">
        <Macro icon={<MaterialCommunityIcons name="food-drumstick" size={26} color="#E5534B" />} grams={targets.proteinG} label="Protein" />
        <Macro icon={<MaterialCommunityIcons name="barley" size={26} color="#E3A72F" />} grams={targets.carbsG} label="Carbs" />
        <Macro icon={<Ionicons name="water" size={26} color="#EEC12E" />} grams={targets.fatG} label="Fat" />
      </View>

      <View className="mt-6 rounded-2xl bg-[#F1EFFB] p-4">
        <View className="flex-row items-center">
          <View className="h-[22px] w-[22px] items-center justify-center rounded-full bg-[#DCD5F6]">
            <Ionicons name="star" size={11} color="#2E2366" />
          </View>
          <Text className="ml-3 text-[15px] font-semibold text-[#111]">This is just the beginning!</Text>
        </View>
        <Text className="ml-[34px] mt-1.5 text-sm leading-5 text-[#555]">
          Create your free account next to save your plan and start scanning meals.
        </Text>
      </View>
    </OnboardingScreen>
  );
}
