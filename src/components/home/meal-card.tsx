import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import type { MealWithItems } from '@/shared/api-types';

export const MACRO_COLORS = { protein: '#E5534B', carbs: '#E3A72F', fat: '#EEC12E' } as const;

const FAILURE_MESSAGES: Record<NonNullable<MealWithItems['failureReason']>, string> = {
  not_food: 'No food found in this photo',
  refused: 'We couldn’t analyze this photo',
  ai_error: 'Couldn’t analyze this meal',
  timeout: 'Analysis took too long',
};

/** The meal photo, with an optional overlay (spinner, error icon). */
function Thumbnail({ meal, children }: { meal: MealWithItems; children?: React.ReactNode }) {
  return (
    <View className="h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-xl bg-[#F3F3F6]">
      <Image
        // Signed URLs change on every fetch; caching by file id avoids re-downloading the same photo.
        source={{ uri: meal.imageUrl, cacheKey: meal.imageFileId }}
        contentFit="cover"
        transition={150}
        style={{ position: 'absolute', width: '100%', height: '100%' }}
        accessibilityIgnoresInvertColors
      />
      {children ? <View className="absolute inset-0 items-center justify-center bg-black/35">{children}</View> : null}
    </View>
  );
}

function Macro({ icon, color, grams }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; color: string; grams: number | null }) {
  return (
    <View className="flex-row items-center">
      <MaterialCommunityIcons name={icon} size={14} color={color} />
      <Text className="ml-1 text-[13px] text-[#555]">{Math.round(grams ?? 0)}g</Text>
    </View>
  );
}

/** A meal in the day's list: analyzing, failed (with Try again), or with its calories and macros. */
export function MealCard({ meal, onRetry }: { meal: MealWithItems; onRetry?: () => void }) {
  const time = new Date(meal.eatenAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  if (meal.status === 'pending' || meal.status === 'analyzing') {
    return (
      <View className="flex-row items-center rounded-2xl border border-[#EDEDED] bg-white p-3">
        <Thumbnail meal={meal}>
          <ActivityIndicator color="#fff" />
        </Thumbnail>
        <View className="ml-4 flex-1">
          <Text className="text-base font-semibold text-[#111]">Analyzing…</Text>
          <Text className="mt-1 text-sm text-[#555]">This only takes a few seconds</Text>
        </View>
      </View>
    );
  }

  if (meal.status === 'failed') {
    return (
      <View className="flex-row items-center rounded-2xl border border-[#EDEDED] bg-white p-3">
        <Thumbnail meal={meal}>
          <Ionicons name="alert-circle" size={26} color="#fff" />
        </Thumbnail>
        <View className="ml-4 flex-1">
          <Text className="text-base font-semibold text-[#111]">
            {meal.failureReason ? FAILURE_MESSAGES[meal.failureReason] : 'Something went wrong'}
          </Text>
          <Text className="mt-1 text-sm text-[#555]">{time}</Text>
        </View>
        {onRetry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try analyzing this meal again"
            hitSlop={8}
            onPress={onRetry}
            className="ml-2 flex-row items-center rounded-full bg-[#111] px-3.5 py-2 active:opacity-70">
            <Ionicons name="refresh" size={15} color="#fff" />
            <Text className="ml-1 text-sm font-semibold text-white">Try again</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View className="flex-row items-center rounded-2xl border border-[#EDEDED] bg-white p-3">
      <Thumbnail meal={meal} />
      <View className="ml-4 flex-1">
        <View className="flex-row items-start">
          <Text numberOfLines={1} className="flex-1 text-base font-semibold text-[#111]">
            {meal.name ?? 'Meal'}
          </Text>
          <Text className="ml-2 rounded-md bg-[#F3F3F6] px-1.5 py-0.5 text-xs text-[#555]">{time}</Text>
        </View>
        <View className="mt-1 flex-row items-center">
          <Ionicons name="flame" size={15} color="#111" />
          <Text className="ml-1 text-[15px] font-semibold text-[#111]">{meal.calories ?? 0} calories</Text>
        </View>
        <View className="mt-1.5 flex-row gap-4">
          <Macro icon="food-drumstick" color={MACRO_COLORS.protein} grams={meal.proteinG} />
          <Macro icon="barley" color={MACRO_COLORS.carbs} grams={meal.carbsG} />
          <Macro icon="water" color={MACRO_COLORS.fat} grams={meal.fatG} />
        </View>
      </View>
    </View>
  );
}
