import { useAuth, useUser } from '@clerk/expo';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import type { ReactNode } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MACRO_COLORS } from '@/components/home/meal-card';
import { type TargetSource, useDailyTargets, useDeleteAccount, useMe, useUpdateProfile } from '@/hooks/use-me';
import type { MeResponse } from '@/shared/api-types';
import { ageFromBirthDate, type ActivityLevel, type Goal } from '@/shared/nutrition';
import { cmToInches, formatFeetInches, formatWeeklyRate, formatWeight, type UnitSystem } from '@/shared/units';

// Same wording as the onboarding options.
const GOAL_LABELS: Record<Goal, string> = { lose: 'Lose weight', maintain: 'Maintain weight', gain: 'Gain weight' };
const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary',
  light: 'Lightly active',
  moderate: 'Moderately active',
  active: 'Very active',
  very_active: 'Extra active',
};
const PROVIDER_LABELS: Record<string, string> = { google: 'Google', apple: 'Apple' };

/** Hosted legal pages (required for App Store review). Set these in .env before release. */
const LEGAL_PAGES = {
  'Privacy Policy': process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL,
  'Terms of Service': process.env.EXPO_PUBLIC_TERMS_OF_SERVICE_URL,
} as const;

function openLegalPage(title: keyof typeof LEGAL_PAGES) {
  const url = LEGAL_PAGES[title];
  if (url) void WebBrowser.openBrowserAsync(url);
  else Alert.alert(title, 'This page isn’t available yet.');
}

const TARGET_SOURCE_LABELS: Record<TargetSource, string> = {
  ai: 'Personalized for you by AI',
  manual: 'Set by you',
  formula_fallback: 'Calculated from your profile',
  estimate: 'Estimated while your personalized plan is being built',
};

function Section({ title, caption, children }: { title: string; caption?: string; children: ReactNode }) {
  return (
    <View className="mt-7">
      <Text className="mb-2 ml-1 text-[15px] font-semibold text-[#111]">{title}</Text>
      <View className="rounded-2xl border border-[#EDEDED] bg-white">{children}</View>
      {caption ? <Text className="ml-1 mt-2 text-[13px] text-[#8A8A8A]">{caption}</Text> : null}
    </View>
  );
}

function Row({ icon, label, value, last }: { icon?: ReactNode; label: string; value: string; last?: boolean }) {
  return (
    <View className={`min-h-14 flex-row items-center px-5 py-3 ${last ? '' : 'border-b border-[#F0F0F0]'}`}>
      {icon ? <View className="mr-4 w-6 items-center">{icon}</View> : null}
      <Text className="flex-1 text-base text-[#111]">{label}</Text>
      <Text numberOfLines={1} className="ml-3 shrink text-base font-medium text-[#333]">
        {value}
      </Text>
    </View>
  );
}

function ActionRow({ icon, label, onPress, destructive, busy, last }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  destructive?: boolean;
  busy?: boolean;
  last?: boolean;
}) {
  const color = destructive ? '#D93F3F' : '#111';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy, disabled: busy }}
      disabled={busy}
      onPress={onPress}
      className={`h-14 flex-row items-center px-5 active:bg-[#F7F7F7] ${last ? '' : 'border-b border-[#F0F0F0]'}`}>
      <View className="mr-4 w-6 items-center">
        {busy ? <ActivityIndicator color={color} /> : <Ionicons name={icon} size={20} color={color} />}
      </View>
      <Text className="flex-1 text-base font-medium" style={{ color }}>
        {label}
      </Text>
    </Pressable>
  );
}

function LinkRow({ icon, label, onPress, last }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      className={`h-14 flex-row items-center px-5 active:bg-[#F7F7F7] ${last ? '' : 'border-b border-[#F0F0F0]'}`}>
      <View className="mr-4 w-6 items-center">
        <Ionicons name={icon} size={20} color="#111" />
      </View>
      <Text className="flex-1 text-base text-[#111]">{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#B5B5BD" />
    </Pressable>
  );
}

function UnitToggle({ value, onChange }: { value: UnitSystem; onChange: (units: UnitSystem) => void }) {
  return (
    <View className="flex-row items-center justify-between px-5 py-3">
      <Text className="text-base text-[#111]">Units</Text>
      <View accessibilityRole="radiogroup" className="flex-row rounded-xl bg-[#F1F1F4] p-1">
        {(['metric', 'imperial'] as const).map((units) => {
          const selected = units === value;
          return (
            <Pressable
              key={units}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => !selected && onChange(units)}
              className={`rounded-lg px-4 py-1.5 ${selected ? 'bg-white shadow-sm' : ''}`}>
              <Text className={`text-sm ${selected ? 'font-semibold text-[#111]' : 'text-[#555]'}`}>
                {units === 'metric' ? 'Metric' : 'Imperial'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function PersonalDetails({ profile }: { profile: NonNullable<MeResponse['profile']> }) {
  const units = profile.unitSystem;
  const height =
    units === 'metric' ? `${Math.round(profile.heightCm)} cm` : formatFeetInches(cmToInches(profile.heightCm));
  const rows = [
    { label: 'Age', value: `${ageFromBirthDate(profile.birthDate)}` },
    { label: 'Sex', value: profile.sex === 'male' ? 'Male' : 'Female' },
    { label: 'Height', value: height },
    { label: 'Current weight', value: formatWeight(profile.weightKg, units) },
    { label: 'Goal', value: GOAL_LABELS[profile.goal] },
    ...(profile.goal !== 'maintain' && profile.targetWeightKg !== null
      ? [{ label: 'Target weight', value: formatWeight(profile.targetWeightKg, units) }]
      : []),
    ...(profile.goal !== 'maintain' && profile.weeklyRateKg !== null
      ? [{ label: 'Pace', value: formatWeeklyRate(profile.weeklyRateKg, units) }]
      : []),
    { label: 'Activity', value: ACTIVITY_LABELS[profile.activityLevel] },
  ];
  return (
    <>
      {rows.map((row, i) => (
        <Row key={row.label} label={row.label} value={row.value} last={i === rows.length - 1} />
      ))}
    </>
  );
}

function confirmDeleteAccount(onConfirm: () => void) {
  const title = 'Delete account?';
  const message = 'This permanently deletes your account, profile and meal history. This can’t be undone.';
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { user } = useUser();
  const me = useMe();
  const { targets, source } = useDailyTargets();
  const updateProfile = useUpdateProfile();
  const deleteAccount = useDeleteAccount();
  const profile = me.data?.profile;
  const provider = user?.externalAccounts[0]?.provider;
  const signInProvider = provider ? (PROVIDER_LABELS[provider] ?? provider) : null;

  const onDelete = () =>
    confirmDeleteAccount(() =>
      deleteAccount.mutate(undefined, {
        onSuccess: () => signOut(),
        onError: () => Alert.alert('Couldn’t delete your account', 'Please try again in a moment.'),
      })
    );

  return (
    <ScrollView
      className="flex-1 bg-[#FDFDFD]"
      contentContainerClassName="px-6 pb-32"
      contentContainerStyle={{ paddingTop: insets.top + 12 }}
      showsVerticalScrollIndicator={false}>
      <Text className="text-[32px] font-bold leading-10 tracking-tight text-[#111]">Profile</Text>

      <View className="mt-5 flex-row items-center rounded-2xl border border-[#EDEDED] bg-white p-4">
        {user?.imageUrl ? (
          <Image source={user.imageUrl} style={{ width: 56, height: 56, borderRadius: 28 }} accessibilityIgnoresInvertColors />
        ) : (
          <View className="h-14 w-14 items-center justify-center rounded-full bg-[#F1F1F4]">
            <Ionicons name="person" size={26} color="#9A9A9A" />
          </View>
        )}
        <View className="ml-4 flex-1">
          <Text numberOfLines={1} className="text-lg font-semibold text-[#111]">
            {user?.fullName ?? 'Your account'}
          </Text>
          {user?.primaryEmailAddress ? (
            <Text numberOfLines={1} className="mt-0.5 text-sm text-[#555]">
              {user.primaryEmailAddress.emailAddress}
            </Text>
          ) : null}
        </View>
      </View>

      {me.isPending ? <ActivityIndicator color="#111" className="mt-10" /> : null}

      {targets ? (
        <Section title="Daily targets" caption={source ? TARGET_SOURCE_LABELS[source] : undefined}>
          <Row icon={<Ionicons name="flame" size={20} color="#111" />} label="Calories" value={`${targets.calories.toLocaleString('en-US')} kcal`} />
          <Row icon={<MaterialCommunityIcons name="food-drumstick" size={20} color={MACRO_COLORS.protein} />} label="Protein" value={`${Math.round(targets.proteinG)} g`} />
          <Row icon={<MaterialCommunityIcons name="barley" size={20} color={MACRO_COLORS.carbs} />} label="Carbs" value={`${Math.round(targets.carbsG)} g`} />
          <Row icon={<MaterialCommunityIcons name="water" size={20} color={MACRO_COLORS.fat} />} label="Fat" value={`${Math.round(targets.fatG)} g`} last />
        </Section>
      ) : null}

      {profile ? (
        <>
          <Section title="Personal details">
            <PersonalDetails profile={profile} />
          </Section>
          <Section title="Preferences">
            <UnitToggle value={profile.unitSystem} onChange={(unitSystem) => updateProfile.mutate({ unitSystem })} />
          </Section>
        </>
      ) : null}

      <Section title="Account">
        {user?.createdAt ? (
          <Row
            icon={<Ionicons name="calendar-outline" size={20} color="#111" />}
            label="Member since"
            value={user.createdAt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          />
        ) : null}
        {user?.primaryEmailAddress ? (
          <Row
            icon={<Ionicons name="mail-outline" size={20} color="#111" />}
            label="Email"
            value={user.primaryEmailAddress.emailAddress}
            last={!signInProvider}
          />
        ) : null}
        {signInProvider ? (
          <Row
            icon={<Ionicons name={signInProvider === 'Apple' ? 'logo-apple' : 'logo-google'} size={20} color="#111" />}
            label="Signed in with"
            value={signInProvider}
            last
          />
        ) : null}
      </Section>

      <Section title="About" caption="Calorie and macro values are estimates, not medical advice.">
        <LinkRow icon="hand-left-outline" label="Privacy Policy" onPress={() => openLegalPage('Privacy Policy')} />
        <LinkRow icon="document-text-outline" label="Terms of Service" onPress={() => openLegalPage('Terms of Service')} />
        <Row
          icon={<Ionicons name="information-circle-outline" size={20} color="#111" />}
          label="Version"
          value={Constants.expoConfig?.version ?? '—'}
          last
        />
      </Section>

      {/* Account actions sit last, away from everyday settings. */}
      <View className="mt-7 rounded-2xl border border-[#EDEDED] bg-white">
        <ActionRow icon="log-out-outline" label="Sign out" onPress={() => signOut()} />
        <ActionRow icon="trash-outline" label="Delete account" destructive busy={deleteAccount.isPending} onPress={onDelete} last />
      </View>
    </ScrollView>
  );
}
