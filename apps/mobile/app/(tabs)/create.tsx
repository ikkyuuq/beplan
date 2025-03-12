import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
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
import TemplateCard from "@/components/TemplateCard";
import TemplateModal from "@/components/TemplateModal";
import { Template } from "@/types/templateTypes";

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
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // ====================== Mock Data Management ======================
  // Updated Mock Goals
  const mockGoals = [
    { id: "goal_001", title: "Build Muscle Strength" },
    { id: "goal_002", title: "Improve Cardiovascular Health" },
    { id: "goal_003", title: "Achieve Financial Independence" },
    { id: "goal_004", title: "Increase Physical Flexibility" },
    { id: "goal_005", title: "Create Emergency Savings Fund" },
    { id: "goal_006", title: "Complete 24 Books This Year" },
    { id: "goal_007", title: "Master Conversational Spanish" },
    { id: "goal_008", title: "Launch Successful Side Business" },
    { id: "goal_009", title: "Reduce Daily Stress Levels" },
    { id: "goal_010", title: "Improve Sleep Quality" },
    { id: "goal_011", title: "Maintain Balanced Nutrition" },
    { id: "goal_012", title: "Practice Daily Meditation" },
    { id: "goal_013", title: "Visit 3 New Countries" },
    { id: "goal_014", title: "Complete First Marathon" },
    { id: "goal_015", title: "Develop Public Speaking Skills" },
  ];

  // Template data
  const [templateData, setTemplateData] = useState<Template[]>([
    {
      title: "Complete Fitness Transformation",
      category: "Fitness",
      description:
        "Transform your physique with this comprehensive fitness regimen inspired by elite athletes. This goal combines progressive strength training, strategic cardio intervals, and recovery protocols designed for maximum muscle development and fat loss. Perfect for beginners and intermediate fitness enthusiasts looking to make significant physical changes in 90 days.",
      image: "https://picsum.photos/seed/fitness101/400/600",
      owner: "BePlan",
      duration: 90,
      isFavorite: false,
      goals_id: ["goal_001", "goal_002", "goal_004"],
    },
    {
      title: "Financial Freedom Blueprint",
      category: "Finance",
      description:
        "Master your finances with this strategic roadmap to financial independence. Based on principles from top wealth advisors, this template helps you build smart saving habits, optimize investments, and develop passive income streams. Includes budgeting frameworks, investment strategies, and debt elimination techniques that work for any income level.",
      image: "https://picsum.photos/seed/finance101/400/600",
      owner: "BePlan",
      duration: 365,
      isFavorite: false,
      goals_id: ["goal_003", "goal_005", "goal_008"],
    },
    {
      title: "Mindfulness & Meditation Journey",
      category: "Health",
      description:
        "Cultivate inner peace and mental clarity with this progressive meditation program. Designed for busy professionals, this template helps you build a consistent practice starting with just 5 minutes daily and gradually expanding to deeper meditative states. Includes guided sessions, breathing techniques, and mindfulness exercises to reduce stress and enhance overall wellbeing.",
      image: "https://picsum.photos/seed/meditation101/400/600",
      owner: "BePlan",
      duration: 30,
      isFavorite: false,
      goals_id: ["goal_009", "goal_010", "goal_012"],
    },
    {
      title: "Ultimate Language Learning System",
      category: "Education",
      description:
        "Become conversational in any language within 6 months using this comprehensive language acquisition strategy. Following proven polyglot methods, this system combines daily practice routines with strategic immersion techniques. Perfect for travelers, professionals, and lifelong learners who want to develop practical language skills efficiently.",
      image: "https://picsum.photos/seed/language101/400/600",
      owner: "BePlan",
      duration: 180,
      isFavorite: false,
      goals_id: ["goal_007", "goal_015"],
    },
  ]);

  // Community data
  const [communityData, setCommunityData] = useState<Template[]>([
    {
      title: "30-Day Healthy Habits Challenge",
      category: "Health",
      description:
        "Transform your daily routine with this community-favorite health challenge. This template guides you through establishing 10 essential healthy habits that boost energy, improve sleep quality, and enhance overall vitality. Each habit is introduced gradually with specific action steps, making this perfect for health beginners and veterans alike.",
      image: "https://picsum.photos/seed/health101/400/600",
      owner: "John Doe",
      duration: 30,
      isFavorite: false,
      goals_id: ["goal_010", "goal_011"],
    },
    {
      title: "Ultimate HIIT Workout Series",
      category: "Workout",
      description:
        "Maximize fat burning and muscle definition with this high-intensity interval training series. Created by a certified fitness trainer, this program features 24 unique workouts that progressively challenge your cardiovascular system and major muscle groups. Ideal for intermediate fitness enthusiasts who want maximum results in minimum time.",
      image: "https://picsum.photos/seed/hiit101/400/600",
      owner: "Jane Smith",
      duration: 56,
      isFavorite: true,
      goals_id: ["goal_002", "goal_004"],
    },
    {
      title: "Productivity Powerhouse System",
      category: "Productivity",
      description:
        "Double your productivity while working fewer hours with this science-backed system. Drawing from the practices of top performers across industries, this template helps you implement time blocking, deep work sessions, and strategic rest periods. Perfect for entrepreneurs, professionals, and students who want to accomplish more without burnout.",
      image: "https://picsum.photos/seed/productivity101/400/600",
      owner: "Alex Johnson",
      duration: 42,
      isFavorite: false,
      goals_id: ["goal_006", "goal_008"],
    },
  ]);

  // ====================== Event Handlers ======================
  const handleTemplateSelect = (template: any) => {
    const selectedTemplate = {
      title: template.title,
      description: template.description,
      category: template.category,
      image: template.image,
      isFavorite: template.isFavorite || false,
      isListed: template.isFavorite || false,
      owner: template.owner || "BePlan",
      duration: template.duration || null,
      goals:
        template.goals_id?.map(
          (id: string) =>
            mockGoals.find((goal) => goal.id === id) || {
              id,
              title: `Goal ${id}`,
            }
        ) || [],
    };

    setSelectedTemplate(selectedTemplate);
    setIsModalVisible(true);
  };

  const handleOpenOptionModal = () => {
    setIsOptionModalVisible(true);
  };

  const handleCreateCustomGoal = () => {
    setIsOptionModalVisible(false);
    setTimeout(() => {
      setIsLoading(true);
      setTimeout(() => {
        router.push("/customGoal");
        setIsLoading(false);
      }, 400);
    }, 300);
  };

  const handleCreateTemplate = () => {
    setIsOptionModalVisible(false);
    setTimeout(() => {
      setIsLoading(true);
      router.push("/(other)/createTemplate");
      setIsLoading(false);
    }, 400);
  };

  const handleTestGoal = () => {
    setIsOptionModalVisible(false);

    const today = new Date();

    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - 7);

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
      setIsLoading(true);
      setTimeout(() => {
        router.push({
          pathname: "/(other)/customGoal",
          params: { initialGoalData: JSON.stringify(testGoalData) },
        });
        setIsLoading(false);
      }, 500);
    }, 600);
  };

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

        {/* Search Bar */}
        <Animated.View
          style={[styles.searchContainer, searchInputAnimatedStyle]}
        >
          <Ionicons
            name="search"
            size={20}
            color="#777"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Describe your goal..."
            placeholderTextColor="#999"
          />
        </Animated.View>

        {/* Custom Goal Button */}
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
          isVisible={isModalVisible}
          onClose={() => setIsModalVisible(false)}
          onAddToList={() => {
            if (selectedTemplate) {
              setSelectedTemplate({
                ...selectedTemplate,
                isListed: !selectedTemplate.isListed,
              });
            }
          }}
          data={
            selectedTemplate || {
              isListed: false,
              title: "",
              category: "",
              image: "",
              description: "",
              owner: "BePlan",
            }
          }
        />
      </View>

      {/* Options Modal */}
      <View>
        <Modal
          isVisible={isOptionModalVisible}
          onBackdropPress={() => setIsOptionModalVisible(false)}
          onBackButtonPress={() => setIsOptionModalVisible(false)}
          backdropTransitionOutTiming={0}
          animationIn="zoomIn"
          animationOut="zoomOut"
          animationInTiming={300}
          animationOutTiming={300}
          useNativeDriver={true}
          statusBarTranslucent
          style={styles.centeredModalWrapper}
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
                <Text style={styles.optionTitle}>
                  Test Fucking Cutomize Goal
                </Text>
                <Text style={styles.optionDescription}>Kuy 8====D Kuy</Text>
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

            {/* Templates Grid using TemplateCard */}
            <View style={styles.fullScreenModalContent}>
              <ScrollView style={styles.templatesScrollView}>
                <View style={styles.templatesGrid}>
                  {(isViewAllTemplatesVisible
                    ? templateData
                    : communityData
                  ).map((template, index) => (
                    <TemplateCard
                      key={index}
                      template={{
                        title: template.title,
                        category: template.category,
                        description: template.description || "",
                        image: template.image,
                        owner: template.owner || "BePlan",
                        isFavorite: template.isFavorite || false,
                        goals_id: template.goals_id || [],
                        duration: template.duration || 0,
                      }}
                      onSelect={() => {
                        const selectedTemplate = {
                          title: template.title,
                          description: template.description,
                          category: template.category,
                          image: template.image,
                          isListed: template.isFavorite || false,
                          owner: template.owner || "BePlan",
                          duration: template.duration || null,
                          goals:
                            template.goals_id?.map(
                              (id: string) =>
                                mockGoals.find((goal) => goal.id === id) || {
                                  id,
                                  title: `Goal ${id}`,
                                }
                            ) || [],
                        };
                        setSelectedTemplate(selectedTemplate);
                        setIsModalVisible(true);
                      }}
                      onToggleFavorite={() => {
                        if (isViewAllTemplatesVisible) {
                          setTemplateData((prev) =>
                            prev.map((item) =>
                              item.title === template.title
                                ? { ...item, isFavorite: !item.isFavorite }
                                : item
                            )
                          );
                        } else {
                          setCommunityData((prev) =>
                            prev.map((item) =>
                              item.title === template.title
                                ? { ...item, isFavorite: !item.isFavorite }
                                : item
                            )
                          );
                        }
                      }}
                    />
                  ))}
                </View>
              </ScrollView>
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
    paddingBottom: Platform.OS === "ios" ? 70 : 120,
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

  // Header
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

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 8,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: "#000000",
  },

  // Custom Goal Button
  customGoalButton: {
    alignSelf: "center",
    //width: "50%",
    width: Platform.OS === 'ios' ? '100%' : '50%',
    alignItems: "center",
    borderRadius: 30,
    marginTop: Platform.OS === 'ios' ? 0 : 6
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
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

  // Modal
  modalWrapper: {
    margin: 0,
    justifyContent: "flex-end",
  },
  centeredModalWrapper: {
    margin: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
    width: "85%",
    maxWidth: 400,
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
    textAlign: "center",
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
