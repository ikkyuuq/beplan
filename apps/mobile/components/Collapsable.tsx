import React, { useState, useRef, useCallback, useEffect } from "react";
import { View, LayoutChangeEvent } from "react-native";
import { MOTION } from "@/constants/motion";
import Animated, {
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  useSharedValue,
  runOnJS,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { GestureDetector } from "react-native-gesture-handler";
import ContextMenu from "./ContextMenu";
import {
  useCollapsibleGesture,
  CollapseConfig,
} from "../hooks/useCollapsibleGesture";

type CollapsableProps = {
  title: string;
  type?: string;
  category?: string;
  children: React.ReactNode;
  onComplete?: () => void;
  onFail?: () => void;
  onDelete?: () => void;
  onCustomize?: () => void;
  onCollapseFinish?: () => void;
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
  onCollapseFinish,
}: CollapsableProps) {
  const INITIAL_CONTAINER_HEIGHT = 70;
  const [collapsed, setCollapsed] = useState(false);

  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [anchorPosition, setAnchorPosition] = useState({
    bottomLeft: { x: 0, y: 0 },
    topLeft: { x: 0, y: 0 },
  });
  const anchorRef = useRef<any>(null);
  const containerWidth = useRef(0);
  const collapseContentRef = useRef<any>(null);

  const containerHeight = useSharedValue(INITIAL_CONTAINER_HEIGHT);
  const collapseMarginBottom = useSharedValue(10);
  const innerCollapseHeight = useSharedValue(0);
  const innerCollapsePaddingBottom = useSharedValue(24);

  const collapseConfig: CollapseConfig = {
    collapsed,
    setCollapsed,
    containerHeight,
    collapseMarginBottom,
    innerCollapseHeight,
    innerCollapsePaddingBottom,
  };

  const updateMenuPosition = useCallback(() => {
    return new Promise<void>((resolve) => {
      if (anchorRef.current) {
        anchorRef.current.measure((x: any, y: any, width: any, height: any, pageX: any, pageY: any) => {
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

  const toggleCollapse = () => {
    setCollapsed((prev) => !prev);
  };

  const handleContextMenuOpen = useCallback(() => {
    setContextMenuVisible(true);
  }, []);

  const {
    composedGesture,
    translateX,
    opacity,
    scaleValue,
    onLayout,
    runSwipeAnimation,
  } = useCollapsibleGesture({
    onComplete: () => onComplete && onComplete(),
    onFail: () => onFail && onFail(),
    onToggleCollapse: toggleCollapse,
    onLongPress: handleContextMenuOpen,
    collapseConfig,
  });

  const handleContextMenuClose = useCallback(() => {
    setContextMenuVisible(false);
    scaleValue.value = withTiming(1, MOTION.fast);
  }, [scaleValue]);

  useEffect(() => {
    if (contextMenuVisible) {
      updateMenuPosition();
    }
  }, [contextMenuVisible, updateMenuPosition]);

  // 0 = tasks hidden, 1 = shown. One value drives the tasks' fade and spacing,
  // animated together with the height below.
  const expandProgress = useSharedValue(0);

  useEffect(() => {
    expandProgress.value = withTiming(collapsed ? 1 : 0, MOTION.base);
    if (collapsed) {
      collapseContentRef.current?.measure((_x: any, _y: any, _width: any, height: any) => {
        innerCollapseHeight.value = withTiming(height, MOTION.base);
      });
    } else {
      innerCollapseHeight.value = withTiming(0, MOTION.base);
    }
  }, [collapsed]);

  // When the last task is gone, fade the whole card out while it shrinks.
  // Only the height used to animate, and the card doesn't clip its content, so
  // the white background vanished while the title and arrow lingered until the
  // goal was removed. Height and margin now collapse together, and the goal is
  // removed as soon as the height has settled.
  useEffect(() => {
    if (React.Children.count(children) === 0) {
      setCollapsed(false);
      opacity.set(withTiming(0, { duration: 200 }));
      collapseMarginBottom.set(withTiming(0, MOTION.base));
      containerHeight.set(
        withTiming(
          0,
          MOTION.base,
          (finished) => {
          if (finished && onCollapseFinish) {
            runOnJS(onCollapseFinish)();
          }
        },
        )
      );
    }
  }, [children]);

  const animateArrow = useAnimatedStyle(() => ({
    transform: [
      {
        // Quick, non-bouncy turn (was a 2.5 s spring).
        rotate: withTiming(collapsed ? "180deg" : "0deg", MOTION.fast),
      },
    ],
    color: interpolateColor(
      translateX.value,
      [-60, 0, 60],
      ["#fff", "#000", "#000"]
    ),
  }));

  // Styles read animated values directly: wrapping them in another withTiming
  // restarted an animation every frame and made the motion stutter.
  const animateCollapse = useAnimatedStyle(() => ({
    height: innerCollapseHeight.value,
    opacity: expandProgress.value,
    marginVertical: 10 * expandProgress.value,
  }));

  const animateInnerCollapseStyle = useAnimatedStyle(() => ({
    paddingBottom: innerCollapsePaddingBottom.value,
  }));

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }, { translateX: translateX.value }],
    opacity: opacity.value,
    backgroundColor: interpolateColor(
      translateX.value,
      [-65, -20, 0, 20, 65],
      ["#F05353", "#fff", "#fff", "#fff", "#53F07D"]
    ),
    height: containerHeight.value + innerCollapseHeight.value,
    marginBottom: collapseMarginBottom.value,
  }));

  const animatedContainerPreviewStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }, { translateX: translateX.value }],
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      translateX.value,
      [-65, -20, 0, 20, 65],
      ["#fff", "#000", "#000", "#000", "#fff"]
    ),
  }));

  const animatedCaptionStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      translateX.value,
      [-65, -20, 0, 20, 65],
      ["#fff", "#8d8d8d", "#8d8d8d", "#8d8d8d", "#fff"]
    ),
  }));

  const [containerLayout, setContainerLayout] = useState({
    width: 0,
    height: 0,
  });
  const onContainerLayout = (e: LayoutChangeEvent) => {
    setContainerLayout({
      width: e.nativeEvent.layout.width,
      height: e.nativeEvent.layout.height,
    });
    onLayout(e);
  };

  const handleCompleteContextMenu = () => {
    runSwipeAnimation(
      "right",
      () => {
        onComplete?.();
      },
      600
    );
  };
  const handleFailContextMenu = () => {
    runSwipeAnimation(
      "left",
      () => {
        onFail?.();
      },
      600
    );
  };
  const handleCustomizeContextMenu = () => {
    handleContextMenuClose();
    onCustomize?.();
  };

  return (
    <>
      <ContextMenu
        visible={contextMenuVisible}
        onClose={handleContextMenuClose}
        anchorPosition={anchorPosition}
        preview={
          <Animated.View
            style={[
              animatedContainerPreviewStyle,
              {
                width: containerLayout.width,
                position: "absolute",
                top: anchorPosition.topLeft.y,
                left: anchorPosition.bottomLeft.x,
                backgroundColor: "#fff",
                borderRadius: 10,
                padding: 16,
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
              handleContextMenuClose();
              handleCompleteContextMenu();
            },
          },
          {
            title: "Failed",
            icon: <Feather name="x" size={16} color={"red"} />,
            type: "default",
            status: "enabled",
            onPress: () => {
              handleContextMenuClose();
              handleFailContextMenu();
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
            status: "enabled",
            onPress: () => {
              handleCustomizeContextMenu();
            },
          },
          {
            title: "Delete",
            icon: <Feather name="trash" size={16} color={"red"} />,
            type: "destructive",
            status: "enabled",
            onPress: () => {
              handleContextMenuClose();
              onDelete?.();
            },
          },
        ]}
      />

      <Animated.View
        collapsable={false}
        onLayout={onContainerLayout}
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
            onLayout={(e) => {
              containerWidth.current = e.nativeEvent.layout.width;
            }}
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
            <Animated.View style={animateArrow}>
              <Feather name="chevron-down" size={24} color="black" />
            </Animated.View>
          </View>
        </GestureDetector>
        <Animated.View style={[animateCollapse, { overflow: "hidden" }]}>
          <Animated.View
            onLayout={(e) => {
              // Tasks added/removed while open: animate to the new height
              // (now that styles no longer smooth instant changes).
              if (collapsed) {
                innerCollapseHeight.value = withTiming(
                  e.nativeEvent.layout.height,
                  MOTION.base
                );
              }
            }}
            ref={collapseContentRef}
            style={[
              animateInnerCollapseStyle,
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
