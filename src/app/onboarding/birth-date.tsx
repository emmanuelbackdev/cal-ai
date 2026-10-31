import { Text, View } from 'react-native';

import { OnboardingScreen } from '@/components/onboarding/onboarding-screen';
import { WheelColumn, WheelHighlight } from '@/components/onboarding/wheel-picker';
import { useOnboardingStep } from '@/hooks/use-onboarding-step';
import { ageFromBirthDate } from '@/shared/nutrition';
import { useOnboarding } from '@/stores/onboarding';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MIN_AGE = 13;
const MAX_AGE = 100;

const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();
const pad = (n: number) => String(n).padStart(2, '0');

export default function BirthDateStep() {
  const { progress, next } = useOnboardingStep('birth-date');
  const birthDate = useOnboarding((s) => s.birthDate);
  const set = useOnboarding((s) => s.set);

  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => thisYear - MAX_AGE + i);
  const [year, month, day] = birthDate.split('-').map(Number);
  const days = Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1);

  const update = (y: number, m: number, d: number) =>
    set({ birthDate: `${y}-${pad(m)}-${pad(Math.min(d, daysInMonth(y, m)))}` });

  const age = ageFromBirthDate(birthDate);
  const tooYoung = age < MIN_AGE;

  return (
    <OnboardingScreen
      progress={progress}
      title={"When were\nyou born?"}
      subtitle="Your age helps us calculate your calorie needs."
      onNext={next}
      nextDisabled={tooYoung}>
      <View className="mt-12">
        <WheelHighlight />
        <View className="flex-row">
          <WheelColumn
            className="flex-[1.6]"
            label="Month"
            items={MONTHS}
            index={month - 1}
            onChange={(i) => update(year, i + 1, day)}
          />
          <WheelColumn
            className="flex-1"
            label="Day"
            items={days.map(String)}
            index={day - 1}
            onChange={(i) => update(year, month, i + 1)}
          />
          <WheelColumn
            className="flex-[1.2]"
            label="Year"
            items={years.map(String)}
            index={Math.max(0, years.indexOf(year))}
            onChange={(i) => update(years[i], month, day)}
          />
        </View>
      </View>
      <Text className="mt-6 text-center text-sm text-[#555]">
        {tooYoung ? `You need to be at least ${MIN_AGE} to use Bulky AI.` : `${age} years old`}
      </Text>
    </OnboardingScreen>
  );
}
