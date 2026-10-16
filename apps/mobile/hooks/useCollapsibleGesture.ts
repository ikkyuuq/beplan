import { useCallback } from "react";
import { Dimensions, LayoutChangeEvent, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { MOTION } from "@/constants/motion";
import {
  useSharedValue,
  withTiming,
  runOnJS,
  SharedValue,
} from "react-native-reanimated";
import { Gesture } from "react-native-gesture-handler";

export interface CollapseConfig {
  collapsed: boolean;
  setCollapsed: (val: boolean) => void;
  containerHeight: SharedValue<number>;
  collapseMarginBottom: SharedValue<number>;
  innerCollapseHeight: SharedValue<number>;
  innerCollapsePaddingBottom: SharedValue<number>;
  totalItemHeight?: SharedValue<number>;
}

export interface UseCollapsibleGestureProps {
  onComplete?: () => void;
  onFail?: () => void;
  onToggleCollapse?: () => void;
  onLongPress?: () => void;
  minSwipeDistance?: number;
  swipeThreshold?: number;
  velocityThreshold?: number;
  resistance?: number;
  collapseConfig?: CollapseConfig;
}

/**
 * A reusable hook for collapse + swipe gestures.
 */
export function useCollapsibleGesture({
  onComplete,
  onFail,
  onToggleCollapse,
  onLongPress,
  // Tuned so a swipe is easy to finish: the card follows the finger 1:1, a
  // slow drag counts after a quarter of the card's width, and a gentle flick
  // counts at any distance past minSwipeDistance. (Was 60 px / 40% / 800 px/s
  // with 0.3 resistance: a slow drag needed ~400 px of finger travel.)
  minSwipeDistance = 40,
  swipeThreshold = 0.25,
  velocityThreshold = 500,
  resistance = 1,
  collapseConfig,
}: UseCollapsibleGestureProps) {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scaleValue = useSharedValue(1);
  const containerWidth = useSharedValue(0);
  // Whether the drag is currently far enough to count, for the haptic tick.
  const pastThreshold = useSharedValue(false);
  const screenWidth = Dimensions.get("window").width;

  const tickHaptic = useCallback(() => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const handleToggleCollapse = useCallback(() => {
    if (onToggleCollapse) {
      onToggleCollapse();
    }
  }, [onToggleCollapse]);

  const handleLongPress = useCallback(() => {
    if (onLongPress) {
      onLongPress();
    }
  }, [onLongPress]);

  const handleComplete = useCallback(() => {
    if (onComplete) {
      onComplete();
    }
  }, [onComplete]);

  const handleFail = useCallback(() => {
    if (onFail) {
      onFail();
    }
  }, [onFail]);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      containerWidth.value = e.nativeEvent.layout.width;
    },
    [containerWidth]
  );

  const closeCollapse = useCallback(
    (callback?: () => void) => {
      if (collapseConfig && collapseConfig.collapsed) {
        runOnJS(collapseConfig.setCollapsed)(false);

        collapseConfig.innerCollapsePaddingBottom.value = withTiming(0, MOTION.base);

        collapseConfig.innerCollapseHeight.value = withTiming(
          0,
          MOTION.base,
          () => {
            if (callback) {
              runOnJS(callback)();
            }
          }
        );
      } else {
        if (callback) {
          runOnJS(callback)();
        }
      }
    },
    [collapseConfig]
  );

  const runSwipeAnimation = useCallback(
    (
      direction: "left" | "right",
      callback?: () => void,
      durationOverride?: number
    ) => {
      closeCollapse(() => {
        const animDuration = durationOverride ?? 300;
        const fadeDuration = 200;
        const currentX = translateX.value;
        const targetX =
          direction === "left"
            ? -screenWidth - Math.abs(currentX)
            : screenWidth + Math.abs(currentX);

        translateX.value = withTiming(
          targetX,
          { duration: animDuration },
          () => {
            opacity.value = withTiming(0, { duration: fadeDuration }, () => {
              if (collapseConfig) {
                collapseConfig.collapseMarginBottom.value = withTiming(
                  0,
                  { duration: 200 },
                  () => {
                    collapseConfig.containerHeight.value = withTiming(
                      0,
                      { duration: 200 },
                      () => {
                        if (callback) {
                          runOnJS(callback)();
                        }
                      }
                    );
                  }
                );
              } else if (callback) {
                runOnJS(callback)();
              }
            });
          }
        );
      });
    },
    [closeCollapse, translateX, opacity, collapseConfig, screenWidth]
  );

  const gestureTap = Gesture.Tap().onEnd((_, success) => {
    if (success) {
      runOnJS(handleToggleCollapse)();
    }
  });

  const gesturePan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    // Let vertical scrolling win: a mostly-vertical drag never swipes a card.
    .failOffsetY([-15, 15])
    .onBegin(() => {
      pastThreshold.value = false;
    })
    .onUpdate(({ translationX }) => {
      translateX.value = translationX * resistance;
      // Light haptic tick when the drag crosses the "will count" point.
      const distance = Math.abs(translateX.value);
      const isPast =
        distance > minSwipeDistance &&
        distance > containerWidth.value * swipeThreshold;
      if (isPast !== pastThreshold.value) {
        pastThreshold.value = isPast;
        if (isPast) runOnJS(tickHaptic)();
      }
    })
    .onEnd((e) => {
      const normalizedDrag = translateX.value / containerWidth.value;
      const absTranslation = Math.abs(translateX.value);
      const absVelocity = Math.abs(e.velocityX);

      const isSignificantSwipe =
        absTranslation > minSwipeDistance &&
        (Math.abs(normalizedDrag) > swipeThreshold ||
          absVelocity > velocityThreshold);

      if (isSignificantSwipe) {
        if (translateX.value > 0) {
          runOnJS(handleComplete)();
          translateX.value = withTiming(containerWidth.value, MOTION.base);
          opacity.value = withTiming(0, MOTION.base);
        } else if (translateX.value < 0) {
          runOnJS(handleFail)();
          translateX.value = withTiming(-containerWidth.value, MOTION.base);
          opacity.value = withTiming(0, MOTION.base);
        }
      } else {
        translateX.value = withTiming(0, MOTION.base);
      }
    });

  const gestureLongPress = Gesture.LongPress()
    .minDuration(600)
    .onStart(() => {
      scaleValue.value = withTiming(1.03, MOTION.fast);
      runOnJS(handleLongPress)();
    })
    .onEnd(() => {
      scaleValue.value = withTiming(1, MOTION.fast);
    });

  const composedGesture = Gesture.Race(
    gesturePan,
    gestureLongPress,
    gestureTap
  );

  return {
    composedGesture,
    translateX,
    opacity,
    scaleValue,
    onLayout,
    runSwipeAnimation,
  };
}
