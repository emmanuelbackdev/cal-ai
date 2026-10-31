export type UnitSystem = 'metric' | 'imperial';

const CM_PER_INCH = 2.54;
const LB_PER_KG = 2.20462;

export const cmToInches = (cm: number) => cm / CM_PER_INCH;
export const inchesToCm = (inches: number) => inches * CM_PER_INCH;
export const kgToLb = (kg: number) => kg * LB_PER_KG;
export const lbToKg = (lb: number) => lb / LB_PER_KG;

/** 69 -> `5' 9"` */
export function formatFeetInches(totalInches: number) {
  const rounded = Math.round(totalInches);
  return `${Math.floor(rounded / 12)}' ${rounded % 12}"`;
}

export function formatWeight(kg: number, units: UnitSystem) {
  return units === 'metric' ? `${kg.toFixed(1)} kg` : `${Math.round(kgToLb(kg))} lb`;
}

export function formatWeeklyRate(kgPerWeek: number, units: UnitSystem) {
  return units === 'metric'
    ? `${kgPerWeek.toFixed(2).replace(/0$/, '')} kg / week`
    : `${(Math.round(kgToLb(kgPerWeek) * 10) / 10).toFixed(1)} lb / week`;
}
