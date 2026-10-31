import { useCallback } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useSnapScroll } from '@/hooks/use-snap-scroll';

export const WHEEL_ITEM_HEIGHT = 44;
const VISIBLE = 5;

type Props = {
  items: string[];
  index: number;
  onChange: (index: number) => void;
  label: string;
  className?: string;
};

/** One column of an iOS-style wheel. Render several side by side over a `WheelHighlight`. */
export function WheelColumn({ items, index, onChange, label, className }: Props) {
  const onIndexChange = useCallback((i: number) => onChange(i), [onChange]);
  const { ref, scrollProps, setIndex } = useSnapScroll({
    itemSize: WHEEL_ITEM_HEIGHT,
    count: items.length,
    index,
    onIndexChange,
  });
  const pad = ((VISIBLE - 1) / 2) * WHEEL_ITEM_HEIGHT;

  return (
    <View
      className={className}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: items[index] }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => setIndex(index + (e.nativeEvent.actionName === 'increment' ? 1 : -1))}
      style={{ height: WHEEL_ITEM_HEIGHT * VISIBLE }}>
      <ScrollView ref={ref} {...scrollProps} contentContainerStyle={{ paddingVertical: pad }}>
        {items.map((item, i) => {
          const distance = Math.abs(i - index);
          return (
            <View key={item} className="items-center justify-center" style={{ height: WHEEL_ITEM_HEIGHT }}>
              <Text
                className={
                  distance === 0
                    ? 'text-[20px] font-semibold text-[#111]'
                    : `text-[18px] ${distance === 1 ? 'text-[#8E8E93]' : 'text-[#C7C7CC]'}`
                }>
                {item}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function WheelHighlight() {
  return (
    <View
      pointerEvents="none"
      className="absolute inset-x-0 rounded-xl bg-[#F2F2F2]"
      style={{ top: ((VISIBLE - 1) / 2) * WHEEL_ITEM_HEIGHT, height: WHEEL_ITEM_HEIGHT }}
    />
  );
}
