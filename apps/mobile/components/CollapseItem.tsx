// CollapseItem.tsx
import React, { useState, useRef, useCallback, useEffect } from "react";
import { View, Text, LayoutChangeEvent } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
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
  onReschedule?: () => void;
  onCustomize?: () => void;
};

export default function CollapseItem({
  title,
  description,
  onComplete,
  onFail,
  onReschedule,
  onCustomize,
}: CollapseItemProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [anchorPosition, setAnchorPosition] = useState({
    bottomLeft: { x: 0, y: 0 },
    topLeft: { x: 0, y: 0 },
  });
  const anchorRef = useRef<Animated.View>(null);

  const updateMenuPosition = useCallback(() => {
    return new Promise<void>((resolve) => {
      if (anchorRef.current) {
        anchorRef.current.measure((x, y, width, height, pageX, pageY) => {
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

  useEffect(() => {
    if (collapsed) {
      innerCollapseHeight.value = withTiming(contentHeight, { duration: 200 });
    } else {
      innerCollapseHeight.value = withTiming(0, { duration: 200 });
    }
  }, [collapsed, contentHeight]);

  const {
    composedGesture,
    translateX,
    opacity,
    scaleValue,
    onLayout,
    runSwipeAnimation,
  } = useCollapsibleGesture({
    onToggleCollapse: toggleCollapse,
    onLongPress: () => setContextMenuVisible(true),
    onComplete: onComplete,
    onFail: onFail,
    collapseConfig,
  });

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }, { translateX: translateX.value }],
    opacity: opacity.value,
    backgroundColor: interpolateColor(
      translateX.value,
      [-65, -20, 0, 20, 65],
      ["#F05353", "#1E1F29", "#1E1F29", "#53F07D", "#53F07D"],
    ),
    height: withSpring(containerHeight.value + innerCollapseHeight.value, {
      damping: 20,
      stiffness: 100,
    }),
  }));

  const animatedCollapseStyle = useAnimatedStyle(() => ({
    height: withSpring(containerHeight.value + innerCollapseHeight.value, {
      damping: 20,
      stiffness: 100,
    }),
    opacity: withSpring(collapsed ? 1 : 0),
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
  }, [contextMenuVisible, updateMenuPosition]);

  const collapseContentRef = useRef<Animated.View>(null);

  useEffect(() => {
    if (collapsed) {
      collapseContentRef.current?.measure((_x, _y, _width, height) => {
        innerCollapseHeight.value = withTiming(height, { duration: 200 });
      });
    } else {
      innerCollapseHeight.value = withTiming(0, { duration: 200 });
    }
  }, [collapsed]);

  return (
    <>
      <ContextMenu
        visible={contextMenuVisible}
        onClose={() => setContextMenuVisible(false)}
        anchorPosition={anchorPosition}
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
              setContextMenuVisible(false);
              runSwipeAnimation("right", () => onComplete?.(), 600);
            },
          },
          {
            title: "Failed",
            icon: <Feather name="x" size={16} color={"red"} />,
            type: "default",
            status: "enabled",
            onPress: () => {
              setContextMenuVisible(false);
              runSwipeAnimation("left", () => onFail?.(), 600);
            },
          },
          {
            title: "Reschedule",
            icon: <Feather name="calendar" size={16} color={"black"} />,
            type: "default",
            status: "enabled",
            onPress: () => {
              setContextMenuVisible(false);
              onReschedule?.();
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
