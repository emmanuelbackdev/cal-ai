import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { View } from 'react-native';

import { OnboardingScreen } from '@/components/onboarding/onboarding-screen';
import { OptionCard } from '@/components/onboarding/option-card';
import { useOnboardingStep } from '@/hooks/use-onboarding-step';
import { type Pace, PACE_RATES_KG } from '@/shared/nutrition';
import { formatWeeklyRate } from '@/shared/units';
import { useOnboarding } from '@/stores/onboarding';

const OPTIONS: {
  value: Pace;
  label: string;
  note?: string;
  icon: 'tortoise' | 'star-four-points-outline' | 'rabbit';
}[] = [
  { value: 'slow', label: 'Slow and steady', icon: 'tortoise' },
  { value: 'recommended', label: 'Recommended', note: 'Best balance of speed and comfort', icon: 'star-four-points-outline' },
  { value: 'fast', label: 'Fast', note: 'Harder to stick with', icon: 'rabbit' },
];

export default function PaceStep() {
  const { progress, next } = useOnboardingStep('pace');
  const goal = useOnboarding((s) => s.goal);
  const pace = useOnboarding((s) => s.pace);
  const unitSystem = useOnboarding((s) => s.unitSystem);
  const set = useOnboarding((s) => s.set);

  const rates = PACE_RATES_KG[goal === 'lose' ? 'lose' : 'gain'];
  const verb = goal === 'lose' ? 'Lose' : 'Gain';

  return (
    <OnboardingScreen
      progress={progress}
      title={"How fast do you want\nto reach your goal?"}
      subtitle="A steady pace is easier to stick with."
      onNext={next}>
      <View className="mt-6 gap-2.5">
        {OPTIONS.map((o) => (
          <OptionCard
            key={o.value}
            icon={<MaterialCommunityIcons name={o.icon} size={26} color="#111" />}
            title={o.label}
            subtitle={`${verb} ${formatWeeklyRate(rates[o.value], unitSystem)}${o.note ? `\n${o.note}` : ''}`}
            selected={pace === o.value}
            onPress={() => set({ pace: o.value })}
          />
        ))}
      </View>
    </OnboardingScreen>
  );
}
