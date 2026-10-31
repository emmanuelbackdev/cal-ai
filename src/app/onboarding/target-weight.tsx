import { Text } from 'react-native';

import { OnboardingScreen } from '@/components/onboarding/onboarding-screen';
import { WeightRuler } from '@/components/onboarding/weight-ruler';
import { useOnboardingStep } from '@/hooks/use-onboarding-step';
import { useOnboarding } from '@/stores/onboarding';

export default function TargetWeightStep() {
  const { progress, next } = useOnboardingStep('target-weight');
  const weightKg = useOnboarding((s) => s.weightKg);
  const goal = useOnboarding((s) => s.goal);
  const targetWeightKg = useOnboarding((s) => s.targetWeightKg) ?? weightKg;
  const unitSystem = useOnboarding((s) => s.unitSystem);
  const set = useOnboarding((s) => s.set);

  const invalid =
    (goal === 'lose' && targetWeightKg >= weightKg) || (goal === 'gain' && targetWeightKg <= weightKg);

  return (
    <OnboardingScreen
      progress={progress}
      title={"What’s your\ngoal weight?"}
      subtitle="Where do you want to be?"
      onNext={() => {
        set({ targetWeightKg });
        next();
      }}
      nextDisabled={invalid}
      scroll={false}>
      <WeightRuler
        weightKg={targetWeightKg}
        unitSystem={unitSystem}
        onChange={(kg) => set({ targetWeightKg: kg })}
      />
      {invalid ? (
        <Text className="mt-2 text-center text-sm text-[#555]">
          {goal === 'lose'
            ? 'Pick a weight below your current weight.'
            : 'Pick a weight above your current weight.'}
        </Text>
      ) : null}
    </OnboardingScreen>
  );
}
