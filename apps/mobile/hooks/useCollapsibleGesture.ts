import { useRef } from "react";
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
 *
 * It allows the user to swipe even when the collapse is open.
 * When a swipe is triggered, it first animates the collapse closed (if needed)
 * then animates the item off‑screen.
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
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scaleValue = useSharedValue(1);
  const containerWidth = useRef(0);
  const screenWidth = Dimensions.get("window").width;

  const onLayout = (e: LayoutChangeEvent) => {
    containerWidth.current = e.nativeEvent.layout.width;
  };

  const closeCollapse = (callback?: () => void) => {
    if (collapseConfig && collapseConfig.collapsed) {
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
        },
      );
    } else {
      if (callback) {
        callback();
      }
    }
  };

  /**
   * Animate the item off‑screen after closing the collapse (if needed).
   */
  const runSwipeAnimation = (
    direction: "left" | "right",
    callback?: () => void,
    durationOverride?: number,
  ) => {
    closeCollapse(() => {
      const animDuration = durationOverride ?? 300;
      const fadeDuration = 200;
      const currentX = translateX.value;
      const targetX =
        direction === "left"
          ? -screenWidth - Math.abs(currentX)
          : screenWidth + Math.abs(currentX);

      translateX.value = withTiming(targetX, { duration: animDuration }, () => {
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
                    callback && runOnJS(callback)();
                  },
                );
              },
            );
          } else {
            callback && runOnJS(callback)();
          }
        });
      });
    });
  };

  /**
   * Tap gesture: toggles the collapse.
   */
  const gestureTap = Gesture.Tap().onEnd((_, success) => {
    if (success && onToggleCollapse) {
      runOnJS(onToggleCollapse)();
    }
  });

  /**
   * Pan (swipe) gesture: allows horizontal dragging even if collapse is open.
   * On release, checks thresholds for "complete" or "fail" actions.
   */
  const gesturePan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate(({ translationX }) => {
      translateX.value = translationX * resistance;
    })
    .onEnd((e) => {
      const normalizedDrag = translateX.value / containerWidth.current;
      const absTranslation = Math.abs(translateX.value);
      const absVelocity = Math.abs(e.velocityX);
      const isSignificantSwipe =
        absTranslation > minSwipeDistance &&
        (Math.abs(normalizedDrag) > swipeThreshold ||
          absVelocity > velocityThreshold);
      if (isSignificantSwipe) {
        if (translateX.value > 0 && onComplete) {
          runOnJS(runSwipeAnimation)("right", onComplete);
        } else if (translateX.value < 0 && onFail) {
          runOnJS(runSwipeAnimation)("left", onFail);
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

  /**
   * Long press gesture: scales up slightly and triggers a callback.
   */
  const gestureLongPress = Gesture.LongPress()
    .minDuration(600)
    .onStart(() => {
      scaleValue.value = withSpring(1.1, { damping: 10, stiffness: 100 });
      if (onLongPress) {
        runOnJS(onLongPress)();
      }
    })
    .onEnd((_, success) => {
      if (!success) {
        scaleValue.value = withSpring(1, { damping: 10, stiffness: 100 });
      }
    });

  // Compose the gestures so that whichever fires first wins.
  const composedGesture = Gesture.Race(
    gesturePan,
    gestureLongPress,
    gestureTap,
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
