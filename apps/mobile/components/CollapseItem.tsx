// CollapseItem.tsx
import React, { useState, useRef, useCallback, useEffect } from "react";
import { View, Text, LayoutChangeEvent } from "react-native";
import { MOTION } from "@/constants/motion";
import Animated, {
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  useSharedValue,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { GestureDetector } from "react-native-gesture-handler";
import ContextMenu from "./ContextMenu";
import {
  useCollapsibleGesture,
  CollapseConfig,
} from "../hooks/useCollapsibleGesture";

type CollapseItemProps = {
  title: string;
  description?: string;
  onComplete?: () => void;
  onFail?: () => void;
  onReschedule?: (date: string) => void;
  onCustomize?: () => void;
  /** false for future days: no swipe, Completed/Failed disabled in the menu. */
  markable?: boolean;
};

export default function CollapseItem({
  title,
  description,
  onComplete,
  onFail,
  onReschedule,
  onCustomize,
  markable = true,
}: CollapseItemProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [anchorPosition, setAnchorPosition] = useState({
    bottomLeft: { x: 0, y: 0 },
    topLeft: { x: 0, y: 0 },
  });
  const anchorRef = useRef<any>(null);

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

  const containerHeight = useSharedValue(45);
  const collapseMarginBottom = useSharedValue(10);
  const innerCollapseHeight = useSharedValue(0);
  const innerCollapsePaddingBottom = useSharedValue(12);
  // 0 = description hidden, 1 = shown. Drives the description fade so it moves
  // in step with the height (same timing, same source).
  const descriptionProgress = useSharedValue(0);

  const collapseConfig: CollapseConfig = {
    collapsed,
    setCollapsed,
    containerHeight,
    collapseMarginBottom,
    innerCollapseHeight,
    innerCollapsePaddingBottom,
  };

  const onLayoutContent = (event: LayoutChangeEvent) => {
    setContentHeight(event.nativeEvent.layout.height);
  };

  // The single place that animates the description open/closed. (A second,
  // measure()-based effect used to animate the same value at the same time.)
  useEffect(() => {
    innerCollapseHeight.value = withTiming(collapsed ? contentHeight : 0, MOTION.base);
    descriptionProgress.value = withTiming(collapsed ? 1 : 0, MOTION.base);
  }, [collapsed, contentHeight]);

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
    onToggleCollapse: toggleCollapse,
    onLongPress: () => handleContextMenuOpen(),
    onComplete: onComplete,
    onFail: onFail,
    collapseConfig,
    swipeEnabled: markable,
  });

  const handleContextMenuClose = useCallback(() => {
    setContextMenuVisible(false);
    scaleValue.value = withTiming(1, MOTION.fast);
  }, [scaleValue]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }, { translateX: translateX.value }],
    opacity: opacity.value,
    backgroundColor: interpolateColor(
      translateX.value,
      [-65, -20, 0, 20, 65],
      ["#F05353", "#1E1F29", "#1E1F29", "#53F07D", "#53F07D"],
    ),
    // Read the animated values directly: wrapping them in another withTiming
    // restarted an animation every frame and made the motion stutter.
    height: containerHeight.value + innerCollapseHeight.value,
  }));

  const animatedCollapseStyle = useAnimatedStyle(() => ({
    height: innerCollapseHeight.value,
    opacity: descriptionProgress.value,
    overflow: "hidden",
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

  useEffect(() => {
    if (contextMenuVisible) {
      updateMenuPosition();
    }
  }, [contextMenuVisible, updateMenuPosition, onReschedule]);

  const collapseContentRef = useRef<any>(null);


  const [rescheduleVisible, setRescheduleVisible] = useState(false);

  return (
    <>
      <ContextMenu
        visible={contextMenuVisible}
        onClose={handleContextMenuClose}
        anchorPosition={anchorPosition}
        rescheduleVisible={rescheduleVisible}
        setRescheduleVisible={setRescheduleVisible}
        onRescheduleConfirm={(date: string) => {
          onReschedule?.(date);
        }}
        preview={
          <Animated.View
            style={[
              animatedContainerStyle,
              {
                width: containerLayout.width,
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
                {!!description && (
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
            status: markable ? "enabled" : "disabled",
            onPress: () => {
              handleContextMenuClose();
              runSwipeAnimation("right", () => onComplete?.(), 600);
            },
          },
          {
            title: "Failed",
            icon: <Feather name="x" size={16} color={"red"} />,
            type: "default",
            status: markable ? "enabled" : "disabled",
            onPress: () => {
              handleContextMenuClose();
              runSwipeAnimation("left", () => onFail?.(), 600);
            },
          },
          {
            title: "Reschedule",
            icon: <Feather name="calendar" size={16} color={"black"} />,
            type: "default",
            status: "enabled",
            onPress: () => {
              handleContextMenuClose();
              setRescheduleVisible(true);
            },
          },
        ]}
      />
      <Animated.View
        onLayout={onContainerLayout}
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
              {!!description && (
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
          {!!description && (
            <Animated.View
              ref={collapseContentRef}
              style={{
                position: "absolute",
                paddingHorizontal: 16,
                paddingBottom: 12,
              }}
              onLayout={onLayoutContent}
            >
              <Text style={{ color: "#B0B0B0", fontSize: 12 }}>
                {description}
              </Text>
            </Animated.View>
          )}
        </Animated.View>
      </Animated.View>
    </>
  );
}
