import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MACRO_COLORS, MealCard } from '@/components/home/meal-card';
import { STREAK_COLOR, StreakSheet } from '@/components/home/streak-sheet';
import { WeekStrip } from '@/components/home/week-strip';
import { ProgressRing } from '@/components/progress-ring';
import { useDailyTargets } from '@/hooks/use-me';
import { useMealRunUpdates } from '@/hooks/use-meal-run-updates';
import { isAnalyzing, sumEaten, useDayMeals, useRetryMeal } from '@/hooks/use-meals';
import { useStreak } from '@/hooks/use-streak';
import { toLocalDate } from '@/lib/dates';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

/** "1,234 left" / "56 over" for a target and what's been eaten. */
function remaining(target: number | undefined, eaten: number) {
  if (target === undefined) return { value: '—', over: false, progress: 0 };
  const left = Math.round(target - eaten);
  return {
    value: Math.abs(left).toLocaleString('en-US'),
    over: left < 0,
    progress: target > 0 ? eaten / target : 0,
  };
}

function MacroCard({ label, unit, icon, color, target, eaten }: {
  label: string;
  unit: string;
  icon: IconName;
  color: string;
  target: number | undefined;
  eaten: number;
}) {
  const r = remaining(target, eaten);
  return (
    <View className="flex-1 rounded-2xl border border-[#EDEDED] bg-white px-3.5 pb-4 pt-3.5">
      <Text className="text-lg font-semibold text-[#111]">
        {r.value}
        {target === undefined ? '' : unit}
      </Text>
      <Text className="text-[13px] text-[#555]">
        {label} {r.over ? 'over' : 'left'}
      </Text>
      <View className="mt-3 items-center">
        <ProgressRing size={68} strokeWidth={6} progress={r.progress} color={color} label={`${label} eaten`}>
          <MaterialCommunityIcons name={icon} size={20} color={color} />
        </ProgressRing>
      </View>
    </View>
  );
}

function EmptyMeals() {
  return (
    <View className="items-center rounded-2xl border border-[#EDEDED] bg-[#F7F7FA] px-6 pb-6 pt-5">
      <View className="w-full max-w-[260px] flex-row items-center rounded-xl bg-white p-3 shadow-sm">
        <View className="h-10 w-10 items-center justify-center rounded-lg bg-[#F3F3F6]">
          <MaterialCommunityIcons name="silverware-fork-knife" size={20} color="#B5B5BD" />
        </View>
        <View className="ml-3 flex-1 gap-2">
          <View className="h-2 w-4/5 rounded-full bg-[#ECECF0]" />
          <View className="h-2 w-1/2 rounded-full bg-[#ECECF0]" />
        </View>
      </View>
      <Text className="mt-4 text-center text-[15px] text-[#555]">Tap Scan to add your first meal of the day</Text>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const today = toLocalDate(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const { targets } = useDailyTargets();
  const meals = useDayMeals(selectedDate);
  const retryMeal = useRetryMeal();
  // Results arrive via polling in useDayMeals (iOS/Android) or Trigger.dev Realtime (web) while something is analyzing.
  useMealRunUpdates(!!meals.data?.some(isAnalyzing));
  const eaten = sumEaten(meals.data);
  const calories = remaining(targets?.calories, eaten.calories);
  const streak = useStreak();
  const streakCount = streak.data?.current ?? 0;
  const [streakOpen, setStreakOpen] = useState(false);

  const sectionTitle =
    selectedDate === today
      ? 'Today'
      : new Date(`${selectedDate}T00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    // `collapsable={false}` keeps the ScrollView recognised as the tab's content (tab-bar edge effects, scroll-to-top).
    <View collapsable={false} className="flex-1 bg-[#FDFDFD]">
      <ScrollView
        contentContainerClassName="px-6 pb-40"
        contentContainerStyle={{ paddingTop: insets.top + 12 }}
        showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center">
          <Image source={require('@/assets/images/welcome-logo.png')} style={{ width: 34, height: 33 }} />
          <Text className="ml-2 flex-1 text-[26px] font-bold tracking-tight text-[#111]">Bulky AI</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${streakCount}-day streak`}
            accessibilityHint="Shows your streak"
            disabled={!streak.data}
            onPress={() => setStreakOpen(true)}
            className="flex-row items-center rounded-full border border-[#EDEDED] bg-white px-3.5 py-1.5 shadow-sm active:opacity-70">
            <Ionicons name="flame" size={18} color={streakCount > 0 ? STREAK_COLOR : '#C7C7CC'} />
            <Text className="ml-1 text-base font-semibold text-[#111]">{streakCount}</Text>
          </Pressable>
        </View>

        <View className="mt-5">
          <WeekStrip selected={selectedDate} onSelect={setSelectedDate} />
        </View>

        <View className="mt-5 flex-row items-center rounded-3xl border border-[#EDEDED] bg-white px-6 py-6">
          <View className="flex-1">
            <Text className="text-[44px] font-bold tracking-tight text-[#111]">{calories.value}</Text>
            <Text className="text-[15px] text-[#555]">Calories {calories.over ? 'over' : 'left'}</Text>
          </View>
          <ProgressRing size={104} strokeWidth={9} progress={calories.progress} color="#111" label="Calories eaten">
            <Ionicons name="flame" size={28} color="#111" />
          </ProgressRing>
        </View>

        <View className="mt-3 flex-row gap-3">
          <MacroCard label="Protein" unit="g" icon="food-drumstick" color={MACRO_COLORS.protein} target={targets?.proteinG} eaten={eaten.proteinG} />
          <MacroCard label="Carbs" unit="g" icon="barley" color={MACRO_COLORS.carbs} target={targets?.carbsG} eaten={eaten.carbsG} />
          <MacroCard label="Fat" unit="g" icon="water" color={MACRO_COLORS.fat} target={targets?.fatG} eaten={eaten.fatG} />
        </View>

        <Text className="mb-3 mt-8 text-xl font-bold tracking-tight text-[#111]">{sectionTitle}</Text>
        {meals.isPending ? (
          <ActivityIndicator color="#111" className="mt-6" />
        ) : meals.isError ? (
          <Pressable accessibilityRole="button" onPress={() => meals.refetch()} className="items-center rounded-2xl border border-[#EDEDED] bg-white p-5 active:opacity-70">
            <Text className="text-[15px] text-[#555]">Couldn’t load your meals.</Text>
            <Text className="mt-1 text-[15px] font-semibold text-[#111]">Tap to try again</Text>
          </Pressable>
        ) : meals.data.length === 0 ? (
          <EmptyMeals />
        ) : (
          <View className="gap-3">
            {meals.data.map((meal) => (
              <MealCard key={meal.id} meal={meal} onRetry={() => retryMeal.mutate(meal)} />
            ))}
          </View>
        )}
      </ScrollView>

      {streak.data ? (
        <StreakSheet
          visible={streakOpen}
          streak={streak.data}
          onClose={() => setStreakOpen(false)}
          onLogMeal={() => {
            setStreakOpen(false);
            router.navigate('/scan');
          }}
        />
      ) : null}

    </View>
  );
}
