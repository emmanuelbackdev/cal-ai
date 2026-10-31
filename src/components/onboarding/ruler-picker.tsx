import { useCallback } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useSnapScroll } from '@/hooks/use-snap-scroll';

const HEIGHT = 300;
const FADE = [0.92, 0.75, 0.55, 0.35, 0.15];
const BG = '#FDFDFD';

type Props = {
  min: number;
  max: number;
  /** Value change per snap position. */
  step: number;
  /** Points between snap positions. */
  stepSize: number;
  tickEvery: number;
  labelEvery: number;
  value: number;
  onChange: (value: number) => void;
  formatLabel?: (value: number) => string;
  /** Spoken value for screen readers. */
  accessibilityValueText: string;
};

const round = (n: number) => Math.round(n * 1000) / 1000;
const isMultiple = (v: number, of: number) => Math.abs(v / of - Math.round(v / of)) < 1e-6;

/** Vertical ruler with larger values at the top and a fixed indicator in the middle. */
export function RulerPicker({
  min,
  max,
  step,
  stepSize,
  tickEvery,
  labelEvery,
  value,
  onChange,
  formatLabel = String,
  accessibilityValueText,
}: Props) {
  const count = Math.round((max - min) / step) + 1;
  const index = Math.round((max - value) / step);
  const onIndexChange = useCallback(
    (i: number) => onChange(round(max - i * step)),
    [max, step, onChange]
  );
  const { ref, scrollProps, setIndex } = useSnapScroll({ itemSize: stepSize, count, index, onIndexChange });

  // Only render ticks near the visible window.
  const pxPerUnit = stepSize / step;
  const span = HEIGHT / pxPerUnit;
  const ticks: number[] = [];
  const first = Math.ceil(Math.max(min, value - span) / tickEvery) * tickEvery;
  for (let v = first; v <= Math.min(max, value + span) + 1e-9; v += tickEvery) ticks.push(round(v));

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityValue={{ text: accessibilityValueText }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => setIndex(index + (e.nativeEvent.actionName === 'increment' ? -1 : 1))}
      style={{ height: HEIGHT }}>
      <ScrollView ref={ref} {...scrollProps}>
        <View style={{ height: (count - 1) * stepSize + HEIGHT }}>
          {ticks.map((v) => {
            const top = HEIGHT / 2 + (max - v) * pxPerUnit;
            const isLabel = isMultiple(v, labelEvery);
            const isCurrent = Math.abs(v - value) < step / 2;
            return (
              <View key={v} className="absolute w-full flex-row items-center" style={{ top: top - 10, height: 20 }}>
                <View className="flex-1 items-center">
                  <View className="h-[1.5px] w-[18px] rounded-full bg-[#D6D6D6]" />
                </View>
                {isLabel ? (
                  <Text
                    className={`absolute left-[269px] text-base ${
                      isCurrent ? 'font-semibold text-[#111]' : 'text-[#444]'
                    }`}>
                    {formatLabel(v)}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {FADE.map((opacity, i) => (
        <View key={`t${i}`} pointerEvents="none" className="absolute inset-x-0 h-3" style={{ top: i * 12, backgroundColor: BG, opacity }} />
      ))}
      {FADE.map((opacity, i) => (
        <View key={`b${i}`} pointerEvents="none" className="absolute inset-x-0 h-3" style={{ bottom: i * 12, backgroundColor: BG, opacity }} />
      ))}

      <View pointerEvents="none" className="absolute inset-x-0 items-center justify-center" style={{ top: HEIGHT / 2 - 11, height: 22 }}>
        <View className="h-[1.5px] w-[172px] bg-[#111]" />
        <View className="absolute h-[22px] w-[22px] rounded-full bg-[#111]" />
      </View>
    </View>
  );
}
