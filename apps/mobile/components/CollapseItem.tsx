import { View, Text, LayoutChangeEvent, Dimensions } from "react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Feather } from "@expo/vector-icons";
import Animated, {
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import ContextMenu from "./ContextMenu";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

export default function CollapseItem({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => {
    const layoutHeight = event.nativeEvent.layout.height;
    setContentHeight(layoutHeight);
  };

  const animatedCollapseStyle = useAnimatedStyle(() => ({
    height: withSpring(collapsed ? contentHeight : 0, {
      damping: 20,
      stiffness: 100,
    }),
    opacity: withSpring(collapsed ? 1 : 0),
    overflow: "hidden",
  }));

  const [androidMenuVisible, setAndroidMenuVisible] = useState(false);
  const scaleValue = useSharedValue(1);
  const lastMeasuredPosition = useRef({
    bottomLeft: { x: 0, y: 0 },
    topLeft: { x: 0, y: 0 },
  });
  const anchorRef = useRef<Animated.View>(null);
  const [anchorPosition, setAnchorPosition] = useState({
    bottomLeft: { x: 0, y: 0 },
    topLeft: { x: 0, y: 0 },
  });

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
    await updateMenuPosition();
    setAndroidMenuVisible(true);
  }, [updateMenuPosition]);

  const gestureTapCollapse = Gesture.Tap().onEnd((_, success) => {
    if (success) {
      description && runOnJS(setCollapsed)(!collapsed);
    }
  });

  const handleLongPressStart = () => {
    scaleValue.value = withSpring(1.1, { damping: 10, stiffness: 100 });
  };

  const handleLongPressEnd = () => {
    setAndroidMenuVisible(true);
  };

  const handleModalClose = useCallback(() => {
    scaleValue.value = withSpring(1, { damping: 10, stiffness: 100 });
    setAndroidMenuVisible(false);
  }, [scaleValue]);

  const gestureLongPressCollapse = Gesture.LongPress()
    .minDuration(600)
    .onStart(() => {
      runOnJS(handleLongPressStart)();
      runOnJS(handleAndroidPress)();
    })
    .onEnd((_, success) => {
      if (success) {
        runOnJS(handleLongPressEnd)();
      }
    });

  const screenWidth = Dimensions.get("window").width;
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const collapseWidth = useRef(0);

  const SWIPE_THRESHOLD = 0.6;
  const VELOCITY_THRESHOLD = 800;
  const MIN_SWIPE_DISTANCE = 60;

  const handleSwipeAnimation = (
    direction: "left" | "right",
    callback?: () => void,
  ) => {
    // Calculate the target position based on current position and screen width
    const currentX = translateX.value;
    const targetX =
      direction === "left"
        ? -screenWidth - Math.abs(currentX)
        : screenWidth + Math.abs(currentX);

    // Animate directly to the target position with fade
    translateX.value = withTiming(
      targetX,
      {
        duration: 300,
      },
      () => {
        opacity.value = withTiming(
          0,
          {
            duration: 200,
          },
          () => {
            callback && runOnJS(callback)();
          },
        );
      },
    );
  };

  const onSwipeLeft = () => {
    console.log("Swiped Left");
  };

  const onSwipeRight = () => {
    console.log("Swiped Right");
  };

  const handleSwipeLeft = () => {
    handleSwipeAnimation("left", onSwipeLeft);
  };

  const handleSwipeRight = () => {
    handleSwipeAnimation("right", onSwipeRight);
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

      const isSignificantSwipe =
        absTranslation > MIN_SWIPE_DISTANCE &&
        (Math.abs(normalizedDrag) > SWIPE_THRESHOLD ||
          absVelocity > VELOCITY_THRESHOLD);

      if (isSignificantSwipe) {
        if (translateX.value > 0) {
          runOnJS(handleSwipeRight)();
        } else {
          runOnJS(handleSwipeLeft)();
        }
      } else {
        // Enhanced cancel animation with bounce effect
        console.log("Cancel");
        translateX.value = withSpring(0, {
          damping: 12,
          stiffness: 400,
          velocity: e.velocityX,
        });
      }
    });

  const composedGesture = Gesture.Exclusive(
    gesturePan,
    gestureTapCollapse,
    gestureLongPressCollapse,
  );

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
        ["#F05353", "#1E1F29", "#1E1F29", "#53F07D"],
      ),
    };
  });

  useEffect(() => {
    if (androidMenuVisible) {
      updateMenuPosition();
    }
  }, [androidMenuVisible, updateMenuPosition]);

  const [taskLayout, setTaskLayout] = useState({ width: 0, height: 0 });
  const onTaskLayout = (e: LayoutChangeEvent) => {
    setTaskLayout({
      width: e.nativeEvent.layout.width,
      height: e.nativeEvent.layout.height,
    });
  };

  return (
    <>
      <ContextMenu
        visible={androidMenuVisible}
        onClose={handleModalClose}
        anchorPosition={anchorPosition}
        preview={
          <Animated.View
            style={[
              animatedContainerStyle,
              {
                width: taskLayout.width,
                position: "absolute",
                top: anchorPosition.topLeft.y,
                left: anchorPosition.bottomLeft.x,
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: "#1E1F29",
                borderRadius: 10,
              },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 14 }}>{title}</Text>
              <View>
                {description && (
                  <Feather
                    name="info"
                    size={16}
                    color={collapsed ? "#fff" : "#8d8d8d"}
                  />
                )}
              </View>
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
              console.log("Completed");
            },
          },
          {
            title: "Failed",
            icon: <Feather name="x" size={16} color={"red"} />,
            type: "default",
            status: "enabled",
            onPress: () => {
              console.log("Failed");
            },
          },
          {
            title: "Reschedule",
            icon: <Feather name="calendar" size={16} color={"black"} />,
            type: "default",
            status: "enabled",
            onPress: () => {
              console.log("Reschedule");
            },
          },
        ]}
      />

      <Animated.View
        onLayout={onTaskLayout}
        collapsable={false}
        style={[
          animatedContainerStyle,
          {
            flex: 1,
            backgroundColor: "#1E1F29",
            borderRadius: 10,
          },
        ]}
      >
        <GestureDetector gesture={composedGesture}>
          <Animated.View
            ref={anchorRef}
            onLayout={(e) =>
              (collapseWidth.current = e.nativeEvent.layout.width)
            }
            style={{
              flexDirection: "row",
              paddingHorizontal: 16,
              paddingVertical: 12,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 14 }}>{title}</Text>
            <View>
              {description && (
                <Feather
                  name="info"
                  size={16}
                  color={collapsed ? "#fff" : "#8d8d8d"}
                />
              )}
            </View>
          </Animated.View>
        </GestureDetector>

        <Animated.View style={[animatedCollapseStyle]}>
          {description && (
            <View
              style={{
                position: "absolute",
                paddingHorizontal: 16,
                paddingBottom: 12,
              }}
              onLayout={onLayout}
            >
              <Text
                style={{
                  color: "#B0B0B0",
                  fontSize: 12,
                }}
              >
                {description}
              </Text>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </>
  );
}
