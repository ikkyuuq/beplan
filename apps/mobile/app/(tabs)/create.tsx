import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
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
      owner: "BePlan",
      description:
        "Embark on a transformative journey with Cristiano Ronaldo as your guide. This travel goal is designed to help you break free from the ordinary and explore the world with a refined sense of luxury and adventure. Discover hidden destinations, learn insider travel tips, and gain inspiration to craft your own unforgettable experiences. Whether planning a quick escape or a long vacation, let Cristiano's expertise lead you toward a richer, more adventurous life.",
    },
    {
      title: "Lionel Messi",
      category: "Travel",
      image: "https://picsum.photos/seed/messi/200/300",
      owner: "BePlan",
      description:
        "Inspired by Lionel Messi's passion and creativity, this goal invites you to dive into vibrant cultures and dynamic cityscapes. It’s all about exploring local traditions, savoring culinary delights, and uncovering unique experiences that make every journey memorable. With curated itineraries and practical tips, you’ll transform ordinary trips into epic adventures that resonate with both heart and soul.",
    },
    {
      title: "Neymar Jr",
      category: "Travel",
      image: "https://picsum.photos/seed/neymarjr/200/300",
      owner: "BePlan",
      description:
        "Unleash your adventurous spirit with Neymar Jr’s travel goal. Geared toward thrill-seekers and cultural explorers alike, this goal pushes you to discover exotic locales and embrace new experiences with energy and enthusiasm. Learn how to navigate unfamiliar territories while balancing excitement with practicality, ensuring that every trip becomes a memorable chapter in your travel story.",
    },
    {
      title: "Olivier Giroud",
      category: "Travel",
      image: "https://picsum.photos/seed/giroud/200/300",
      owner: "BePlan",
      description:
        "Experience a harmonious blend of elegance and adventure with Olivier Giroud’s travel goal. Tailored for those who appreciate sophisticated journeys, this goal provides a roadmap to explore luxurious destinations with precision and style. Gain access to exclusive tips, insider recommendations, and curated itineraries that make every adventure a perfect balance of leisure and cultural enrichment.",
    },
  ];

  const communityData = [
    {
      title: "Healthy Living",
      category: "Health",
      description:
        "Healthy Living is more than just a goal—it's a community dedicated to transforming everyday habits into a lifestyle of wellness. This goal empowers you with scientifically-backed nutrition tips, dynamic workout routines, and mindfulness practices that nourish both body and mind. Join us to unlock the secrets of holistic well-being, develop sustainable healthy habits, and become the best version of yourself.",
      image: "https://picsum.photos/seed/health/200/300",
      owner: "John Doe",
    },
    {
      title: "Be Better Than Messi",
      category: "Workout",
      description:
        "Set your sights on peak performance with the 'Be Better Than Messi' workout goal. This dynamic challenge is designed to push your limits through high-energy training routines, competitive challenges, and motivational community support. Whether you’re building strength, agility, or endurance, this goal inspires you to surpass your personal bests and redefine what you thought was possible in your fitness journey.",
      image: "https://picsum.photos/seed/better_messi/200/300",
      owner: "Jane Doe",
    },
    {
      title: "One Punch Man",
      category: "Workout",
      description:
        "Inspired by the unstoppable energy of anime heroes, the 'One Punch Man' workout goal challenges you to maximize impact with every session. Built around high-intensity interval training and power-packed exercises, this goal transforms your workout routine into an epic quest for strength and endurance. Embrace a philosophy of efficiency and relentless progress as you join a community of fighters dedicated to breaking barriers and achieving extraordinary results.",
      image: "https://picsum.photos/seed/anime/200/300",
      owner: "John Doe",
    },
  ];

  return (
    <View style={{ flex: 1 }}>
      <Header>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Text style={{ fontSize: 32, fontWeight: "bold", color: "white" }}>
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
          paddingBottom: Platform.OS === "ios" ? 180 : 200,
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
    </View>
  );
}
