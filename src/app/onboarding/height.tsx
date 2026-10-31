import { MeasureValue } from '@/components/onboarding/measure-value';
import { OnboardingScreen } from '@/components/onboarding/onboarding-screen';
import { RulerPicker } from '@/components/onboarding/ruler-picker';
import { useOnboardingStep } from '@/hooks/use-onboarding-step';
import { cmToInches, formatFeetInches, inchesToCm } from '@/shared/units';
import { useOnboarding } from '@/stores/onboarding';

export default function HeightStep() {
  const { progress, next } = useOnboardingStep('height');
  const heightCm = useOnboarding((s) => s.heightCm);
  const unitSystem = useOnboarding((s) => s.unitSystem);
  const set = useOnboarding((s) => s.set);

  const metric = unitSystem === 'metric';
  const value = metric ? Math.round(heightCm) : Math.round(cmToInches(heightCm));

  return (
    <OnboardingScreen
      progress={progress}
      title={"What’s your\nheight?"}
      subtitle="We'll use this to calculate your calorie needs."
      onNext={next}
      scroll={false}>
      {metric ? (
        <MeasureValue value={String(value)} unit="cm" />
      ) : (
        <MeasureValue value={formatFeetInches(value)} />
      )}
      <RulerPicker
        key={unitSystem}
        min={metric ? 100 : 40}
        max={metric ? 250 : 98}
        step={1}
        stepSize={20}
        tickEvery={1}
        labelEvery={metric ? 5 : 6}
        value={value}
        onChange={(v) => set({ heightCm: metric ? v : Math.round(inchesToCm(v) * 10) / 10 })}
        formatLabel={metric ? String : formatFeetInches}
        accessibilityValueText={metric ? `${value} centimeters` : formatFeetInches(value)}
      />
    </OnboardingScreen>
  );
}
