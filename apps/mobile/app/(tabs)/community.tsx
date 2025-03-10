import { Ionicons } from "@expo/vector-icons";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  FlatList,
  ScrollView,
} from "react-native";
import { useState } from "react";
import TemplateCard from "@/components/TemplateCard";
import { Template } from "@/types/templateTypes";
import TemplateModal from "@/components/TemplateModal";
import Header from "@/components/Header";

// ====================== Main Component ======================
export default function Community() {
  // ====================== State Management ======================
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([
    {
      title: "Arnold Schwarzenegger Workout",
      category: "fitness",
      description: `A comprehensive fitness regimen inspired by Arnold's classic bodybuilding approach. Includes progressive strength training, strategic cardio, and recovery protocols for maximum muscle development.`,
      image: "https://picsum.photos/seed/arnold/400/600",
      owner: "John",
      isFavorite: false,
      duration: 90,
      goals_id: ["goal_001", "goal_002", "goal_004", "goal_010"],
    },
    {
      title: "Warren Buffett Investment",
      description:
        "Value investing strategy based on Warren Buffett's principles. Focus on long-term growth, company fundamentals, and patient capital allocation.",
      category: "work",
      image: "https://picsum.photos/seed/buffett/400/600",
      owner: "Ben",
      isFavorite: false,
      duration: 365,
      goals_id: ["goal_003", "goal_005", "goal_008"],
    },
    {
      title: "Yoga for Flexibility",
      description:
        "Daily yoga practice focused on improving overall flexibility, mobility, and mind-body connection. Perfect for beginners and intermediate practitioners.",
      category: "health",
      image: "https://picsum.photos/seed/yoga/400/600",
      owner: "Adison",
      isFavorite: true,
      duration: 30,
      goals_id: ["goal_004", "goal_009", "goal_010", "goal_012"],
    },
    {
      title: "Marathon Training Plan",
      description:
        "16-week progressive training plan to prepare for a full marathon. Includes run scheduling, nutrition guidance, and recovery techniques.",
      category: "fitness",
      image: "https://picsum.photos/seed/marathon/400/600",
      owner: "Ryu",
      isFavorite: false,
      duration: 112,
      goals_id: ["goal_002", "goal_010", "goal_011", "goal_014"],
    },
    {
      title: "Mindfulness Meditation",
      description:
        "Daily meditation practice to reduce stress, improve focus, and enhance overall wellbeing. Includes guided sessions and breathing techniques.",
      category: "health",
      image: "https://picsum.photos/seed/meditation/400/600",
      owner: "Boss",
      isFavorite: true,
      duration: 21,
      goals_id: ["goal_009", "goal_010", "goal_012"],
    },
    {
      title: "Reading Challenge",
      description:
        "Structured approach to reading 24 books in a year. Includes genre diversification, reading schedules, and comprehension techniques.",
      category: "education",
      image: "https://picsum.photos/seed/books/400/600",
      owner: "David",
      isFavorite: false,
      duration: 365,
      goals_id: ["goal_006", "goal_015"],
    },
    {
      title: "Language Learning",
      description:
        "Comprehensive language acquisition strategy following proven polyglot methods. Daily practice routine with listening, speaking, reading, and writing.",
      category: "education",
      image: "https://picsum.photos/seed/language/400/600",
      owner: "King",
      isFavorite: false,
      duration: 180,
      goals_id: ["goal_007", "goal_015"],
    },
    {
      title: "World Traveler",
      description:
        "Strategic approach to visiting multiple countries within a year. Includes budgeting, itinerary planning, and cultural immersion techniques.",
      category: "travel",
      image: "https://picsum.photos/seed/travel/400/600",
      owner: "John",
      isFavorite: false,
      duration: 60,
      goals_id: ["goal_013", "goal_007"],
    },
    {
      title: "Side Hustle Blueprint",
      description:
        "Step-by-step framework for launching and growing a profitable side business while maintaining work-life balance.",
      category: "work",
      image: "https://picsum.photos/seed/business/400/600",
      owner: "Emma",
      isFavorite: false,
      duration: 90,
      goals_id: ["goal_003", "goal_005", "goal_008", "goal_015"],
    },
    {
      title: "Healthy Eating Plan",
      description:
        "Balanced nutrition program focusing on whole foods, meal planning, and sustainable eating habits without restrictive dieting.",
      category: "health",
      image: "https://picsum.photos/seed/nutrition/400/600",
      owner: "Vunsen",
      isFavorite: true,
      duration: 42,
      goals_id: ["goal_010", "goal_011"],
    },
    {
      title: "Public Speaking Mastery",
      description:
        "Progressive system to overcome speech anxiety and develop compelling presentation skills for professional and personal growth.",
      category: "personal_development",
      image: "https://picsum.photos/seed/speaking/400/600",
      owner: "Nobita",
      isFavorite: false,
      duration: 56,
      goals_id: ["goal_015", "goal_009"],
    },
    {
      title: "Retirement Planning",
      description:
        "Comprehensive financial strategy for securing retirement through smart investments, tax optimization, and long-term wealth building.",
      category: "work",
      image: "https://picsum.photos/seed/retirement/400/600",
      owner: "Taki",
      isFavorite: false,
      duration: 365,
      goals_id: ["goal_003", "goal_005", "goal_008"],
    },
    {
      title: "Home DIY Projects",
      description:
        "Collection of weekend home improvement projects with step-by-step instructions, tool lists, and budgeting advice.",
      category: "other",
      image: "https://picsum.photos/seed/diy/400/600",
      owner: "Soma",
      isFavorite: false,
      duration: 120,
      goals_id: ["goal_003"],
    },
  ]);

  // ====================== Category Configuration ======================
  const categories = [
    { id: "ALL", label: "ALL", icon: "apps-outline" },
    { id: "FAVORITES", label: "", icon: "heart" },
    { id: "fitness", label: "FITNESS", icon: "barbell-outline" },
    { id: "health", label: "HEALTH", icon: "fitness-outline" },
    { id: "education", label: "EDUCATION", icon: "book-outline" },
    { id: "work", label: "WORK", icon: "briefcase-outline" },
    { id: "travel", label: "TRAVEL", icon: "airplane-outline" },
    { id: "personal_development", label: "PERSONAL", icon: "person-outline" },
    { id: "other", label: "OTHER", icon: "ellipsis-horizontal-outline" },
  ];

  // ====================== Mock Data ======================
  const mockGoals = [
    { id: "goal_001", title: "Build Strength" },
    { id: "goal_002", title: "Improve Cardio" },
    { id: "goal_003", title: "Financial Stability" },
    { id: "goal_004", title: "Increase Flexibility" },
    { id: "goal_005", title: "Save for Retirement" },
    { id: "goal_006", title: "Read 24 Books This Year" },
    { id: "goal_007", title: "Learn a New Language" },
    { id: "goal_008", title: "Start a Side Business" },
    { id: "goal_009", title: "Reduce Stress Levels" },
    { id: "goal_010", title: "Improve Sleep Quality" },
    { id: "goal_011", title: "Eat Healthier Meals" },
    { id: "goal_012", title: "Master Meditation" },
    { id: "goal_013", title: "Travel to 3 New Countries" },
    { id: "goal_014", title: "Run a Marathon" },
    { id: "goal_015", title: "Develop Public Speaking Skills" },
  ];

  // ====================== Event Handlers ======================
  const handleTemplateSelect = (template: Template) => {
    const selectedTemplate = {
      title: template.title,
      category: template.category,
      description: template.description || "",
      image: template.image,
      owner: template.owner,
      isFavorite: template.isFavorite || false,
      isListed: template.isFavorite || false,
      duration: template.duration || null,
      goals:
        template.goals_id?.map(
          (id) =>
            mockGoals.find((goal) => goal.id === id) || {
              id,
              title: `Goal ${id}`,
            }
        ) || [],
    };

    setSelectedTemplate(selectedTemplate);
    setIsModalVisible(true);
  };

  const toggleFavorite = (title: string) => {
    setTemplates((prev) =>
      prev.map((template) =>
        template.title === title
          ? { ...template, isFavorite: !template.isFavorite }
          : template
      )
    );
  };

  const handleFilterChange = (filter: string) => {
    setSelectedFilter(filter);
  };

  // ====================== Helper Functions ======================
  // Filtering Logic
  const filteredTemplates = templates.filter((template) => {
    if (selectedFilter === "FAVORITES" && !template.isFavorite) return false;
    if (
      selectedFilter !== "ALL" &&
      selectedFilter !== "FAVORITES" &&
      template.category !== selectedFilter.toLowerCase()
    ) {
      return false;
    }

    if (
      searchQuery &&
      !template.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !template.description.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    return true;
  });

  // Get Icon Color
  const getIconColor = (categoryId: string) => {
    if (categoryId === "FAVORITES" && selectedFilter === categoryId) {
      return "#FF0000";
    }
    return selectedFilter === categoryId ? "#fff" : "#fff";
  };

  // ====================== Render UI ======================
  return (
    <View style={styles.container}>
      {/* Header */}
      <Header>
        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Community</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#777"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Looking for something?"
            placeholderTextColor="#bbb"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter Buttons */}
        <View style={styles.filterContainerWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContainer}
          >
            {categories.map((category) => (
              <Pressable
                key={category.id}
                style={[
                  styles.filterButton,
                  selectedFilter === category.id && styles.selected,
                ]}
                onPress={() => handleFilterChange(category.id)}
              >
                <Ionicons
                  name={category.icon as any}
                  size={18}
                  color={getIconColor(category.id)}
                  style={styles.filterIcon}
                />
                {category.label && (
                  <Text style={styles.filterText}>{category.label}</Text>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Header>

      {/* Template List */}
      <View style={styles.templateContainer}>
        <FlatList
          data={filteredTemplates}
          keyExtractor={(item) => item.title}
          renderItem={({ item }) => (
            <TemplateCard
              template={item}
              onSelect={() => handleTemplateSelect(item)}
              onToggleFavorite={() => toggleFavorite(item.title)}
            />
          )}
          showsVerticalScrollIndicator={false}
          numColumns={2}
          columnWrapperStyle={styles.templateRow}
          contentContainerStyle={styles.templateList}
          ListEmptyComponent={
            <View style={styles.emptyListContainer}>
              <Ionicons name="search-outline" size={50} color="#ccc" />
              <Text style={styles.emptyListText}>No templates found</Text>
              <Text style={styles.emptyListSubtext}>
                Try adjusting your search or filters
              </Text>
            </View>
          }
        />
      </View>

      {/* Template Preview Modal */}
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
              owner: "Community User",
            }
          }
        />
      </View>
    </View>
  );
}

// ====================== Styles ======================
const styles = StyleSheet.create({
  // Main Layout
  container: {
    flex: 1,
  },

  // Title Styles
  titleContainer: {
    alignItems: "flex-start",
    borderRadius: 25,
    marginLeft: 20,
    padding: 5,
  },
  title: {
    color: "#fff",
    fontSize: 40,
    fontWeight: "bold",
    marginBottom: 10,
    marginLeft: -20,
  },

  // Search Styles
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

  // Template/Card Styles
  templateContainer: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },
  templateList: {
    padding: 16,
    paddingBottom: 80,
  },
  templateRow: {
    justifyContent: "space-between",
  },

  // Filter Styles
  filterContainerWrapper: {
    width: "100%",
    marginTop: 10,
    marginBottom: 5,
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 8,
  },
  filterButton: {
    backgroundColor: "#181D39",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    minWidth: 40,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginHorizontal: 2,
  },
  selected: {
    backgroundColor: "#8B98D5",
  },
  filterIcon: {
    marginRight: 4,
  },
  filterText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },

  // Empty State
  emptyListContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyListText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#666",
    marginTop: 20,
  },
  emptyListSubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },
});
