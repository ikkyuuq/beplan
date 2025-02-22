import React, { useState, useRef, useCallback, useEffect } from "react";
import { View, LayoutChangeEvent } from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  useSharedValue,
  withSpring,
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
  const anchorRef = useRef<Animated.View>(null);
  const containerWidth = useRef(0);
  const collapseContentRef = useRef<Animated.View>(null);

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
    scaleValue.value = withSpring(1, { damping: 20, stiffness: 100 });
  }, [scaleValue]);

  useEffect(() => {
    if (contextMenuVisible) {
      updateMenuPosition();
    }
  }, [contextMenuVisible, updateMenuPosition]);

  useEffect(() => {
    if (collapsed) {
      collapseContentRef.current?.measure((_x, _y, _width, height) => {
        innerCollapseHeight.value = withTiming(height, { duration: 200 });
      });
    } else {
      innerCollapseHeight.value = withTiming(0, { duration: 200 });
    }
  }, [collapsed]);

  useEffect(() => {
    if (React.Children.count(children) === 0) {
      setCollapsed(false);
      containerHeight.value = withSpring(
        0,
        { damping: 20, stiffness: 100 },
        (finished) => {
          if (finished) {
            collapseMarginBottom.value = withSpring(
              0,
              {
                damping: 20,
                stiffness: 100,
              },
              (finished) => {
                if (finished && onCollapseFinish) {
                  runOnJS(onCollapseFinish)();
                }
              },
            );
          }
        },
      );
    }
  }, [children]);

  const animateArrow = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: withSpring(collapsed ? "180deg" : "0deg", { duration: 2500 }),
      },
    ],
    color: interpolateColor(
      translateX.value,
      [-60, 0, 60],
      ["#fff", "#000", "#000"],
    ),
  }));

  const animateCollapse = useAnimatedStyle(() => {
    const marginValue = collapsed
      ? withSpring(10, { damping: 20, stiffness: 100 })
      : withSpring(0);
    return {
      height: withSpring(innerCollapseHeight.value, {
        damping: 20,
        stiffness: 100,
      }),
      opacity: withTiming(collapsed ? 1 : 0),
      marginVertical: marginValue,
    };
  });

  const animateInnerCollapseStyle = useAnimatedStyle(() => ({
    paddingBottom: withSpring(innerCollapsePaddingBottom.value, {
      damping: 20,
      stiffness: 100,
    }),
  }));

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }, { translateX: translateX.value }],
    opacity: opacity.value,
    backgroundColor: interpolateColor(
      translateX.value,
      [-65, -20, 0, 20, 65],
      ["#F05353", "#fff", "#fff", "#fff", "#53F07D"],
    ),
    height: withSpring(containerHeight.value + innerCollapseHeight.value, {
      damping: 20,
      stiffness: 100,
    }),
    marginBottom: withSpring(collapseMarginBottom.value, {
      damping: 20,
      stiffness: 100,
    }),
  }));

  const animatedContainerPreviewStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }, { translateX: translateX.value }],
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      translateX.value,
      [-65, -20, 0, 20, 65],
      ["#fff", "#000", "#000", "#000", "#fff"],
    ),
  }));

  const animatedCaptionStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      translateX.value,
      [-65, -20, 0, 20, 65],
      ["#fff", "#8d8d8d", "#8d8d8d", "#8d8d8d", "#fff"],
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
      600,
    );
  };
  const handleFailContextMenu = () => {
    runSwipeAnimation(
      "left",
      () => {
        onFail?.();
      },
      600,
    );
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
            status: type === "custom" ? "enabled" : "disabled",
            onPress: () => {
              handleContextMenuClose();
              onCustomize?.();
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
        <Animated.View style={[animateCollapse]}>
          <Animated.View
            onLayout={(e) => {
              if (collapsed) {
                innerCollapseHeight.value = e.nativeEvent.layout.height;
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
