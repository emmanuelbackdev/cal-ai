import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { scanErrorMessage, type ScanStep, useScanMeal } from '@/hooks/use-scan-meal';

const STEP_LABELS: Record<ScanStep, string> = {
  preparing: 'Preparing your photo…',
  uploading: 'Uploading…',
  saving: 'Starting analysis…',
};

const FRAME_SIZE = 260;

function RoundButton({ icon, label, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      onPress={onPress}
      className="h-11 w-11 items-center justify-center rounded-full bg-black/40 active:opacity-60">
      <Ionicons name={icon} size={24} color="#fff" />
    </Pressable>
  );
}

/** Corner brackets marking where to place the meal. */
function ScanFrame() {
  const corner = 'absolute h-9 w-9 border-white';
  return (
    <View pointerEvents="none" style={{ width: FRAME_SIZE, height: FRAME_SIZE }}>
      <View className={`${corner} left-0 top-0 rounded-tl-3xl border-l-4 border-t-4`} />
      <View className={`${corner} right-0 top-0 rounded-tr-3xl border-r-4 border-t-4`} />
      <View className={`${corner} bottom-0 left-0 rounded-bl-3xl border-b-4 border-l-4`} />
      <View className={`${corner} bottom-0 right-0 rounded-br-3xl border-b-4 border-r-4`} />
    </View>
  );
}

function PermissionPrompt({ canAskAgain, onAllow, onPickPhoto }: { canAskAgain: boolean; onAllow: () => void; onPickPhoto: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View className="h-24 w-24 items-center justify-center rounded-full bg-[#1C1C1E]">
        <Ionicons name="camera" size={40} color="#fff" />
      </View>
      <Text className="mt-6 text-center text-2xl font-bold text-white">Allow camera access</Text>
      <Text className="mt-2 text-center text-[15px] leading-[22px] text-white/70">
        Bulky AI uses your camera to snap your meals and estimate their calories and macros.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={canAskAgain ? onAllow : () => Linking.openSettings()}
        className="mt-8 h-[54px] items-center justify-center self-stretch rounded-2xl bg-white active:opacity-80">
        <Text className="text-[17px] font-semibold text-black">{canAskAgain ? 'Allow camera' : 'Open Settings'}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onPickPhoto} className="mt-4 p-2 active:opacity-60">
        <Text className="text-[15px] font-semibold text-white">Choose from library</Text>
      </Pressable>
    </View>
  );
}

/**
 * Scan tab (plan.md journey C): camera or photo library → preview → "Analyze food", which uploads the
 * photo, creates a pending meal and starts the analysis, then switches to Home where the result appears.
 */
export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  // Native tabs mount every tab up front; only run the camera while this tab is on screen.
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [step, setStep] = useState<ScanStep>('preparing');
  const scan = useScanMeal(setStep);

  // Ask for camera access the first time the tab is opened (no prompt shown yet).
  const undetermined = permission?.status === 'undetermined';
  useEffect(() => {
    if (isFocused && undetermined) void requestPermission();
  }, [isFocused, undetermined, requestPermission]);

  // Keep controls clear of the tab bar: iOS draws content behind the floating bar, Android lays it out
  // above the bar, web has an overlaid bar (_layout.web.tsx).
  const bottomInset = Platform.select({ ios: insets.bottom + 64, web: insets.bottom + 96, default: 0 });

  const takePhoto = async () => {
    if (!cameraRef.current || !cameraReady || capturing) return;
    setCapturing(true);
    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      setPhotoUri(picture.uri);
    } catch {
      Alert.alert('Couldn’t take the photo', 'Please try again.');
    } finally {
      setCapturing(false);
    }
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.8 });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const retake = () => {
    scan.reset();
    setCameraReady(false);
    setPhotoUri(null);
  };

  const analyze = () => {
    if (!photoUri) return;
    scan.mutate(photoUri, {
      onSuccess: () => {
        retake();
        router.navigate('/home');
      },
    });
  };

  return (
    <View className="flex-1 bg-black">
      {photoUri ? (
        <Image source={photoUri} contentFit="cover" style={{ flex: 1 }} accessibilityLabel="Your meal photo" />
      ) : permission?.granted && isFocused ? (
        <View className="flex-1">
          <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" onCameraReady={() => setCameraReady(true)} />
          <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
            <ScanFrame />
            <Text className="mt-6 rounded-full bg-black/40 px-4 py-1.5 text-[15px] font-medium text-white">
              Point at your meal
            </Text>
          </View>
        </View>
      ) : permission && !permission.granted ? (
        <PermissionPrompt canAskAgain={permission.canAskAgain} onAllow={requestPermission} onPickPhoto={pickPhoto} />
      ) : null}

      {/* Top bar */}
      {photoUri && !scan.isPending ? (
        <View className="absolute inset-x-0 top-0 flex-row items-center px-5" style={{ paddingTop: insets.top + 8 }}>
          <RoundButton icon="arrow-back" label="Retake" onPress={retake} />
        </View>
      ) : null}

      {/* Bottom controls */}
      {photoUri ? (
        <View className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-black/80 px-6 pt-5" style={{ paddingBottom: bottomInset + 16 }}>
          {scan.isPending ? (
            <View className="h-[54px] flex-row items-center justify-center">
              <ActivityIndicator color="#fff" />
              <Text className="ml-3 text-[16px] font-medium text-white">{STEP_LABELS[step]}</Text>
            </View>
          ) : (
            <>
              {scan.isError ? (
                <Text accessibilityRole="alert" className="mb-3 text-center text-sm text-[#FF8A80]">
                  {scanErrorMessage(scan.error)}
                </Text>
              ) : null}
              <View className="flex-row gap-3">
                <Pressable
                  accessibilityRole="button"
                  onPress={retake}
                  className="h-[54px] flex-1 items-center justify-center rounded-2xl border border-white/30 active:opacity-70">
                  <Text className="text-[17px] font-semibold text-white">Retake</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={analyze}
                  className="h-[54px] flex-[2] flex-row items-center justify-center rounded-2xl bg-white active:opacity-80">
                  <Ionicons name="sparkles" size={18} color="#000" />
                  <Text className="ml-2 text-[17px] font-semibold text-black">Analyze food</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      ) : permission?.granted ? (
        <View className="absolute inset-x-0 bottom-0 flex-row items-center justify-between px-10" style={{ paddingBottom: bottomInset + 24 }}>
          <RoundButton icon="images-outline" label="Choose from library" onPress={pickPhoto} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Take photo"
            accessibilityState={{ disabled: !cameraReady || capturing }}
            disabled={!cameraReady || capturing}
            onPress={takePhoto}
            className="h-[78px] w-[78px] items-center justify-center rounded-full border-4 border-white active:opacity-70">
            <View className={`h-[62px] w-[62px] rounded-full ${cameraReady && !capturing ? 'bg-white' : 'bg-white/40'}`} />
          </Pressable>
          <View className="h-11 w-11" />
        </View>
      ) : null}
    </View>
  );
}
