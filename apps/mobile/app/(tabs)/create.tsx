import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform,
  Animated,
} from "react-native";
import Header from "@/components/Header";
import { AntDesign, MaterialCommunityIcons } from "@expo/vector-icons";
import Slider from "@/components/Slider";
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";
import { router } from "expo-router";
import { routes } from "@/routesConfig";

export default function CreateScreen() {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.5, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });
  const templateData = [
    {
      title: "Cristiano Ronaldo",
      category: "Travel",
      image: "https://picsum.photos/seed/ronaldo/200/300",
    },
    {
      title: "Lionel Messi",
      category: "Travel",
      image: "https://picsum.photos/seed/messi/200/300",
    },
    {
      title: "Neymar Jr",
      category: "Travel",
      image: "https://picsum.photos/seed/neymarjr/200/300",
    },
    {
      title: "Olivier Giroud",
      category: "Travel",
      image: "https://picsum.photos/seed/giroud/200/300",
    },
  ];

  const communityData = [
    {
      title: "Healthy Living",
      category: "Health",
      image: "https://picsum.photos/seed/health/200/300",
    },
    {
      title: "Be Better Than Messi",
      category: "Workout",
      image: "https://picsum.photos/seed/better_messi/200/300",
    },
    {
      title: "One punch man",
      category: "Workout",
      image: "https://picsum.photos/seed/anime/200/300",
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Header>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Text style={{ fontSize: 36, fontWeight: "bold", color: "white" }}>
            Let's we help you make your dream come true.
          </Text>
        </View>
        {/* Inputbar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: "white",
            paddingHorizontal: 16,
            paddingVertical: Platform.OS === "ios" ? 16 : 8,
            borderRadius: 20,
          }}
        >
          <MaterialCommunityIcons
            name="robot-excited-outline"
            size={24}
            color="#b7b7b7"
          />
          <TextInput
            numberOfLines={1}
            placeholder="Save $2000 for a trip to Thailand within 1 month"
            placeholderTextColor="#b7b7b7"
            style={{ flex: 1 }}
          />
          <TouchableOpacity>
            <MaterialCommunityIcons
              name="microphone-outline"
              size={24}
              color="#b7b7b7"
            />
          </TouchableOpacity>
        </View>
      </Header>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: Platform.OS === "ios" ? 150 : 200,
          marginTop: 20,
          marginBottom: 20,
          gap: 20,
        }}
      >
        {/* Template Section */}
        <View style={{ gap: 16 }}>
          <View
            style={{
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 25,
              flexDirection: "row",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                gap: 10,
                alignItems: "center",
              }}
            >
              <AntDesign name="appstore1" size={24} color="black" />
              <Text style={{ fontSize: 20, fontWeight: "bold" }}>Template</Text>
            </View>
          </View>
          <Slider data={templateData} />
        </View>
        {/* Most Popular Community Template */}
        <View style={{ gap: 16 }}>
          <View
            style={{
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 25,
              flexDirection: "row",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                gap: 10,
                alignItems: "center",
              }}
            >
              <AntDesign name="heart" size={24} color="coral" />
              <Text style={{ fontSize: 20, fontWeight: "bold" }}>
                Most Popular
              </Text>
            </View>
          </View>
          <Slider data={communityData} />
        </View>
      </ScrollView>

      {/* Floating Button */}
      <View
        style={{
          position: "absolute",
          bottom: 120,
          left: 0,
          right: 0,
          alignItems: "center",
        }}
      >
        <Animated.View style={[animatedStyle]}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 5 },
              shadowOpacity: 0.3,
              shadowRadius: 5,
              elevation: 5,
              backgroundColor: "black",
              paddingVertical: 14,
              paddingHorizontal: 28,
              borderRadius: 25,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
            onPress={() => {
              router.push("/customGoal");
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              Build Your Own
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
