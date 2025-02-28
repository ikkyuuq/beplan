import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  StyleSheet,
} from "react-native";
import Header from "@/components/Header";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Slider from "@/components/Slider";
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Template } from "@/types/templateTypes";
import TemplateModal from "@/components/TemplateModal";
import Animated from "react-native-reanimated";

// ====================== Main Component ======================
export default function CreateScreen() {
  // ====================== Animation Values ======================
  const scale = useSharedValue(1);
  
  // ====================== State Management ======================
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  // ====================== Animation Setup ======================
  useEffect(() => {
    // ลดการขยายจาก 1.1 เป็น 1.03 เพื่อให้การย่อขยายน้อยลง
    scale.value = withRepeat(
      withTiming(1.03, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // ====================== Mock Data ======================
  // Mock goals data for the modal
  const mockGoals = [
    { id: "goal_001", title: "Visit 5 countries" },
    { id: "goal_002", title: "Learn a new language" },
    { id: "goal_003", title: "Travel to SE Asia" },
    { id: "goal_004", title: "Try local cuisines" },
    { id: "goal_005", title: "Meet new people" },
  ];

  // Template data
  const templateData = [
    {
      title: "Cristiano Ronaldo",
      category: "Travel",
      description: "Embark on a transformative journey with Cristiano Ronaldo as your guide. This travel goal is designed to help you break free from the ordinary and explore the world with a refined sense of luxury and adventure. Discover hidden destinations, learn insider travel tips, and gain inspiration to craft your own unforgettable experiences. Whether planning a quick escape or a long vacation, let Cristiano's expertise lead you toward a richer, more adventurous life.",
      image: "https://picsum.photos/seed/ronaldo/200/300",
      owner: "BePlan",
      goals_id: ["goal_001", "goal_002"]
    },
    {
      title: "Lionel Messi",
      category: "Travel",
      description: "Inspired by Lionel Messi's passion and creativity, this goal invites you to dive into vibrant cultures and dynamic cityscapes. It's all about exploring local traditions, savoring culinary delights, and uncovering unique experiences that make every journey memorable. With curated itineraries and practical tips, you'll transform ordinary trips into epic adventures that resonate with both heart and soul.",
      image: "https://picsum.photos/seed/messi/200/300",
      owner: "BePlan",
      goals_id: ["goal_001", "goal_003"]
    },
    {
      title: "Neymar Jr",
      category: "Travel",
      description: "Unleash your adventurous spirit with Neymar Jr's travel goal. Geared toward thrill-seekers and cultural explorers alike, this goal pushes you to discover exotic locales and embrace new experiences with energy and enthusiasm. Learn how to navigate unfamiliar territories while balancing excitement with practicality, ensuring that every trip becomes a memorable chapter in your travel story.",
      image: "https://picsum.photos/seed/neymarjr/200/300",
      owner: "BePlan",
      goals_id: ["goal_002", "goal_004"]
    },
    {
      title: "Olivier Giroud",
      category: "Travel",
      description: "Experience a harmonious blend of elegance and adventure with Olivier Giroud's travel goal. Tailored for those who appreciate sophisticated journeys, this goal provides a roadmap to explore luxurious destinations with precision and style. Gain access to exclusive tips, insider recommendations, and curated itineraries that make every adventure a perfect balance of leisure and cultural enrichment.",
      image: "https://picsum.photos/seed/giroud/200/300",
      owner: "BePlan",
      goals_id: ["goal_001", "goal_005"]
    },
  ];

  // Community data
  const communityData = [
    {
      title: "Healthy Living",
      category: "Health",
      description: "Healthy Living is more than just a goal—it's a community dedicated to transforming everyday habits into a lifestyle of wellness. This goal empowers you with scientifically-backed nutrition tips, dynamic workout routines, and mindfulness practices that nourish both body and mind. Join us to unlock the secrets of holistic well-being, develop sustainable healthy habits, and become the best version of yourself.",
      image: "https://picsum.photos/seed/health/200/300",
      owner: "John Doe",
      goals_id: ["goal_001", "goal_002"]
    },
    {
      title: "Be Better Than Messi",
      category: "Workout",
      description: "Set your sights on peak performance with the 'Be Better Than Messi' workout goal. This dynamic challenge is designed to push your limits through high-energy training routines, competitive challenges, and motivational community support. Whether you're building strength, agility, or endurance, this goal inspires you to surpass your personal bests and redefine what you thought was possible in your fitness journey.",
      image: "https://picsum.photos/seed/better_messi/200/300",
      owner: "Jane Doe",
      goals_id: ["goal_002", "goal_003"]
    },
    {
      title: "One Punch Man",
      category: "Workout",
      description: "Inspired by the unstoppable energy of anime heroes, the 'One Punch Man' workout goal challenges you to maximize impact with every session. Built around high-intensity interval training and power-packed exercises, this goal transforms your workout routine into an epic quest for strength and endurance. Embrace a philosophy of efficiency and relentless progress as you join a community of fighters dedicated to breaking barriers and achieving extraordinary results.",
      image: "https://picsum.photos/seed/anime/200/300",
      owner: "John Doe",
      goals_id: ["goal_003", "goal_004"]
    },
  ];

  // ====================== Template Handlers ======================
  const handleTemplateSelect = (template: any) => {
    // Convert the template to match the Template type
    const selectedTemplate: Template = {
      title: template.title,
      description: template.description,
      category: template.category,
      image: template.image,
      isFavorite: false, // Default value
      goals_id: template.goals_id || []
    };
    
    setSelectedTemplate(selectedTemplate);
    setModalVisible(true);
  };

  // ====================== Navigation Handlers ======================
  const handleCreateCustomGoal = () => {
    router.push("/customGoal");
  };

  // ====================== Render UI ======================
  return (
    <View style={styles.container}>
      {/* Header Section */}
      <Header>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerText}>
            Let's we help you make your dream come true.
          </Text>
        </View>
        
        {/* Search Input */}
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons
            name="robot-excited-outline"
            size={24}
            color="#b7b7b7"
          />
          <TextInput
            numberOfLines={1}
            placeholder="Save $2000 for a trip to Thailand within 1 month"
            placeholderTextColor="#b7b7b7"
            style={styles.searchInput}
          />
          <TouchableOpacity>
            <MaterialCommunityIcons
              name="microphone-outline"
              size={24}
              color="#b7b7b7"
            />
          </TouchableOpacity>
        </View>
        
        {/* Custom Goal Button */}
        <View style={styles.customGoalButtonContainer}>
          <Animated.View style={animatedStyle}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.customGoalButton}
              onPress={handleCreateCustomGoal}
            >
              <MaterialCommunityIcons name="home-plus" size={18} color="#16171F" style={styles.buttonIcon} />
              <Text style={styles.customGoalButtonText}>
                Build Your Own
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Header>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
      >
        {/* Template Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <MaterialCommunityIcons name="book-open-page-variant" size={24} color="black" />
              <Text style={styles.sectionTitle}>Template</Text>
            </View>
          </View>
          <Slider 
            data={templateData} 
            onCardPress={handleTemplateSelect}
          />
        </View>
        
        {/* Most Popular Community Template */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <MaterialCommunityIcons name="heart" size={24} />
              <Text style={styles.sectionTitle}>
                Most Popular
              </Text>
            </View>
          </View>
          <Slider 
            data={communityData} 
            onCardPress={handleTemplateSelect}
          />
        </View>
      </ScrollView>

      {/* Template Modal */}
      <TemplateModal
        visible={isModalVisible}
        template={selectedTemplate}
        onClose={() => setModalVisible(false)}
        onSelect={() => {
          console.log("Template selected:", selectedTemplate?.title);
          setModalVisible(false);
        }}
        goals={mockGoals}
      />
    </View>
  );
}

// ====================== Styles ======================
const styles = StyleSheet.create({
  // Main Layout
  container: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },
  scrollContent: {
    paddingBottom: Platform.OS === "ios" ? 100 : 120,
    marginTop: 20,
    marginBottom: 20,
    gap: 20,
  },
  
  // Header Styles
  headerTextContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  headerText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
  },
  
  // Search Styles
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 16 : 8,
    borderRadius: 20,
  },
  searchInput: {
    flex: 1,
  },
  
  // Custom Goal Button Styles
  customGoalButtonContainer: {
    alignItems: "center",
  },
  customGoalButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  buttonIcon: {
    color: "#FFF",
    marginRight: 8,
  },
  customGoalButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 16,
  },
  
  // Section Styles
  sectionContainer: {
    gap: 16,
  },
  sectionHeader: {
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 25,
    flexDirection: "row",
  },
  sectionTitleContainer: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
});