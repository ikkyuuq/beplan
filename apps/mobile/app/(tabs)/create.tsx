import React, { useEffect, useMemo, useState } from "react";
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
  Keyboard,
  Modal,
  Pressable,
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
import { useTabBarSpace } from "@/constants/layout";
import Slider from "@/components/Slider";
import { LinearGradient } from "expo-linear-gradient";
import TemplateCard from "@/components/TemplateCard";
import TemplateModal from "@/components/TemplateModal";
import { API_BASE_URL } from "@/constants/api";
import { useApiFetch } from "@/hooks/useApiFetch";
import { useTranslation } from "@/i18n";

type Task = {
  title: string;
  description?: string;
  repeat_type: string;
  week_interval?: number[];
};

type Goal = {
  id: string;
  title: string;
  tasks: Task[];
};

type CreateBy = {
  user_id: string;
  username: string | null;
  occupation: string | null;
  image: string | null;
  about: string | null;
};

type Template = {
  id: number;
  title: string;
  category: string;
  description: string;
  image_url: string;
  created_by: CreateBy;
  type: string;
  goals: Goal[];
  status: string;
  duration: number;
  isFavorite: boolean;
  isListed: boolean;
};

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  workout: "barbell-outline",
  health: "heart-outline",
  education: "school-outline",
  productivity: "flash-outline",
  finance: "wallet-outline",
};

// Every word of the query must appear somewhere in the template: title,
// description, category, or one of its goal/task titles.
function matchesQuery(template: Template, words: string[]) {
  const haystack = [
    template.title,
    template.description,
    template.category,
    ...(template.goals ?? []).flatMap((goal) => [
      goal.title,
      ...(goal.tasks ?? []).map((task) => task.title),
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return words.every((word) => haystack.includes(word));
}

// ====================== Main Component ======================
export default function CreateScreen() {
  // Room for the floating tab bar on any device (was a fixed guess).
  const tabBarSpace = useTabBarSpace();
  const apiFetch = useApiFetch();
  const { t } = useTranslation();
  const categoryLabel = (category: string) =>
    t(`categories.${category?.toLowerCase()}` as "categories.all", { defaultValue: category });
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
      }),
    );

    // Content sections animation (staggered)
    templateSectionOpacity.value = withDelay(
      500,
      withTiming(1, { duration: 500 }),
    );
    communitySectionOpacity.value = withDelay(
      700,
      withTiming(1, { duration: 500 }),
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
          },
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
          },
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
  const [templateData, setTemplateData] = useState<Template[]>([]);
  const [communityData, setCommunityData] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery.length > 0;
  const searchResults = useMemo(() => {
    const words = trimmedQuery.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];
    return templateData.filter((template) => matchesQuery(template, words));
  }, [templateData, trimmedQuery]);

  useEffect(() => {
    const fetchTemplates = async () => {
      setIsLoading(true);
      try {
        const response = await apiFetch(`${API_BASE_URL}/api/v1/template/`);
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        const data = await response.json();
        setTemplateData(data as Template[]);
        setCommunityData(
          // TODO : แก้ให้ sort จาก favorite มากไปน้อย
          (data as Template[]).filter((template) => template.type === "community"),
        );
      } catch (error) {
        console.error("Error fetching templates:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplates();
  }, []);

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

  // ====================== Event Handlers ======================
  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
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

  const handleCreateWithAssistant = () => {
    setIsOptionModalVisible(false);
    setTimeout(() => {
      router.push("/(other)/aiProcess");
    }, 250);
  };

  // The search text already describes the goal, so skip the options popup.
  const handlePlanWithAssistant = () => {
    if (!isSearching) return;
    Keyboard.dismiss();
    router.push({
      pathname: "/(other)/aiProcess",
      params: { textToProcess: trimmedQuery },
    });
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
          <Text style={styles.headerSubtitle}>{t("create.subtitle")}</Text>
          <Text style={styles.headerTitle}>{t("create.title")}</Text>
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
            placeholder={t("create.searchPlaceholder")}
            placeholderTextColor="#999"
            value={query}
            onChangeText={setQuery}
            returnKeyType="go"
            onSubmitEditing={handlePlanWithAssistant}
            autoCorrect={false}
          />
          {isSearching ? (
            <>
              <TouchableOpacity
                onPress={() => setQuery("")}
                style={styles.clearButton}
                accessibilityLabel={t("create.clearSearch")}
              >
                <Ionicons name="close-circle" size={18} color="#AAA" />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handlePlanWithAssistant}
                style={styles.searchSubmitButton}
                accessibilityLabel={t("create.planWithAi")}
              >
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </TouchableOpacity>
            </>
          ) : null}
        </Animated.View>

        {/* Create Goal Button */}
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
              name="sparkles"
              size={20}
              color="#FFF"
              style={styles.buttonIcon}
            />
            <Text style={styles.customGoalButtonText}>{t("create.startNewGoal")}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Header>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarSpace }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {isSearching ? (
          <View style={styles.searchResults}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handlePlanWithAssistant}
              style={styles.aiSuggestion}
            >
              <View style={[styles.optionIcon, { backgroundColor: "#EEEAFE" }]}>
                <Ionicons name="sparkles" size={20} color="#5B43D6" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.aiSuggestionLabel}>{t("create.planItWithAi")}</Text>
                <Text style={styles.aiSuggestionQuery} numberOfLines={2}>
                  "{trimmedQuery}"
                </Text>
              </View>
              <Feather name="arrow-up-right" size={20} color="#5B43D6" />
            </TouchableOpacity>

            <Text style={styles.resultsHeading}>
              {searchResults.length > 0
                ? t("create.templatesCount", { count: searchResults.length })
                : t("create.noTemplatesMatch")}
            </Text>
            {searchResults.length === 0 ? (
              <Text style={styles.resultsEmpty}>
                {t("create.noTemplatesHint")}
              </Text>
            ) : (
              searchResults.map((template) => (
                <TouchableOpacity
                  key={template.id}
                  activeOpacity={0.8}
                  onPress={() => handleTemplateSelect(template)}
                  style={styles.resultRow}
                >
                  <View style={styles.resultIcon}>
                    <Ionicons
                      name={
                        CATEGORY_ICONS[template.category?.toLowerCase()] ??
                        "document-text-outline"
                      }
                      size={20}
                      color="#4F46E5"
                    />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={styles.resultTitle} numberOfLines={1}>
                      {template.title}
                    </Text>
                    <Text style={styles.resultMeta} numberOfLines={1}>
                      {[
                        template.category ? categoryLabel(template.category) : null,
                        t("common.goals", { count: template.goals?.length ?? 0 }),
                        template.type === "community" ? t("create.community") : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={20} color="#98A2B3" />
                </TouchableOpacity>
              ))
            )}
          </View>
        ) : (
          <>
            {/* Template Section */}
            <Animated.View
              style={[styles.sectionContainer, templateSectionAnimatedStyle]}
            >
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Ionicons name="document-text" size={22} color="#333" />
                  <Text style={styles.sectionTitle}>{t("create.featuredTemplates")}</Text>
                </View>
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() => setIsViewAllTemplatesVisible(true)}
                >
                  <Text style={styles.viewAllText}>{t("common.viewAll")}</Text>
                </TouchableOpacity>
              </View>
              <Slider
                data={templateData as any}
                onCardPress={(template) =>
                  handleTemplateSelect(template as unknown as Template)
                }
              />
            </Animated.View>

            {/* Most Popular Community Template */}
            <Animated.View
              style={[styles.sectionContainer, communitySectionAnimatedStyle]}
            >
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Ionicons name="people" size={22} color="#333" />
                  <Text style={styles.sectionTitle}>{t("create.communityFavorites")}</Text>
                </View>
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() => setIsViewAllCommunityVisible(true)}
                >
                  <Text style={styles.viewAllText}>{t("common.viewAll")}</Text>
                </TouchableOpacity>
              </View>
              <Slider
                data={communityData as any}
                onCardPress={(template) =>
                  handleTemplateSelect(template as unknown as Template)
                }
              />
            </Animated.View>
          </>
        )}
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
            selectedTemplate
              ? {
                  id: selectedTemplate.id || 0,
                  isListed: selectedTemplate.isListed || false,
                  isFavorite: selectedTemplate.isFavorite || false,
                  title: selectedTemplate.title,
                  category: selectedTemplate.category,
                  description: selectedTemplate.description,
                  image: selectedTemplate.image_url, // ใช้ image_url จาก API
                  owner: selectedTemplate.created_by.user_id || "BePlan", // ใช้ created_by จาก API
                  duration: selectedTemplate.duration || 0,
                  goals:
                    selectedTemplate.goals?.map(
                      (goal: { id: any; title: any }) => ({
                        id: goal.id,
                        title: goal.title,
                      }),
                    ) || [], // แสดง goals ทั้งหมด
                }
              : {
                  id: 0,
                  isListed: false,
                  isFavorite: false,
                  title: "",
                  category: "",
                  description: "",
                  image: "",
                  owner: "Community User",
                  duration: 0,
                  goals: [],
                }
          }
        />
      </View>

      {/* Options Modal */}
      <View>
        <Modal
          visible={isOptionModalVisible}
          onRequestClose={() => setIsOptionModalVisible(false)}
          transparent
          animationType="fade"
          statusBarTranslucent
        >
          <Pressable
            style={styles.centeredModalBackdrop}
            onPress={() => setIsOptionModalVisible(false)}
          >
            <View
              style={styles.modalContainer}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalEyebrow}>{t("create.newGoal")}</Text>
                  <Text style={styles.modalTitle}>{t("create.howToStart")}</Text>
                  </View>
                <TouchableOpacity
                  style={styles.closeModalButton}
                  onPress={() => setIsOptionModalVisible(false)}
                >
                  <Ionicons name="close" size={22} color="#666" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.modalOption, styles.manualOption]}
                onPress={handleCreateCustomGoal}
              >
                <View style={[styles.optionIcon, { backgroundColor: "#E9F8F0" }]}>
                  <Ionicons name="create-outline" size={23} color="#168A4A" />
                </View>
                <View style={styles.optionContent}>
                  <View style={styles.optionTitleRow}>
                    <Text style={styles.optionTitle}>{t("create.createYourself")}</Text>
                    <View style={styles.optionBadge}>
                      <Text style={styles.optionBadgeText}>{t("create.fullControl")}</Text>
                    </View>
                  </View>
                  <Text style={styles.optionDescription}>
                    {t("create.createYourselfDescription")}
                  </Text>
                </View>
                <Feather name="arrow-up-right" size={20} color="#168A4A" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalOption, styles.aiOption]}
                onPress={handleCreateWithAssistant}
              >
                <View style={[styles.optionIcon, { backgroundColor: "#EEEAFE" }]}>
                  <Ionicons name="sparkles" size={23} color="#5B43D6" />
                </View>
                <View style={styles.optionContent}>
                  <View style={styles.optionTitleRow}>
                    <Text style={styles.optionTitle}>{t("create.askAi")}</Text>
                    <View style={[styles.optionBadge, styles.aiBadge]}>
                      <Text style={[styles.optionBadgeText, styles.aiBadgeText]}>
                        {t("create.guided")}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.optionDescription}>
                    {t("create.askAiDescription")}
                  </Text>
                </View>
                <Feather name="arrow-up-right" size={20} color="#5B43D6" />
              </TouchableOpacity>

              <View style={styles.modalDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t("create.or")}</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={[styles.modalOption, styles.templateOption]}
                onPress={handleCreateTemplate}
              >
                <View style={[styles.optionIcon, { backgroundColor: "#F2F4F7" }]}>
                  <Ionicons name="copy-outline" size={21} color="#667085" />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>{t("create.createTemplate")}</Text>
                  <Text style={styles.optionDescription}>
                    {t("create.createTemplateDescription")}
                  </Text>
                </View>
                <Feather name="chevron-right" size={21} color="#98A2B3" />
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
      </View>

      {/* View All Templates Modal */}
      <View>
        <Modal
          visible={isViewAllTemplatesVisible || isViewAllCommunityVisible}
          onRequestClose={() => {
            setIsViewAllTemplatesVisible(false);
            setIsViewAllCommunityVisible(false);
          }}
          transparent
          animationType="slide"
          statusBarTranslucent
        >
          <Pressable
            style={styles.fullScreenModalBackdrop}
            onPress={() => {
              setIsViewAllTemplatesVisible(false);
              setIsViewAllCommunityVisible(false);
            }}
          >
            <View
              style={styles.fullScreenModalContainer}
              onStartShouldSetResponder={() => true}
            >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isViewAllTemplatesVisible
                  ? t("create.featuredTemplates")
                  : t("create.communityFavorites")}
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
                        id: template.id || 0,
                        title: template.title,
                        category: template.category,
                        description: template.description || "",
                        image_url: template.image_url || "",
                        created_by: template.created_by,
                        type: template.type,
                        status: template.status,
                        isFavorite: template.isFavorite || false,
                        goals: template.goals || [],
                        duration: template.duration || 0,
                      }}
                      onSelect={() => {
                        setSelectedTemplate(template);
                        setIsModalVisible(true);
                      }}
                      onToggleFavorite={() => {
                        if (isViewAllTemplatesVisible) {
                          setTemplateData((prev) =>
                            prev.map((item) =>
                              item.title === template.title
                                ? { ...item, isFavorite: !item.isFavorite }
                                : item,
                            ),
                          );
                        } else {
                          setCommunityData((prev) =>
                            prev.map((item) =>
                              item.title === template.title
                                ? { ...item, isFavorite: !item.isFavorite }
                                : item,
                            ),
                          );
                        }
                      }}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>
            </View>
          </Pressable>
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
    // Fixed height so the bar doesn't grow when the buttons appear.
    minHeight: 48,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: "#000000",
  },
  clearButton: {
    padding: 6,
  },
  searchSubmitButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#5B43D6",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },

  // Search results
  searchResults: {
    paddingHorizontal: 20,
  },
  aiSuggestion: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAF9FF",
    borderColor: "#E3DDFB",
    borderWidth: 1,
    borderRadius: 16,
    padding: 15,
    marginBottom: 22,
  },
  aiSuggestionLabel: {
    color: "#5B43D6",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 3,
  },
  aiSuggestionQuery: {
    color: "#333",
    fontSize: 15,
    fontWeight: "600",
  },
  resultsHeading: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  resultsEmpty: {
    fontSize: 13,
    lineHeight: 19,
    color: "#667085",
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#EAECF0",
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EEF0FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 3,
  },
  resultMeta: {
    fontSize: 12,
    color: "#667085",
  },

  // Custom Goal Button
  customGoalButton: {
    alignSelf: "center",
    // Same on every platform: full width up to a comfortable size.
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    borderRadius: 30,
    marginTop: 6,
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
  centeredModalBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
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
    paddingBottom: 24,
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
  fullScreenModalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
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
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 3,
  },
  modalEyebrow: {
    color: "#7C3AED",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  closeModalButton: {
    padding: 5,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  manualOption: {
    backgroundColor: "#F7FCF9",
    borderColor: "#D8F0E1",
  },
  aiOption: {
    backgroundColor: "#FAF9FF",
    borderColor: "#E3DDFB",
  },
  templateOption: {
    backgroundColor: "#FAFAFA",
    borderColor: "#EAECF0",
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
    flexShrink: 1,
  },
  optionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 5,
    flexWrap: "wrap",
  },
  optionBadge: {
    backgroundColor: "#DDF4E6",
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  optionBadgeText: {
    color: "#168A4A",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  aiBadge: {
    backgroundColor: "#EAE4FF",
  },
  aiBadgeText: {
    color: "#5B43D6",
  },
  optionDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: "#667085",
  },
  modalDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 2,
    marginBottom: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#EAECF0",
  },
  dividerText: {
    color: "#98A2B3",
    fontSize: 10,
    fontWeight: "700",
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
