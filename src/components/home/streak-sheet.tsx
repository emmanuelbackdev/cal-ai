import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { toLocalDate } from '@/lib/dates';
import type { StreakResponse } from '@/shared/api-types';
import { addDays } from '@/shared/streak';

export const STREAK_COLOR = '#FF8A1F';

function copyFor({ current, loggedToday }: StreakResponse) {
  if (current === 0) {
    return { title: 'Start your streak', body: 'Log a meal today and build a healthy habit, one day at a time.' };
  }
  if (!loggedToday) {
    return { title: 'Keep it going', body: `Log a meal today to keep your ${current}-day streak alive.` };
  }
  if (current === 1) {
    return { title: 'Great start!', body: 'You logged today. Come back tomorrow to make it two days in a row.' };
  }
  return { title: 'You’re on fire!', body: `${current} days in a row. Consistency is what gets results, so keep showing up.` };
}

function LastSevenDays({ recentDates }: { recentDates: string[] }) {
  const today = toLocalDate(new Date());
  const logged = new Set(recentDates);
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));

  return (
    <View className="flex-row justify-between self-stretch">
      {days.map((day) => {
        const isLogged = logged.has(day);
        const isToday = day === today;
        return (
          <View key={day} className="items-center">
            <Text className={`text-[13px] ${isToday ? 'font-semibold text-[#111]' : 'text-[#8A8A8A]'}`}>
              {new Date(`${day}T00:00`).toLocaleDateString('en-US', { weekday: 'narrow' })}
            </Text>
            <View
              className={`mt-1.5 h-9 w-9 items-center justify-center rounded-full ${
                isLogged ? '' : isToday ? 'border-[1.5px] border-dashed border-[#CFCFCF]' : 'bg-[#F3F3F6]'
              }`}
              style={isLogged ? { backgroundColor: STREAK_COLOR } : undefined}>
              {isLogged ? <Ionicons name="flame" size={18} color="#fff" /> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

type Props = {
  visible: boolean;
  streak: StreakResponse;
  onClose: () => void;
  /** Shown as the primary action when today isn't logged yet. */
  onLogMeal: () => void;
};

/** Bottom sheet that fades and slides up with the user's streak and a nudge to keep it going. */
export function StreakSheet({ visible, streak, onClose, onLogMeal }: Props) {
  const insets = useSafeAreaInsets();
  // Stays mounted while the close animation plays, then unmounts the Modal.
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);

  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      progress.set(withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }));
    } else {
      progress.set(
        withTiming(0, { duration: 220, easing: Easing.in(Easing.cubic) }, (finished) => {
          if (finished) scheduleOnRN(setMounted, false);
        })
      );
    }
  }, [visible, progress]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.get() * 0.45 }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ translateY: interpolate(progress.get(), [0, 1], [360, 0]) }],
  }));

  const { title, body } = copyFor(streak);
  const primary = streak.loggedToday
    ? { label: 'Keep it up', onPress: onClose }
    : { label: 'Log a meal', onPress: onLogMeal };

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View className="absolute inset-0 bg-black" style={backdropStyle}>
        <Pressable accessibilityLabel="Close" className="flex-1" onPress={onClose} />
      </Animated.View>

      <Animated.View
        accessibilityViewIsModal
        className="absolute inset-x-0 bottom-0 items-center rounded-t-[32px] bg-white px-6 pt-3"
        style={[sheetStyle, { paddingBottom: insets.bottom + 20 }]}>
        <View className="h-1.5 w-10 rounded-full bg-[#E4E4E4]" />

        <View className="mt-6 h-24 w-24 items-center justify-center rounded-full bg-[#FFF1E6]">
          <Ionicons name="flame" size={52} color={STREAK_COLOR} />
        </View>
        <Text className="mt-4 text-[44px] font-bold leading-[48px] tracking-tight text-[#111]">{streak.current}</Text>
        <Text className="text-[15px] text-[#555]">day streak</Text>

        <Text className="mt-5 text-center text-2xl font-bold tracking-tight text-[#111]">{title}</Text>
        <Text className="mt-2 text-center text-[15px] leading-[22px] text-[#555]">{body}</Text>

        <View className="mt-6 self-stretch rounded-2xl border border-[#EDEDED] px-4 py-4">
          <LastSevenDays recentDates={streak.recentDates} />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={primary.onPress}
          className="mt-6 h-[54px] items-center justify-center self-stretch rounded-2xl bg-black active:opacity-80">
          <Text className="text-[17px] font-semibold text-white">{primary.label}</Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}
