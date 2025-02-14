import {
  View,
  Text,
  TouchableWithoutFeedback,
  ActionSheetIOS,
  Alert,
} from "react-native";
import React, { useState } from "react";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing"; 


export default function Collapsable({
  children,
  goalTitle,
  startDate,  
  dueDate,    
  onRemove,
}: {
  children: React.ReactNode;
  goalTitle: string;
  startDate: string; 
  dueDate: string;  
  onRemove: () => void;
}) {

  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  const shareGoal = async () => {
    try {
      await Sharing.shareAsync("https://beplan.app/share/" + encodeURIComponent(goalTitle), {
        dialogTitle: "Share your goal",
        mimeType: "text/plain",
        UTI: "public.plain-text",
      });
    } catch (error) {
      Alert.alert("Error", "Cannot share goal.");
    }
  };

  return (
    <View
      style={{
        marginHorizontal: 40,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 20,
        shadowOpacity: 0.1,
        elevation: 1,
        backgroundColor: "#fff",
        borderRadius: 10,
      }}
    >
      <TouchableWithoutFeedback onPress={toggleCollapse}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 16,
          }}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: "#8d8d8d", fontWeight: "thin", fontSize: 10 }}>
              SMART Goal:
            </Text>
            <Text numberOfLines={1} ellipsizeMode="tail" style={{ color: "#000", fontWeight: "bold", fontSize: 14, flexShrink: 1 }}>
              {goalTitle}
            </Text>
          </View>
          <Animated.View>
            <Feather name="chevron-down" size={24} color="black" />
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
      <Animated.View style={{ height: collapsed ? "auto" : 0, overflow: "hidden" }}>
        <View style={{ paddingBottom: 10, paddingHorizontal: 16, gap: 12 }}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
}
