import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Redirect, router } from 'expo-router';
import { Text, View } from 'react-native';

import { OnboardingScreen } from '@/components/onboarding/onboarding-screen';
import { projectedGoalDate } from '@/shared/nutrition';
import { formatWeight } from '@/shared/units';
import { toProfileInput, useOnboarding } from '@/stores/onboarding';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const FEATURES: { icon: IconName; title: string; description: string }[] = [
  { icon: 'bullseye-arrow', title: 'Calorie Tracking', description: 'Track effortlessly and stay on target' },
  { icon: 'line-scan', title: 'AI Food Scanner', description: 'Snap a meal and get instant nutrition' },
  { icon: 'chart-donut', title: 'Macro Targets', description: 'Protein, carbs and fat tailored to you' },
  { icon: 'chart-line', title: 'Progress Tracking', description: 'Log your weight and watch your trend' },
  { icon: 'pencil-outline', title: 'Editable Results', description: 'Fine-tune anything the AI logs' },
];

function formatGoalDate(date: Date) {
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(!sameYear && { year: 'numeric' }) });
}

export default function PlanStep() {
  const draft = useOnboarding();
  const profile = toProfileInput(draft);
  if (!profile) return <Redirect href="/onboarding/sex" />;

  const goalDate = projectedGoalDate(profile);
  const subtitle =
    profile.goal === 'maintain' || !profile.targetWeightKg
      ? `Your personalized plan to help you\nstay at ${formatWeight(profile.weightKg, draft.unitSystem)}.`
      : `Your personalized plan to help you\nreach ${formatWeight(profile.targetWeightKg, draft.unitSystem)}${
          goalDate ? ` by ${formatGoalDate(goalDate)}` : ''
        }.`;

  return (
    <OnboardingScreen
      progress={1}
      title={"Here’s what your\nplan includes"}
      subtitle={subtitle}
      buttonLabel="Continue"
      onNext={() => router.push('/sign-in')}>
      <View className="mt-6 gap-2.5">
        {FEATURES.map((f) => (
          <View
            key={f.title}
            className="min-h-[64px] flex-row items-center rounded-2xl border border-[#EDEDED] bg-white px-5 py-3">
            <View className="w-8 items-center">
              <MaterialCommunityIcons name={f.icon} size={26} color="#111" />
            </View>
            <View className="ml-5 flex-1">
              <Text className="text-base font-semibold text-[#111]">{f.title}</Text>
              <Text className="mt-1 text-sm leading-5 text-[#555]">{f.description}</Text>
            </View>
          </View>
        ))}
      </View>
    </OnboardingScreen>
  );
}
