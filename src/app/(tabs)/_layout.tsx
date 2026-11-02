import { usePathname } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';

const SCREEN_BACKGROUND = { backgroundColor: '#FDFDFD' };

// Signed-in area: system tab bar (Liquid Glass on iOS 26+, Material on Android).
export default function TabsLayout() {
  // The Scan tab is dark (camera), so the selected icon/label switch to white there.
  const onScan = usePathname() === '/scan';
  return (
    <NativeTabs tintColor={onScan ? '#fff' : '#111'}>
      <NativeTabs.Trigger name="home" contentStyle={SCREEN_BACKGROUND}>
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>
      {/* Dark content so the Liquid Glass tab bar renders dark over the camera. */}
      <NativeTabs.Trigger name="scan" contentStyle={{ backgroundColor: '#000' }}>
        <NativeTabs.Trigger.Label>Scan</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'camera', selected: 'camera.fill' }} md="photo_camera" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile" contentStyle={SCREEN_BACKGROUND}>
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
