import { Text, View } from 'react-native';

/** Large readout above a ruler, e.g. "175 cm". */
export function MeasureValue({ value, unit }: { value: string; unit?: string }) {
  return (
    <View className="mb-6 mt-10 flex-row items-baseline justify-center">
      <Text className="text-[44px] font-semibold tracking-tight text-[#111]">{value}</Text>
      {unit ? <Text className="ml-3 text-[15px] text-[#444]">{unit}</Text> : null}
    </View>
  );
}
