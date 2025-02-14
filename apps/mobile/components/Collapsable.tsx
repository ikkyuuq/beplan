import { View, Text, LayoutChangeEvent, Dimensions } from "react-native";
import React, { useRef, useState, useCallback } from "react";
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  useSharedValue,
  interpolateColor,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import ContextMenu from "./ContextMenu";

type CollapsableProps = {
  title: string;
  type?: string;
  category?: string;
  children: React.ReactNode;
  onComplete?: () => void;
  onFail?: () => void;
  onDelete?: () => void;
  onCustomize?: () => void;
  onReschedule?: () => void;
};

export default function Collapsable({
  title,
  type,
  category,
  children,
  onComplete,
  onFail,
  onDelete,
  onCustomize,
  onReschedule,
}: CollapsableProps) {
  const [collapsed, setCollapsed] = useState(false);
  const innerCollapseHeight = useSharedValue(0);
  const innerCollapsePaddingBottom = useSharedValue(24);
  const [androidMenuVisible, setAndroidMenuVisible] = useState(false);
  const [anchorPosition, setAnchorPosition] = useState({
    bottomLeft: { x: 0, y: 0 },
    topLeft: { x: 0, y: 0 },
  });
  const anchorRef = useRef<Animated.View>(null);
  const scaleValue = useSharedValue(1);
  const lastMeasuredPosition = useRef({
    bottomLeft: { x: 0, y: 0 },
    topLeft: { x: 0, y: 0 },
  });

  // Shared values for header height and margin
  const collapseHeight = useSharedValue(70);
  const collapseMarginBottom = useSharedValue(10);

  const onCollapseLayout = (e: LayoutChangeEvent) => {
    const height = e.nativeEvent.layout.height;
    if (height > 0 && height !== innerCollapseHeight.value) {
      if (!collapsed) {
        innerCollapseHeight.value = 0;
      } else {
        innerCollapseHeight.value = height;
      }
    }
  };

  const updateMenuPosition = useCallback(() => {
    return new Promise<void>((resolve) => {
      if (anchorRef.current) {
        anchorRef.current.measure((x, y, width, height, pageX, pageY) => {
          lastMeasuredPosition.current = {
            bottomLeft: { x: pageX, y: pageY + height },
            topLeft: { x: pageX, y: pageY },
          };
          setAnchorPosition({
            bottomLeft: { x: pageX, y: pageY + height },
            topLeft: { x: pageX, y: pageY },
          });
          resolve();
        });
      } else {
        resolve();
      }
    });
  }, []);

  const handleAndroidPress = useCallback(async () => {
    setAndroidMenuVisible(true);
  }, [updateMenuPosition]);

  const gestureTapCollapse = Gesture.Tap().onEnd((_, success) => {
    if (success) {
      runOnJS(setCollapsed)(!collapsed);
    }
  });

  const handleLongPressStart = () => {
    scaleValue.value = withSpring(1.1, { damping: 10, stiffness: 100 });
  };

  const handleModalClose = useCallback(() => {
    scaleValue.value = withSpring(1, { damping: 10, stiffness: 100 });
    setAndroidMenuVisible(false);
  }, [scaleValue]);

  const screenWidth = Dimensions.get("window").width;
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const collapseWidth = useRef(0);

  const SWIPE_THRESHOLD = 0.4;
  const VELOCITY_THRESHOLD = 800;
  const MIN_SWIPE_DISTANCE = 60;

  const closeCollapse = () => {
    if (collapsed) {
      collapseHeight.value = withTiming(
        collapseHeight.value - innerCollapseHeight.value,
        { duration: 200 },
      );
      runOnJS(setCollapsed)(false);
      innerCollapseHeight.value = withTiming(0, { duration: 200 });
      innerCollapsePaddingBottom.value = withTiming(0, { duration: 200 });
      collapseMarginBottom.value = withTiming(0, { duration: 600 });
      collapseHeight.value = withTiming(0, { duration: 600 });
    }
  };

  const runSwipeAnimation = (
    direction: "left" | "right",
    callback?: () => void,
    durationOverride?: number,
  ) => {
    const animDuration = durationOverride ?? 300;
    const fadeDuration = durationOverride
      ? Math.floor(durationOverride * 1.5)
      : 200;
    const currentX = translateX.value;
    const targetX =
      direction === "left"
        ? -screenWidth - Math.abs(currentX)
        : screenWidth + Math.abs(currentX);
    translateX.value = withTiming(targetX, { duration: animDuration }, () => {
      opacity.value = withTiming(0, { duration: fadeDuration }, () => {
        collapseMarginBottom.value = withTiming(0, { duration: 200 }, () => {
          collapseHeight.value = withTiming(0, { duration: 200 }, () => {
            callback && runOnJS(callback)();
          });
        });
      });
    });
  };

  const handleFail = () => {
    closeCollapse();
    runSwipeAnimation("left", () => {
      if (onFail) runOnJS(onFail)();
    });
  };

  const handleComplete = () => {
    closeCollapse();
    runSwipeAnimation("right", () => {
      if (onComplete) runOnJS(onComplete)();
    });
  };

  const handleFailContextMenu = () => {
    closeCollapse();
    runSwipeAnimation(
      "left",
      () => {
        if (onFail) runOnJS(onFail)();
      },
      600,
    );
  };

  const handleCompleteContextMenu = () => {
    closeCollapse();
    runSwipeAnimation(
      "right",
      () => {
        if (onComplete) runOnJS(onComplete)();
      },
      600,
    );
  };

  const gesturePan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate(({ translationX }) => {
      const resistance = 0.3;
      translateX.value = translationX * resistance;
    })
    .onEnd((e) => {
      const normalizedDrag = translateX.value / collapseWidth.current;
      const absTranslation = Math.abs(translateX.value);
      const absVelocity = Math.abs(e.velocityX);

      const shouldDismissed =
        absTranslation > MIN_SWIPE_DISTANCE &&
        (Math.abs(normalizedDrag) > SWIPE_THRESHOLD ||
          absVelocity > VELOCITY_THRESHOLD);

      if (shouldDismissed) {
        if (translateX.value > 0) {
          runOnJS(handleComplete)();
        } else {
          runOnJS(handleFail)();
        }
      } else {
        console.log("Cancel");
        translateX.value = withSpring(0, {
          damping: 12,
          stiffness: 400,
          velocity: e.velocityX,
        });
      }
    });

  const gestureLongPressCollapse = Gesture.LongPress()
    .minDuration(600)
    .onStart(() => {
      runOnJS(handleLongPressStart)();
      runOnJS(handleAndroidPress)();
    })
    .onFinalize((_, success) => {
      if (!success) {
        runOnJS(handleModalClose)();
      }
    });

  const exclusiveGesture = Gesture.Exclusive(
    gesturePan,
    gestureLongPressCollapse,
  );

  const composedGesture = Gesture.Race(exclusiveGesture, gestureTapCollapse);

  React.useEffect(() => {
    if (androidMenuVisible) {
      updateMenuPosition();
    }
  }, [androidMenuVisible, updateMenuPosition]);

  const animateArrow = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: withSpring(collapsed ? "180deg" : "0deg", {
          duration: 2500,
        }),
      },
    ],
    color: interpolateColor(
      translateX.value,
      [-60, 0, 60],
      ["#fff", "#000", "#000"],
    ),
  }));

  const animateCollapse = useAnimatedStyle(() => {
    const animateHeight = collapsed
      ? withSpring(innerCollapseHeight.value, {
          damping: 20,
          stiffness: 100,
        })
      : withSpring(0);
    const animateMargin = collapsed
      ? withSpring(10, {
          damping: 20,
          stiffness: 100,
        })
      : withSpring(0);
    return {
      opacity: withTiming(collapsed ? 1 : 0),
      height: animateHeight,
      marginVertical: animateMargin,
    };
  });

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scaleValue.value },
        { translateX: translateX.value },
      ],
      opacity: opacity.value,
      backgroundColor: interpolateColor(
        translateX.value,
        [-65, -20, 0, 20, 65],
        ["#F05353", "#fff", "#fff", "#fff", "#53F07D"],
      ),
      height: withSpring(collapseHeight.value + innerCollapseHeight.value, {
        damping: 20,
        stiffness: 100,
      }),
      marginBottom: withSpring(collapseMarginBottom.value, {
        damping: 20,
        stiffness: 100,
      }),
    };
  });

  const animatedContainerPreviewStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scaleValue.value },
        { translateX: translateX.value },
      ],
    };
  });

  const animatedTextStyle = useAnimatedStyle(() => {
    return {
      color: interpolateColor(
        translateX.value,
        [-65, -20, 0, 20, 65],
        ["#fff", "#000", "#000", "#000", "#fff"],
      ),
    };
  });

  const animatedCaptionStyle = useAnimatedStyle(() => {
    return {
      color: interpolateColor(
        translateX.value,
        [-65, -20, 0, 20, 65],
        ["#fff", "#8d8d8d", "#8d8d8d", "#8d8d8d", "#fff"],
      ),
    };
  });

  const animatedInnerCollapseStyle = useAnimatedStyle(() => {
    return {
      paddingBottom: innerCollapsePaddingBottom.value,
    };
  });

  return (
    <>
      <ContextMenu
        visible={androidMenuVisible}
        onClose={handleModalClose}
        anchorPosition={anchorPosition}
        preview={
          <Animated.View
            style={[
              animatedContainerPreviewStyle,
              {
                position: "absolute",
                top: anchorPosition.topLeft.y,
                left: anchorPosition.bottomLeft.x,
                backgroundColor: "#fff",
                borderRadius: 10,
                padding: 16,
                width: "80%",
                alignSelf: "center",
              },
            ]}
          >
            <View style={{ gap: 4, flex: 1, marginRight: 16 }}>
              <Animated.Text
                style={[
                  animatedCaptionStyle,
                  { fontWeight: "300", fontSize: 10 },
                ]}
              >
                {type} {category && ` - ${category}`}
              </Animated.Text>
              <Animated.Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[animatedTextStyle, { fontWeight: "600", fontSize: 14 }]}
              >
                {title}
              </Animated.Text>
            </View>
          </Animated.View>
        }
        items={[
          {
            title: "Completed",
            icon: <Feather name="check" size={16} color={"green"} />,
            type: "default",
            status: "enabled",
            onPress: () => {
              handleModalClose();
              // Use the slower animation for context menu:
              handleCompleteContextMenu && handleCompleteContextMenu();
              // Alternatively, call our new function:
              handleCompleteContextMenu
                ? handleCompleteContextMenu()
                : handleComplete();
              console.log("Completed");
            },
          },
          {
            title: "Failed",
            icon: <Feather name="x" size={16} color={"red"} />,
            type: "default",
            status: "enabled",
            onPress: () => {
              handleModalClose();
              // Use the slower animation for context menu:
              handleFailContextMenu ? handleFailContextMenu() : handleFail();
              console.log("Failed");
            },
          },
          {
            title: "Customize",
            icon: (
              <Feather
                name="edit"
                size={16}
                color={type === "custom" ? "black" : "gray"}
              />
            ),
            type: "default",
            status: type === "custom" ? "enabled" : "disabled",
            onPress: () => {
              handleModalClose();
              onCustomize?.();
              console.log("Customize");
            },
          },
          {
            title: "Delete",
            icon: <Feather name="trash" size={16} color={"red"} />,
            type: "destructive",
            status: "enabled",
            onPress: () => {
              handleModalClose();
              onDelete?.();
              console.log("Delete");
            },
          },
        ]}
      />

      <Animated.View
        collapsable={false}
        style={[
          animatedContainerStyle,
          {
            marginHorizontal: 40,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowRadius: 20,
            shadowOpacity: 0.1,
            elevation: 1,
            borderRadius: 10,
          },
        ]}
      >
        <GestureDetector gesture={composedGesture}>
          <View
            ref={anchorRef}
            onLayout={(e) =>
              (collapseWidth.current = e.nativeEvent.layout.width)
            }
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 16,
            }}
          >
            <View style={{ gap: 4, flex: 1, marginRight: 16 }}>
              <Animated.Text
                style={[
                  animatedCaptionStyle,
                  { fontWeight: "300", fontSize: 10 },
                ]}
              >
                {type} {category && ` - ${category}`}
              </Animated.Text>
              <Animated.Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[animatedTextStyle, { fontWeight: "600", fontSize: 14 }]}
              >
                {title}
              </Animated.Text>
            </View>
            <Animated.View style={[animateArrow]}>
              <Feather name="chevron-down" size={24} color="black" />
            </Animated.View>
          </View>
        </GestureDetector>
        <Animated.View style={[animateCollapse, { overflow: "hidden" }]}>
          <Animated.View
            onLayout={onCollapseLayout}
            style={[
              animatedInnerCollapseStyle,
              {
                position: "absolute",
                paddingHorizontal: 16,
                width: "100%",
                gap: 4,
              },
            ]}
          >
            {children}
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </>
  );
}
