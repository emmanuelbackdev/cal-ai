import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { View } from 'react-native';

import { OnboardingScreen } from '@/components/onboarding/onboarding-screen';
import { OptionCard } from '@/components/onboarding/option-card';
import { useOnboardingStep } from '@/hooks/use-onboarding-step';
import type { Goal } from '@/shared/nutrition';
import { useOnboarding } from '@/stores/onboarding';

const OPTIONS: {
  value: Goal;
  label: string;
  description: string;
  icon: 'trending-down' | 'scale-balance' | 'trending-up';
}[] = [
  { value: 'lose', label: 'Lose weight', description: 'Burn fat and get leaner', icon: 'trending-down' },
  { value: 'maintain', label: 'Maintain weight', description: 'Stay where you are and eat balanced', icon: 'scale-balance' },
  { value: 'gain', label: 'Gain weight', description: 'Build size and increase weight', icon: 'trending-up' },
];

export default function GoalStep() {
  const { progress, next } = useOnboardingStep('goal');
  const goal = useOnboarding((s) => s.goal);
  const set = useOnboarding((s) => s.set);

  return (
    <OnboardingScreen
      progress={progress}
      title={"What’s your\nmain goal?"}
      subtitle="We'll build your plan around this."
      onNext={next}
      nextDisabled={!goal}>
      <View className="mt-6 gap-2.5">
        {OPTIONS.map((o) => (
          <OptionCard
            key={o.value}
            icon={<MaterialCommunityIcons name={o.icon} size={26} color="#111" />}
            title={o.label}
            subtitle={o.description}
            selected={goal === o.value}
            // A new goal direction invalidates the previous target weight.
            onPress={() => set({ goal: o.value, ...(goal !== o.value && { targetWeightKg: null }) })}
          />
        ))}
      </View>
    </OnboardingScreen>
  );
}
