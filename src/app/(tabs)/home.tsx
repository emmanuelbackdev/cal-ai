import { useAuth, useUser } from '@clerk/expo';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { calculateBaselineTargets } from '@/shared/nutrition';
import { toProfileInput, useOnboarding } from '@/stores/onboarding';

const withCommas = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

function TargetRow({ icon, label, value, last }: { icon: ReactNode; label: string; value: string; last?: boolean }) {
  return (
    <View className={`h-14 flex-row items-center px-5 ${last ? '' : 'border-b border-[#F0F0F0]'}`}>
      <View className="w-6 items-center">{icon}</View>
      <Text className="ml-4 flex-1 text-base font-semibold text-[#111]">{label}</Text>
      <Text className="text-base text-[#333]">{value}</Text>
    </View>
  );
}

// Placeholder until the Home dashboard is built. Targets come from the local onboarding draft
// until the profile and AI plan are saved server-side.
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { user } = useUser();
  const draft = useOnboarding();
  const profile = toProfileInput(draft);
  const targets = profile ? calculateBaselineTargets(profile) : null;
  const show = (value: number | undefined, unit: string) => (value === undefined ? '—' : `${withCommas(value)}${unit}`);

  return (
    <View className="flex-1 bg-[#FDFDFD]" style={{ paddingTop: insets.top }}>
      <ScrollView contentContainerClassName="px-6 pb-6 pt-4" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-start">
          <View className="flex-1 pr-3">
            <Text className="text-[32px] font-bold leading-10 tracking-tight text-[#111]">
              You’re all set{user?.firstName ? `, ${user.firstName}` : ''}
            </Text>
            {user?.primaryEmailAddress ? (
              <Text className="mt-1 text-base text-[#444]">{user.primaryEmailAddress.emailAddress}</Text>
            ) : null}
          </View>
          {/* TODO: open Settings / Profile once that screen exists. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            hitSlop={8}
            className="h-11 w-11 items-center justify-center rounded-full border border-[#F0F0F0] bg-white shadow-sm active:opacity-60">
            <Ionicons name="settings-sharp" size={22} color="#9A9A9A" />
          </Pressable>
        </View>

        <View className="mt-8 rounded-2xl border border-[#EDEDED] bg-white">
          <TargetRow
            icon={<Ionicons name="flame" size={20} color="#111" />}
            label="Calories"
            value={`${show(targets?.calories, '')} / day`}
          />
          <TargetRow icon={<Ionicons name="flash" size={19} color="#111" />} label="Protein" value={show(targets?.proteinG, ' g')} />
          <TargetRow icon={<MaterialCommunityIcons name="leaf" size={20} color="#111" />} label="Carbs" value={show(targets?.carbsG, ' g')} />
          <TargetRow icon={<Ionicons name="water" size={20} color="#111" />} label="Fat" value={show(targets?.fatG, ' g')} last />
        </View>
      </ScrollView>

      {/* Temporary until the Profile screen (with sign out) exists. */}
      <View className="px-6 pt-2" style={{ paddingBottom: insets.bottom + 12 }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => signOut()}
          className="h-[54px] items-center justify-center rounded-2xl border border-[#E4E4E4] bg-white active:opacity-70">
          <Text className="text-[17px] font-medium text-[#111]">Sign out</Text>
        </Pressable>
      </View>
    </View>
  );
}
