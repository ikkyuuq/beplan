import {
  View,
  Text,
  Modal,
  Pressable,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  Animated,
} from "react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { BlurView } from "@react-native-community/blur";
import CalendarPicker from "./CalendarPicker";
import { SharedValue } from "react-native-reanimated";

type ContextItemProps = {
  title: string;
  icon?: React.ReactNode;
  type: "default" | "destructive";
  status: "enabled" | "disabled";
  onPress: () => void;
};

type ContextMenuProps = {
  visible: boolean;
  anchorPosition: {
    bottomLeft: { x: number; y: number };
    topLeft: { x: number; y: number };
  };
  preview: React.ReactElement;
  items: ContextItemProps[];
  rescheduleVisible?: boolean;
  onRescheduleConfirm?: (date: string) => void;
  onClose: () => void;
  setRescheduleVisible?: (val: boolean) => void;
};

export default function ContextMenu({
  visible,
  anchorPosition,
  preview,
  items,
  rescheduleVisible,
  onRescheduleConfirm,
  onClose,
  setRescheduleVisible,
}: ContextMenuProps) {
  const { height: screenHeight } = Dimensions.get("window");
  const [menuHeight, setMenuHeight] = useState(0);
  const contextMenuRef = useRef<View>(null);
  const [position, setPosition] = useState({
    x: anchorPosition.bottomLeft.x,
    y: anchorPosition.bottomLeft.y + 10,
  });

  const calculatePosition = useCallback(() => {
    const wouldOverflowAtBottom =
      anchorPosition.bottomLeft.y + menuHeight + 70 > screenHeight;

    if (wouldOverflowAtBottom) {
      setPosition({
        x: anchorPosition.topLeft.x,
        y: anchorPosition.topLeft.y - menuHeight - 10,
      });
    } else {
      setPosition({
        x: anchorPosition.bottomLeft.x,
        y: anchorPosition.bottomLeft.y + 10,
      });
    }
  }, [anchorPosition, menuHeight, screenHeight]);

  useEffect(() => {
    if (menuHeight > 0) {
      calculatePosition();
    }
  }, [calculatePosition, menuHeight]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <CalendarPicker
        title="Reschedule Task"
        visible={rescheduleVisible || false}
        singleSelect={true}
        onClose={() => setRescheduleVisible?.(false)}
        onConfirm={(date) => {
          onRescheduleConfirm?.(date[0]);
        }}
      />
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <BlurView style={{ flex: 1 }} blurAmount={10} blurType="dark">
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </BlurView>

        {preview}

        <Animated.View
          ref={contextMenuRef}
          onLayout={(event) => {
            setMenuHeight(event.nativeEvent.layout.height);
          }}
          style={{
            position: "absolute",
            backgroundColor: "white",
            minWidth: 200,
            top: position.y,
            left: position.x,
            borderRadius: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          {items.map((menuItem, index) => (
            <TouchableOpacity
              key={menuItem.title}
              disabled={menuItem.status === "disabled"}
              onPress={menuItem.onPress}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottomWidth: index < items.length - 1 ? 0.2 : 0,
                borderBottomColor: "gray",
              }}
            >
              <Text
                style={{
                  color:
                    menuItem.type === "destructive"
                      ? "red"
                      : menuItem.status === "disabled"
                        ? "gray"
                        : "black",
                }}
              >
                {menuItem.title}
              </Text>
              {menuItem.icon}
            </TouchableOpacity>
          ))}
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
}
