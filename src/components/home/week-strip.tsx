import { type ComponentRef, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { toLocalDate, weekOf } from '@/lib/dates';

/** How many weeks before the current one the strip can scroll back to. */
const WEEKS_BACK = 2;

type Props = {
  /** Selected local day, `YYYY-MM-DD`. */
  selected: string;
  onSelect: (date: string) => void;
};

function Day({ day, today, selected, onSelect }: { day: Date; today: string } & Props) {
  const key = toLocalDate(day);
  const isSelected = key === selected;
  const isFuture = key > today;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      accessibilityState={{ selected: isSelected, disabled: isFuture }}
      disabled={isFuture}
      onPress={() => onSelect(key)}
      className={`w-[46px] items-center rounded-2xl pb-2 pt-2 active:opacity-70 ${isSelected ? 'bg-white shadow-sm' : ''}`}>
      <Text
        className={`text-[13px] ${
          isSelected ? 'font-semibold text-[#111]' : isFuture ? 'text-[#BDBDBD]' : 'text-[#555]'
        }`}>
        {day.toLocaleDateString('en-US', { weekday: 'short' })}
      </Text>
      <View
        className={`mt-1.5 h-9 w-9 items-center justify-center rounded-full border-[1.5px] ${
          isSelected ? 'border-[#111]' : 'border-dashed border-[#CFCFCF]'
        }`}>
        <Text
          className={`text-[15px] ${
            isSelected ? 'font-semibold text-[#111]' : isFuture ? 'text-[#BDBDBD]' : 'text-[#333]'
          }`}>
          {day.getDate()}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * Week strip (Sunday first) that pages one week at a time: the current week plus `WEEKS_BACK` earlier
 * weeks, opening on the current one. Swipe right to go back in time; there's nothing after this week,
 * and today's future days are dimmed.
 */
export function WeekStrip({ selected, onSelect }: Props) {
  const now = new Date();
  const today = toLocalDate(now);
  const weeks = Array.from({ length: WEEKS_BACK + 1 }, (_, i) =>
    weekOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7 * (WEEKS_BACK - i)))
  );

  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const [pageWidth, setPageWidth] = useState(0);
  const openedOnCurrentWeek = useRef(false);

  return (
    // Fixed height so the page below doesn't jump while the width is measured.
    <View className="min-h-[84px]" onLayout={(e) => setPageWidth(e.nativeEvent.layout.width)}>
      {pageWidth > 0 ? (
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          // Start on the current (last) week once the pages are laid out.
          onContentSizeChange={() => {
            if (openedOnCurrentWeek.current) return;
            openedOnCurrentWeek.current = true;
            scrollRef.current?.scrollToEnd({ animated: false });
          }}>
          {weeks.map((week) => (
            <View key={toLocalDate(week[0])} className="flex-row justify-between py-1" style={{ width: pageWidth }}>
              {week.map((day) => (
                <Day key={toLocalDate(day)} day={day} today={today} selected={selected} onSelect={onSelect} />
              ))}
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}
