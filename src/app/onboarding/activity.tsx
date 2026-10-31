import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { OnboardingScreen } from '@/components/onboarding/onboarding-screen';
import { OptionCard } from '@/components/onboarding/option-card';
import { useOnboardingStep } from '@/hooks/use-onboarding-step';
import type { ActivityLevel } from '@/shared/nutrition';
import { useOnboarding } from '@/stores/onboarding';

const ICON = { size: 26, color: '#111' };

const OPTIONS: { value: ActivityLevel; label: string; description: string; icon: ReactNode }[] = [
  { value: 'sedentary', label: 'Sedentary', description: 'Little or no exercise', icon: <MaterialCommunityIcons name="sofa-outline" {...ICON} /> },
  { value: 'light', label: 'Lightly active', description: '1–3 days per week', icon: <MaterialCommunityIcons name="walk" {...ICON} /> },
  { value: 'moderate', label: 'Moderately active', description: '3–5 days per week', icon: <Ionicons name="barbell-outline" {...ICON} /> },
  { value: 'active', label: 'Very active', description: '6–7 days per week', icon: <MaterialCommunityIcons name="run-fast" {...ICON} /> },
  { value: 'very_active', label: 'Extra active', description: 'Very intense daily activity\nor physical job', icon: <Ionicons name="flame-outline" {...ICON} /> },
];

export default function ActivityStep() {
  const { progress, next } = useOnboardingStep('activity');
  const activityLevel = useOnboarding((s) => s.activityLevel);
  const set = useOnboarding((s) => s.set);

  return (
    <OnboardingScreen
      progress={progress}
      title={"How active are you\nduring the day?"}
      subtitle="This helps us estimate your daily calorie needs."
      onNext={next}
      nextDisabled={!activityLevel}>
      <View className="mt-6 gap-2.5">
        {OPTIONS.map((o) => (
          <OptionCard
            key={o.value}
            icon={o.icon}
            title={o.label}
            subtitle={o.description}
            selected={activityLevel === o.value}
            onPress={() => set({ activityLevel: o.value })}
          />
        ))}
      </View>
    </OnboardingScreen>
  );
}
