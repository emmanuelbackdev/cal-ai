import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { OnboardingScreen } from '@/components/onboarding/onboarding-screen';
import { OptionCard } from '@/components/onboarding/option-card';
import { useOnboardingStep } from '@/hooks/use-onboarding-step';
import type { Sex } from '@/shared/nutrition';
import { useOnboarding } from '@/stores/onboarding';

const OPTIONS: { value: Sex; label: string; icon: 'male-outline' | 'female-outline' }[] = [
  { value: 'male', label: 'Male', icon: 'male-outline' },
  { value: 'female', label: 'Female', icon: 'female-outline' },
];

export default function SexStep() {
  const { progress, next } = useOnboardingStep('sex');
  const sex = useOnboarding((s) => s.sex);
  const set = useOnboarding((s) => s.set);

  return (
    <OnboardingScreen
      progress={progress}
      title={"Let’s get to know\nyou better"}
      subtitle="This helps us personalize your plan and recommendations."
      onNext={next}
      nextDisabled={!sex}>
      <View className="mt-10 gap-4">
        {OPTIONS.map((o) => (
          <OptionCard
            key={o.value}
            large
            icon={<Ionicons name={o.icon} size={40} color="#111" />}
            title={o.label}
            selected={sex === o.value}
            onPress={() => set({ sex: o.value })}
          />
        ))}
      </View>
    </OnboardingScreen>
  );
}
