import { Ionicons } from "@expo/vector-icons";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  FlatList,
  ScrollView,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import TemplateCard from "@/components/TemplateCard";
import TemplateModal from "@/components/TemplateModal";
import Header from "@/components/Header";
import { useUser } from "@clerk/clerk-expo";

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

type Template = {
  id: number;
  title: string;
  category: string;
  description: string;
  image_url: string;
  created_by: {
    user_id: string;
    username: string | null;
    image: string | null;
    occupation: string | null;
    about: string | null;
  };
  type: string;
  goals: Goal[];
  status: string;
  duration: number;
  isFavorite: boolean;
  isListed?: boolean;
};

// ====================== Main Component ======================
export default function Community() {
  // ====================== State Management ======================
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null
  );
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [availableGoals, setAvailableGoals] = useState<Record<string, string>>(
    {}
  );
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();

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

  // ====================== Fetch Data from API ======================
  const fetchTemplates = useCallback(async () => {
    try {
      if (!user || !user.id) {
        setError("User authentication required");
        setIsLoading(false);
        return;
      }

      setError(null);
      const baseUrl =
        Platform.OS === "android"
          ? "http://10.0.2.2:8000"
          : "http://127.0.0.1:8000";
      const response = await fetch(
        `${baseUrl}/api/v1/template?user_id=${user.id}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      setTemplates(data);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
      setError("Failed to fetch templates. Please try again.");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  const fetchAvailableGoals = useCallback(async () => {
    try {
      if (!user || !user.id) {
        console.log("No user ID available for goals fetch");
        setAvailableGoals({});
        return;
      }

      const baseUrl =
        Platform.OS === "android"
          ? "http://10.0.2.2:8000"
          : "http://127.0.0.1:8000";
      const response = await fetch(
        `${baseUrl}/api/v1/template/available_goals?user_id=${user.id}`
      );

      if (!response.ok) {
        const responseText = await response
          .text()
          .catch(() => "No response text");
        console.error(
          `HTTP error when fetching goals: status=${response.status}, body=${responseText}`
        );

        if (response.status === 422) {
          console.warn(
            "422 error when fetching available goals - continuing with empty goals list"
          );
          setAvailableGoals({});
          return;
        }

        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAvailableGoals(data);
    } catch (error) {
      console.error("Failed to fetch available goals:", error);
      setAvailableGoals({});
    }
  }, [user]);

  const fetchFavoriteStatus = async (templateId: number) => {
    try {
      const response = await fetch(
        `http://10.0.2.2:8000/api/v1/template/favorite/1`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.isFavorite;
    } catch (error) {
      console.error("Failed to fetch favorite status:", error);
      return false;
    }
  };

  // ====================== Pull-to-Refresh Handler ======================
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTemplates();
    fetchAvailableGoals();
  }, [fetchTemplates, fetchAvailableGoals]);

  // ====================== Initial Data Loading ======================
  useEffect(() => {
    setIsLoading(true);

    fetchTemplates().catch((error) => {
      console.error("Error in initial template loading:", error);
      setIsLoading(false);
    });

    fetchAvailableGoals().catch((error) => {
      console.error("Error in initial goals loading (non-critical):", error);
    });
  }, [fetchTemplates, fetchAvailableGoals]);

  // ====================== Event Handlers ======================
  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setIsModalVisible(true);
  };

  const toggleFavorite = async (id: number) => {
    try {
      if (!user?.id) {
        throw new Error("User ID is missing. Please log in.");
      }

      const response = await fetch(
        `http://10.0.2.2:8000/api/v1/template/toggle_favorite/`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: user.id,
            template_id: id,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      setTemplates((prev) =>
        prev.map((template) =>
          template.id === id
            ? { ...template, isFavorite: !template.isFavorite }
            : template
        )
      );

      console.log("Favorite toggled successfully:", data);
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      Alert.alert("Error", "Failed to toggle favorite. Please try again.");
    }
  };

  const handleFilterChange = (filter: string) => {
    setSelectedFilter(filter);
  };

  // ====================== Filtering Logic ======================
  const filteredTemplates = templates.filter((template) => {
    if (template.type !== "community" || template.status !== "unused") {
      return false;
    }
    if (selectedFilter === "FAVORITES" && !template.isFavorite) return false;

    if (
      selectedFilter !== "ALL" &&
      selectedFilter !== "FAVORITES" &&
      template.category.toLowerCase() !== selectedFilter.toLowerCase()
    ) {
      return false;
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = template.title.toLowerCase().includes(query);
      const matchesDescription = template.description
        .toLowerCase()
        .includes(query);
      if (!matchesTitle && !matchesDescription) return false;
    }

    return true;
  });

  // ====================== Get Icon Color ======================
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
        {isLoading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4E5A94" />
            <Text style={styles.loadingText}>Loading templates...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredTemplates}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TemplateCard
                template={item}
                onSelect={() => handleTemplateSelect(item)}
                onToggleFavorite={() => toggleFavorite(item.id)}
              />
            )}
            showsVerticalScrollIndicator={false}
            numColumns={2}
            columnWrapperStyle={styles.templateRow}
            contentContainerStyle={styles.templateList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#4E5A94"]}
                tintColor="#4E5A94"
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyListContainer}>
                {error ? (
                  <>
                    <Ionicons
                      name="alert-circle-outline"
                      size={50}
                      color="#FF5733"
                    />
                    <Text style={styles.errorText}>{error}</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="search-outline" size={50} color="#ccc" />
                    <Text style={styles.emptyListText}>No templates found</Text>
                    <Text style={styles.emptyListSubtext}>
                      Try adjusting your search or filters
                    </Text>
                  </>
                )}
              </View>
            }
          />
        )}
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
            selectedTemplate
              ? {
                  id: selectedTemplate.id,
                  isListed: selectedTemplate.isListed || false,
                  isFavorite: selectedTemplate.isFavorite || false,
                  title: selectedTemplate.title,
                  category: selectedTemplate.category,
                  description: selectedTemplate.description,
                  image: selectedTemplate.image_url,
                  owner:
                    selectedTemplate.created_by.username ||
                    selectedTemplate.created_by.user_id,
                  creator: selectedTemplate.created_by,
                  creatorId: user?.id,
                  duration: selectedTemplate.duration,
                  goals: selectedTemplate.goals.map((goal) => ({
                    id: goal.id,
                    title: goal.title,
                  })),
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
                  creatorId: user?.id,
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

  // Title
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

  // Template/Card
  templateContainer: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },
  templateList: {
    padding: 16,
    paddingBottom: 80,
    minHeight: "100%",
  },
  templateRow: {
    justifyContent: "space-between",
  },

  // Filter
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

  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#4E5A94",
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
  errorText: {
    marginTop: 10,
    color: "#FF5733",
    fontSize: 16,
    textAlign: "center",
  },
});
