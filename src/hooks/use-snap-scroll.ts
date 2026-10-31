import { useCallback, useEffect, useRef } from 'react';
import {
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  type ScrollViewInstance,
} from 'react-native';

type Options = {
  itemSize: number;
  count: number;
  index: number;
  onIndexChange: (index: number) => void;
};

/**
 * Vertical ScrollView that snaps to fixed-size items and reports the centered index.
 * Native platforms snap with `snapToInterval`; react-native-web doesn't support it,
 * so on web we settle onto the nearest item once scrolling pauses.
 */
export function useSnapScroll({ itemSize, count, index, onIndexChange }: Options) {
  const ref = useRef<ScrollViewInstance>(null);
  const current = useRef(index);
  const positioned = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(settleTimer.current), []);

  const scrollToIndex = useCallback(
    (i: number, animated = true) => ref.current?.scrollTo({ y: i * itemSize, animated }),
    [itemSize]
  );

  // Follow external changes (e.g. the persisted draft hydrating after first render).
  useEffect(() => {
    if (index === current.current) return;
    current.current = index;
    if (positioned.current) scrollToIndex(index, false);
  }, [index, scrollToIndex]);

  const onLayout = useCallback(
    (_: LayoutChangeEvent) => {
      if (positioned.current) return;
      positioned.current = true;
      scrollToIndex(current.current, false);
    },
    [scrollToIndex]
  );

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const i = Math.min(Math.max(Math.round(y / itemSize), 0), count - 1);
      if (i !== current.current) {
        current.current = i;
        onIndexChange(i);
      }
      if (Platform.OS === 'web') {
        clearTimeout(settleTimer.current);
        settleTimer.current = setTimeout(() => {
          if (Math.abs(y - i * itemSize) > 0.5) scrollToIndex(i);
        }, 120);
      }
    },
    [count, itemSize, onIndexChange, scrollToIndex]
  );

  /** Move programmatically (e.g. from an accessibility action) and report the change. */
  const setIndex = useCallback(
    (i: number) => {
      const clamped = Math.min(Math.max(i, 0), count - 1);
      current.current = clamped;
      onIndexChange(clamped);
      scrollToIndex(clamped);
    },
    [count, onIndexChange, scrollToIndex]
  );

  return {
    ref,
    setIndex,
    scrollProps: {
      onLayout,
      onScroll,
      scrollEventThrottle: 16,
      snapToInterval: itemSize,
      decelerationRate: 'fast' as const,
      showsVerticalScrollIndicator: false,
    },
  };
}
