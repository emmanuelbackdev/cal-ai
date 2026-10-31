import { OnboardingScreen } from '@/components/onboarding/onboarding-screen';
import { WeightRuler } from '@/components/onboarding/weight-ruler';
import { useOnboardingStep } from '@/hooks/use-onboarding-step';
import { useOnboarding } from '@/stores/onboarding';

export default function WeightStep() {
  const { progress, next } = useOnboardingStep('weight');
  const weightKg = useOnboarding((s) => s.weightKg);
  const unitSystem = useOnboarding((s) => s.unitSystem);
  const set = useOnboarding((s) => s.set);

  return (
    <OnboardingScreen
      progress={progress}
      title={"What’s your\ncurrent weight?"}
      subtitle="This helps us understand your starting point."
      onNext={next}
      scroll={false}>
      <WeightRuler weightKg={weightKg} unitSystem={unitSystem} onChange={(kg) => set({ weightKg: kg })} />
    </OnboardingScreen>
  );
}
