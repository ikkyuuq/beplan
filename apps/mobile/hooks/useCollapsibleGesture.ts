import { useCallback } from "react";
import { Dimensions, LayoutChangeEvent } from "react-native";
import {
  useSharedValue,
  withSpring,
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
  minSwipeDistance = 60,
  swipeThreshold = 0.4,
  velocityThreshold = 800,
  resistance = 0.3,
  collapseConfig,
}: UseCollapsibleGestureProps) {
  // Shared values
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scaleValue = useSharedValue(1);
  const containerWidth = useSharedValue(0); // เปลี่ยนจาก useRef เป็น useSharedValue
  const screenWidth = Dimensions.get("window").width;

  // สร้าง stable callbacks สำหรับให้ worklet เรียกใช้
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

  // ใช้ useCallback สำหรับ onLayout
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      containerWidth.value = e.nativeEvent.layout.width;
    },
    [containerWidth]
  );

  // ปรับปรุงฟังก์ชัน closeCollapse และใช้ useCallback
  const closeCollapse = useCallback(
    (callback?: () => void) => {
      if (collapseConfig && collapseConfig.collapsed) {
        // ต้องใช้ runOnJS เพราะ setCollapsed เป็น JS thread function
        runOnJS(collapseConfig.setCollapsed)(false);

        collapseConfig.innerCollapsePaddingBottom.value = withTiming(0, {
          duration: 200,
        });

        collapseConfig.innerCollapseHeight.value = withTiming(
          0,
          { duration: 200 },
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

  // ปรับปรุงฟังก์ชัน runSwipeAnimation และใช้ useCallback
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

  // Gesture handlers
  const gestureTap = Gesture.Tap().onEnd((_, success) => {
    if (success) {
      runOnJS(handleToggleCollapse)();
    }
  });

  const gesturePan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate(({ translationX }) => {
      translateX.value = translationX * resistance;
    })
    .onEnd((e) => {
      // ใช้ containerWidth.value แทน .current
      const normalizedDrag = translateX.value / containerWidth.value;
      const absTranslation = Math.abs(translateX.value);
      const absVelocity = Math.abs(e.velocityX);

      const isSignificantSwipe =
        absTranslation > minSwipeDistance &&
        (Math.abs(normalizedDrag) > swipeThreshold ||
          absVelocity > velocityThreshold);

      if (isSignificantSwipe) {
        if (translateX.value > 0) {
          // ใช้ handleComplete
          runOnJS(handleComplete)();

          // ทำ animation ใน worklet โดยตรง
          translateX.value = withSpring(containerWidth.value);
          opacity.value = withTiming(0, { duration: 300 });
        } else if (translateX.value < 0) {
          // ใช้ handleFail
          runOnJS(handleFail)();

          // ทำ animation ใน worklet โดยตรง
          translateX.value = withSpring(-containerWidth.value);
          opacity.value = withTiming(0, { duration: 300 });
        }
      } else {
        // Not significant – bounce back to 0.
        translateX.value = withSpring(0, {
          damping: 12,
          stiffness: 400,
          velocity: e.velocityX,
        });
      }
    });

  const gestureLongPress = Gesture.LongPress()
    .minDuration(600)
    .onStart(() => {
      scaleValue.value = withSpring(1.1, { damping: 10, stiffness: 100 });
      runOnJS(handleLongPress)();
    })
    .onEnd(() => {
      scaleValue.value = withSpring(1, { damping: 10, stiffness: 100 });
    });

  // Compose the gestures
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
