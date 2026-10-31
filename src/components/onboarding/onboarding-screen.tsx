import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SEGMENTS = 4;

function ProgressBar({ progress }: { progress: number }) {
  return (
    <View
      className="flex-row gap-1.5"
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}>
      {Array.from({ length: SEGMENTS }, (_, i) => {
        const fill = Math.min(Math.max(progress * SEGMENTS - i, 0), 1);
        return (
          <View key={i} className="h-[3px] w-10 overflow-hidden rounded-full bg-[#DDDDDD]">
            <View className="h-full rounded-full bg-[#111]" style={{ width: `${fill * 100}%` }} />
          </View>
        );
      })}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`h-[54px] items-center justify-center rounded-2xl active:opacity-80 ${
        disabled ? 'bg-[#D4D4D4]' : 'bg-black'
      }`}>
      <Text className="text-[17px] font-semibold text-white">{label}</Text>
    </Pressable>
  );
}

type Props = {
  /** 0–1. Omit to hide the back arrow and progress bar. */
  progress?: number;
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
  onNext: () => void;
  nextDisabled?: boolean;
  /** Set false when the content has its own vertical scroller (e.g. a ruler). */
  scroll?: boolean;
  children: ReactNode;
};

export function OnboardingScreen({
  progress,
  title,
  subtitle,
  buttonLabel = 'Next',
  onNext,
  nextDisabled,
  scroll = true,
  children,
}: Props) {
  const insets = useSafeAreaInsets();

  const body = (
    <>
      {title ? (
        <Text className="text-[32px] font-bold leading-10 tracking-tight text-[#111]">
          {title}
        </Text>
      ) : null}
      {subtitle ? (
        <Text className="mt-3 max-w-[255px] text-base leading-[26px] text-[#444]">{subtitle}</Text>
      ) : null}
      {children}
    </>
  );

  return (
    <View className="flex-1 bg-[#FDFDFD]" style={{ paddingTop: insets.top }}>
      {progress !== undefined ? (
        <View className="h-14 flex-row items-center justify-center">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={12}
            onPress={() => router.back()}
            className="absolute left-6 active:opacity-60">
            <Ionicons name="arrow-back" size={24} color="#111" />
          </Pressable>
          <ProgressBar progress={progress} />
        </View>
      ) : null}

      {scroll ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pb-6 pt-4"
          showsVerticalScrollIndicator={false}>
          {body}
        </ScrollView>
      ) : (
        <View className="flex-1 px-6 pt-4">{body}</View>
      )}

      <View className="px-6 pt-2" style={{ paddingBottom: insets.bottom + 12 }}>
        <PrimaryButton label={buttonLabel} onPress={onNext} disabled={nextDisabled} />
      </View>
    </View>
  );
}
