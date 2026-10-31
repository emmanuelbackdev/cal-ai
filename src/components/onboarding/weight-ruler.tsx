import { MeasureValue } from '@/components/onboarding/measure-value';
import { RulerPicker } from '@/components/onboarding/ruler-picker';
import { kgToLb, lbToKg, type UnitSystem } from '@/shared/units';

type Props = {
  weightKg: number;
  unitSystem: UnitSystem;
  onChange: (kg: number) => void;
};

/** Weight readout + ruler in the user's units; always reports kilograms. */
export function WeightRuler({ weightKg, unitSystem, onChange }: Props) {
  const metric = unitSystem === 'metric';
  const value = metric ? Math.round(weightKg * 10) / 10 : Math.round(kgToLb(weightKg));
  const label = metric ? value.toFixed(1) : String(value);

  return (
    <>
      <MeasureValue value={label} unit={metric ? 'kg' : 'lb'} />
      <RulerPicker
        key={unitSystem}
        min={metric ? 30 : 66}
        max={metric ? 300 : 661}
        step={metric ? 0.1 : 1}
        stepSize={5}
        tickEvery={metric ? 0.4 : 4}
        labelEvery={metric ? 2 : 20}
        value={value}
        onChange={(v) => onChange(metric ? v : Math.round(lbToKg(v) * 100) / 100)}
        accessibilityValueText={`${label} ${metric ? 'kilograms' : 'pounds'}`}
      />
    </>
  );
}
