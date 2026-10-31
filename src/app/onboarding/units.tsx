import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { View } from 'react-native';

import { OnboardingScreen } from '@/components/onboarding/onboarding-screen';
import { OptionCard } from '@/components/onboarding/option-card';
import { useOnboardingStep } from '@/hooks/use-onboarding-step';
import type { UnitSystem } from '@/shared/units';
import { useOnboarding } from '@/stores/onboarding';

const OPTIONS: {
  value: UnitSystem;
  label: string;
  description: string;
  icon: 'weight-kilogram' | 'weight-pound';
}[] = [
  { value: 'metric', label: 'Metric', description: 'Kilograms and centimeters', icon: 'weight-kilogram' },
  { value: 'imperial', label: 'Imperial', description: 'Pounds, feet and inches', icon: 'weight-pound' },
];

export default function UnitsStep() {
  const { progress, next } = useOnboardingStep('units');
  const unitSystem = useOnboarding((s) => s.unitSystem);
  const set = useOnboarding((s) => s.set);

  return (
    <OnboardingScreen
      progress={progress}
      title={"Which units do\nyou prefer?"}
      subtitle="You can change this anytime in your profile."
      onNext={next}>
      <View className="mt-10 gap-4">
        {OPTIONS.map((o) => (
          <OptionCard
            key={o.value}
            large
            icon={<MaterialCommunityIcons name={o.icon} size={36} color="#111" />}
            title={o.label}
            subtitle={o.description}
            selected={unitSystem === o.value}
            onPress={() => set({ unitSystem: o.value })}
          />
        ))}
      </View>
    </OnboardingScreen>
  );
}
