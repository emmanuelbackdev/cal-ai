import Ionicons from '@expo/vector-icons/Ionicons';
import { TabList, TabSlot, TabTrigger, type TabTriggerSlotProps, Tabs } from 'expo-router/ui';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; href: '/home' | '/scan' | '/profile'; label: string; icon: IconName; iconFocused: IconName }[] = [
  { name: 'home', href: '/home', label: 'Home', icon: 'home-outline', iconFocused: 'home' },
  { name: 'scan', href: '/scan', label: 'Scan', icon: 'camera-outline', iconFocused: 'camera' },
  { name: 'profile', href: '/profile', label: 'Profile', icon: 'person-outline', iconFocused: 'person' },
];

// `ref` is left out of the type: TabTriggerSlotProps types it for View, which Pressable's ref type rejects.
function TabButton({ label, icon, iconFocused, isFocused, ...props }: Omit<TabTriggerSlotProps, 'ref'> & {
  label: string;
  icon: IconName;
  iconFocused: IconName;
}) {
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      className={`flex-1 items-center justify-center rounded-full py-2 active:opacity-70 ${isFocused ? 'bg-[#EFEFF2]' : ''}`}>
      <Ionicons name={isFocused ? iconFocused : icon} size={22} color={isFocused ? '#111' : '#8A8A8A'} />
      <Text className={`mt-0.5 text-xs ${isFocused ? 'font-semibold text-[#111]' : 'text-[#8A8A8A]'}`}>{label}</Text>
    </Pressable>
  );
}

// Web has no system tab bar (native tabs fall back to a top bar there), so it gets a bottom bar
// matching the app design. iOS/Android use _layout.tsx (native tabs).
export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />
      {/* Registers the routes; the visible bar below uses name-only triggers. */}
      <TabList style={{ display: 'none' }}>
        {TABS.map((tab) => (
          <TabTrigger key={tab.name} name={tab.name} href={tab.href} />
        ))}
      </TabList>

      <View
        pointerEvents="box-none"
        className="absolute inset-x-0 bottom-0 flex-row items-center px-4"
        style={{ paddingBottom: insets.bottom + 16 }}>
        <View accessibilityRole="tablist" className="flex-1 flex-row rounded-full border border-[#EDEDED] bg-white p-1.5 shadow-lg">
          {TABS.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} asChild>
              <TabButton label={tab.label} icon={tab.icon} iconFocused={tab.iconFocused} />
            </TabTrigger>
          ))}
        </View>
      </View>
    </Tabs>
  );
}
