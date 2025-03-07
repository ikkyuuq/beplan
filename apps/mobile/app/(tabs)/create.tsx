import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Image,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import Header from "@/components/Header";
import Slider from "@/components/Slider";
import Modal from "react-native-modal";
import { LinearGradient } from "expo-linear-gradient";
import { Template } from "@/types/templateTypes";
import TemplateModal from "@/components/TemplateModal";

// ====================== Main Component ======================
export default function CreateScreen() {
  // ====================== Animation Values ======================
  const headerOpacity = useSharedValue(0);
  const searchInputOpacity = useSharedValue(0);
  const searchInputTranslateY = useSharedValue(20);
  const templateSectionOpacity = useSharedValue(0);
  const communitySectionOpacity = useSharedValue(0);

  // ====================== Animation Setup ======================
  useEffect(() => {
    // Header animation
    headerOpacity.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });

    // Search input animation
    searchInputOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));
    searchInputTranslateY.value = withDelay(
      300,
      withTiming(0, {
        duration: 500,
        easing: Easing.out(Easing.cubic),
      })
    );

    // Content sections animation (staggered)
    templateSectionOpacity.value = withDelay(
      500,
      withTiming(1, { duration: 500 })
    );
    communitySectionOpacity.value = withDelay(
      700,
      withTiming(1, { duration: 500 })
    );
  }, []);

  // ====================== Animated Styles ======================
  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));

  const searchInputAnimatedStyle = useAnimatedStyle(() => ({
    opacity: searchInputOpacity.value,
    transform: [{ translateY: searchInputTranslateY.value }],
  }));

  const customButtonAnimatedStyle = useAnimatedStyle(() => ({
    // No animations
    opacity: 1,
  }));

  const templateSectionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: templateSectionOpacity.value,
    transform: [
      {
        translateY: withTiming(
          templateSectionOpacity.value * 1 === 1 ? 0 : 20,
          {
            duration: 500,
          }
        ),
      },
    ],
  }));

  const communitySectionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: communitySectionOpacity.value,
    transform: [
      {
        translateY: withTiming(
          communitySectionOpacity.value * 1 === 1 ? 0 : 20,
          {
            duration: 500,
          }
        ),
      },
    ],
  }));

  // ====================== State Management ======================
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isOptionModalVisible, setIsOptionModalVisible] = useState(false);
  const [isViewAllTemplatesVisible, setIsViewAllTemplatesVisible] =
    useState(false);
  const [isViewAllCommunityVisible, setIsViewAllCommunityVisible] =
    useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<any[]>([]);
  const searchInputRef = useRef<TextInput>(null);

  const router = useRouter();

  // ====================== Mock Data ======================
  // Predefined suggestions
  const predefinedSuggestions = [
    "Save $5000 in 3 months",
    "Run 5km every day for a month",
    "Complete a coding project in 2 weeks",
    "Read 12 books this year",
    "Learn a new language in 6 months",
  ];

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
      description:
        "Embark on a transformative journey with Cristiano Ronaldo as your guide. This travel goal is designed to help you break free from the ordinary and explore the world with a refined sense of luxury and adventure.",
      image: "https://picsum.photos/seed/ronaldo/200/300",
      owner: "BePlan",
      goals_id: ["goal_001", "goal_002"],
    },
    {
      title: "Lionel Messi",
      category: "Travel",
      description:
        "Inspired by Lionel Messi's passion and creativity, this goal invites you to dive into vibrant cultures and dynamic cityscapes. It's all about exploring local traditions and savoring culinary delights.",
      image: "https://picsum.photos/seed/messi/200/300",
      owner: "BePlan",
      goals_id: ["goal_001", "goal_003"],
    },
    {
      title: "Neymar Jr",
      category: "Travel",
      description:
        "Unleash your adventurous spirit with Neymar Jr's travel goal. Geared toward thrill-seekers and cultural explorers alike, this goal pushes you to discover exotic locales and embrace new experiences.",
      image: "https://picsum.photos/seed/neymarjr/200/300",
      owner: "BePlan",
      goals_id: ["goal_002", "goal_004"],
    },
    {
      title: "Olivier Giroud",
      category: "Travel",
      description:
        "Experience a harmonious blend of elegance and adventure with Olivier Giroud's travel goal. Tailored for those who appreciate sophisticated journeys with precision and style.",
      image: "https://picsum.photos/seed/giroud/200/300",
      owner: "BePlan",
      goals_id: ["goal_001", "goal_005"],
    },
  ];

  // Community data
  const communityData = [
    {
      title: "Healthy Living",
      category: "Health",
      description:
        "Healthy Living is more than just a goal—it's a community dedicated to transforming everyday habits into a lifestyle of wellness. This goal empowers you with scientifically-backed nutrition tips and workout routines.",
      image: "https://picsum.photos/seed/health/200/300",
      owner: "John Doe",
      goals_id: ["goal_001", "goal_002"],
    },
    {
      title: "Be Better Than Messi",
      category: "Workout",
      description:
        "Set your sights on peak performance with the 'Be Better Than Messi' workout goal. This dynamic challenge is designed to push your limits through high-energy training routines.",
      image: "https://picsum.photos/seed/better_messi/200/300",
      owner: "Jane Doe",
      goals_id: ["goal_002", "goal_003"],
    },
    {
      title: "One Punch Man",
      category: "Workout",
      description:
        "Inspired by the unstoppable energy of anime heroes, the 'One Punch Man' workout goal challenges you to maximize impact with every session. Built around high-intensity interval training.",
      image: "https://picsum.photos/seed/anime/200/300",
      owner: "John Doe",
      goals_id: ["goal_003", "goal_004"],
    },
  ];

  // Get available categories
  const allCategories = ["All"];
  templateData.forEach((template) => {
    if (!allCategories.includes(template.category)) {
      allCategories.push(template.category);
    }
  });
  communityData.forEach((template) => {
    if (!allCategories.includes(template.category)) {
      allCategories.push(template.category);
    }
  });

  // ====================== Handlers ======================
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (text.length > 0) {
      const filtered = predefinedSuggestions.filter((suggestion) =>
        suggestion.toLowerCase().includes(text.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const handleTemplateSelect = (template: any) => {
    const selectedTemplate: Template = {
      title: template.title,
      description: template.description,
      category: template.category,
      image: template.image,
      isFavorite: false,
      goals_id: template.goals_id || [],
    };

    setSelectedTemplate(selectedTemplate);
    setIsModalVisible(true);
  };

  const handleOpenOptionModal = () => {
    Keyboard.dismiss();
    setIsOptionModalVisible(true);
  };

  const handleCreateCustomGoal = () => {
    setIsOptionModalVisible(false);
    setIsLoading(true);
    setTimeout(() => {
      router.push("/customGoal");
      setIsLoading(false);
    }, 400);
  };

  const handleCreateTemplate = () => {
    setIsOptionModalVisible(false);
    setIsLoading(true);
    setTimeout(() => {
      router.push("/(other)/createTemplate");
      setIsLoading(false);
    }, 400);
  };

  const handleTestGoal = () => {
    setIsOptionModalVisible(false);
    setIsLoading(true);

    const today = new Date();

    // Set start date to 7 days in the past (for already started goal)
    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - 7);

    // Set due date to 14 days in the future
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 14);

    const formattedPastDate = pastDate.toISOString().split("T")[0];
    const formattedFutureDate = futureDate.toISOString().split("T")[0];
    const testGoalData = {
      title: "Test Goal from Create Screen",
      startDate: formattedPastDate,
      dueDate: formattedFutureDate,
      tasks: [
        {
          title: "Task 1: Read a book",
          description: "Finish reading 'Atomic Habits' by James Clear",
          type: "normal",
          selectedDates: ["2025-03-02", "2025-03-05", "2025-03-07"],
          selectedDaysOfWeek: [],
          status: "pending",
        },
        {
          title: "Task 2: Daily Exercise",
          description: "Complete 30 minutes of cardio each day",
          type: "daily",
          selectedDates: [],
          selectedDaysOfWeek: [],
          status: "pending",
        },
        {
          title: "Task 3: Practice coding",
          description: "Work on React Native project for at least 1 hour",
          type: "weekly",
          selectedDates: [],
          selectedDaysOfWeek: [1, 3, 5],
          status: "completed",
        },
        {
          title: "Task 4: Plan the month",
          description: "Set up goals and budget for the month",
          type: "monthly",
          selectedDates: ["2025-03-16"],
          selectedDaysOfWeek: [],
          status: "failed",
        },
      ],
    };

    setTimeout(() => {
      router.push({
        pathname: "/(other)/customGoal",
        params: { initialGoalData: JSON.stringify(testGoalData) },
      });
      setIsLoading(false);
    }, 400);
  };

  const handleSearchFocus = () => {
    setIsSearchFocused(true);
    if (searchQuery.length > 0) {
      const filtered = predefinedSuggestions.filter((suggestion) =>
        suggestion.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSuggestions(filtered);
    }
  };

  const handleSearchBlur = () => {
    setIsSearchFocused(false);
    setTimeout(() => {
      setSuggestions([]);
    }, 200);
  };

  const navigateToAI = () => {
    Keyboard.dismiss();
    console.log("Navigate to AI assistant");
  };

  // ====================== View All Handlers ======================
  useEffect(() => {
    if (isViewAllTemplatesVisible) {
      setFilteredTemplates(templateData);
    } else if (isViewAllCommunityVisible) {
      setFilteredTemplates(communityData);
    }
  }, [isViewAllTemplatesVisible, isViewAllCommunityVisible]);

  // ====================== Render UI ======================
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Header Section */}
      <Header>
        <Animated.View
          style={[styles.headerTextContainer, headerAnimatedStyle]}
        >
          <Text style={styles.headerSubtitle}>Let's help you</Text>
          <Text style={styles.headerTitle}>Make your dreams come true</Text>
        </Animated.View>

        {/* Search Input */}
        <Animated.View
          style={[styles.searchContainer, searchInputAnimatedStyle]}
        >
          <View style={styles.searchInputWrapper}>
            <Ionicons
              name="search"
              size={20}
              color="#777"
              style={styles.searchIcon}
            />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Describe your goal..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={handleSearchChange}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setSearchQuery("")}
              >
                <Ionicons name="close-circle" size={18} color="#777" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.aiButton} onPress={navigateToAI}>
              <Ionicons name="chatbubble-ellipses" size={22} color="#4F46E5" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Custom Goal Button */}
        <Animated.View style={customButtonAnimatedStyle}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.customGoalButton}
            onPress={handleOpenOptionModal}
          >
            <LinearGradient
              colors={["#4F46E5", "#7C3AED"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Ionicons
                name="add-circle"
                size={20}
                color="#FFF"
                style={styles.buttonIcon}
              />
              <Text style={styles.customGoalButtonText}>Create Your Own</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </Header>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Template Section */}
        <Animated.View
          style={[styles.sectionContainer, templateSectionAnimatedStyle]}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="document-text" size={22} color="#333" />
              <Text style={styles.sectionTitle}>Featured Templates</Text>
            </View>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => setIsViewAllTemplatesVisible(true)}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <Slider data={templateData} onCardPress={handleTemplateSelect} />
        </Animated.View>

        {/* Most Popular Community Template */}
        <Animated.View
          style={[styles.sectionContainer, communitySectionAnimatedStyle]}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="people" size={22} color="#333" />
              <Text style={styles.sectionTitle}>Community Favorites</Text>
            </View>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => setIsViewAllCommunityVisible(true)}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <Slider data={communityData} onCardPress={handleTemplateSelect} />
        </Animated.View>
      </ScrollView>

      {/* Template Modal */}
      <View>
        <TemplateModal
          visible={isModalVisible}
          template={selectedTemplate}
          onClose={() => setIsModalVisible(false)}
          onSelect={() => {
            console.log("Template selected:", selectedTemplate?.title);
            setIsModalVisible(false);
          }}
          goals={mockGoals}
        />
      </View>

      {/* Options Modal */}
      <View>
        <Modal
          isVisible={isOptionModalVisible}
          onBackdropPress={() => setIsOptionModalVisible(false)}
          onBackButtonPress={() => setIsOptionModalVisible(false)}
          backdropTransitionOutTiming={0}
          animationIn="fadeIn"
          animationOut="fadeOut"
          statusBarTranslucent
          style={styles.modalWrapper}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New</Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setIsOptionModalVisible(false)}
              >
                <Ionicons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={handleCreateCustomGoal}
            >
              <View style={[styles.optionIcon, { backgroundColor: "#4CAF50" }]}>
                <Ionicons name="flag" size={22} color="#FFF" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Custom Goal</Text>
                <Text style={styles.optionDescription}>
                  Create your own goal with custom tasks and timeline
                </Text>
              </View>
              <Feather name="chevron-right" size={22} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={handleCreateTemplate}
            >
              <View style={[styles.optionIcon, { backgroundColor: "#4F46E5" }]}>
                <Ionicons name="document-text" size={22} color="#FFF" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Template</Text>
                <Text style={styles.optionDescription}>
                  Design a reusable template to share with the community
                </Text>
              </View>
              <Feather name="chevron-right" size={22} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={handleTestGoal}
            >
              <View style={[styles.optionIcon, { backgroundColor: "black" }]}>
                <Ionicons name="happy-outline" size={22} color="#FFF" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Test Fucking Cutomize Goal</Text>
                <Text style={styles.optionDescription}>
                 Kuy  8====D  Kuy 
                </Text>
              </View>
              <Feather name="chevron-right" size={22} color="#999" />
            </TouchableOpacity>
          </View>
        </Modal>
      </View>

      {/* View All Templates Modal */}
      <View>
        <Modal
          isVisible={isViewAllTemplatesVisible || isViewAllCommunityVisible}
          onBackdropPress={() => {
            setIsViewAllTemplatesVisible(false);
            setIsViewAllCommunityVisible(false);
          }}
          onBackButtonPress={() => {
            setIsViewAllTemplatesVisible(false);
            setIsViewAllCommunityVisible(false);
          }}
          backdropTransitionOutTiming={0}
          animationIn="slideInUp"
          animationOut="slideOutDown"
          statusBarTranslucent
          style={styles.modalWrapper}
        >
          <View style={styles.fullScreenModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isViewAllTemplatesVisible
                  ? "Featured Templates"
                  : "Community Favorites"}
              </Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => {
                  setIsViewAllTemplatesVisible(false);
                  setIsViewAllCommunityVisible(false);
                }}
              >
                <Ionicons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.fullScreenModalContent}>
              {/* Templates Grid */}
              <View style={styles.templatesContainer}>
                <ScrollView style={styles.templatesScrollView}>
                  <View style={styles.templatesGrid}>
                    {filteredTemplates.map((template, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.templateGridItem}
                        onPress={() => {
                          setSelectedTemplate({
                            title: template.title,
                            description: template.description,
                            category: template.category,
                            image: template.image,
                            isFavorite: false,
                            goals_id: template.goals_id || [],
                          });
                          setIsModalVisible(true);
                        }}
                      >
                        <View style={styles.templateImageContainer}>
                          <Image
                            source={{ uri: template.image }}
                            style={styles.templateGridImage}
                            resizeMode="cover"
                          />
                          <LinearGradient
                            colors={["transparent", "rgba(0,0,0,0.7)"]}
                            style={styles.templateGradient}
                          />
                          <View style={styles.templateInfo}>
                            <Text style={styles.templateCategory}>
                              {template.category}
                            </Text>
                            <Text style={styles.templateTitle}>
                              {template.title}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>
          </View>
        </Modal>
      </View>
      {/* Loading Indicator */}
      {isLoading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

// ====================== Styles ======================
const styles = StyleSheet.create({
  // Main Layout
  container: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === "ios" ? 100 : 120,
    paddingTop: 10,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    zIndex: 999,
  },

  // Header Styles
  headerTextContainer: {
    alignItems: "flex-start",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "white",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#CCC",
    marginBottom: 4,
  },

  // Search Styles
  searchContainer: {
    marginBottom: 5,
    zIndex: 10,
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#333",
  },
  aiButton: {
    padding: 6,
  },
  clearButton: {
    padding: 6,
  },
  suggestionsContainer: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    marginTop: 5,
    padding: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  suggestionText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#444",
  },

  // Custom Goal Button Styles
  customGoalButton: {
    alignSelf: "center",
    width: "80%",
    borderRadius: 30,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
  },
  buttonIcon: {
    marginRight: 8,
  },
  customGoalButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 16,
  },

  // Section Styles
  sectionContainer: {
    marginBottom: 30,
  },
  sectionHeader: {
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    flexDirection: "row",
    marginBottom: 12,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  viewAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  viewAllText: {
    color: "#4F46E5",
    fontSize: 14,
    fontWeight: "500",
  },

  // Modal Styles
  modalWrapper: {
    margin: 0,
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
  },
  fullScreenModalContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 0,
    height: "90%",
  },
  fullScreenModalContent: {
    flex: 1,
    marginTop: 10,
  },
  templatesContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  closeModalButton: {
    padding: 5,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: "#666",
  },

  // Template Grid Styles
  templatesScrollView: {
    flex: 1,
  },
  templatesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingBottom: 20,
  },
  templateGridItem: {
    width: "48%",
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  templateImageContainer: {
    height: 180,
    position: "relative",
  },
  templateGridImage: {
    width: "100%",
    height: "100%",
  },
  templateGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "50%",
  },
  templateInfo: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
  },
  templateCategory: {
    color: "#DDD",
    fontSize: 12,
    marginBottom: 4,
  },
  templateTitle: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
