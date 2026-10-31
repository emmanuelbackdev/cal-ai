import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

type Props = {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  /** Taller card with a larger icon, used when there are only a couple of options. */
  large?: boolean;
};

export function OptionCard({ icon, title, subtitle, selected, onPress, large }: Props) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`flex-row items-center rounded-2xl bg-white px-5 active:opacity-70 ${
        large ? 'h-[104px]' : 'min-h-[64px] py-3'
      } ${selected ? 'border-[1.5px] border-[#111]' : 'border border-[#EDEDED]'}`}>
      <View className={`items-center justify-center ${large ? 'w-11' : 'w-8'}`}>{icon}</View>
      <View className={`flex-1 ${large ? 'ml-7' : 'ml-5'}`}>
        <Text className="text-base font-semibold text-[#111]">{title}</Text>
        {subtitle ? <Text className="mt-1 text-sm leading-5 text-[#555]">{subtitle}</Text> : null}
      </View>
      {selected ? (
        <View className="ml-3 h-6 w-6 items-center justify-center rounded-full bg-[#111]">
          <Ionicons name="checkmark" size={15} color="#fff" />
        </View>
      ) : null}
    </Pressable>
  );
}
