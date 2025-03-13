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
} from "react-native";
import { useState, useEffect } from "react";
import TemplateCard from "@/components/TemplateCard";
import TemplateModal from "@/components/TemplateModal";
import Header from "@/components/Header";
import { useUser } from "@clerk/clerk-expo";

type Template = {
  isListed: any;
  id: number;
  title: string;
  category: string;
  description: string;
  image_url: string;
  created_by: string;
  type: string;
  goals: Array<{
    title: string;
    tasks: Array<{
      title: string;
      description?: string;
      repeat_type: string;
      week_interval?: Array<number>;
    }>;
    id: string;
  }>;
  status: string;
  duration: number;
  isFavorite: boolean;
};

// ====================== Main Component ======================
export default function Community() {
  // ====================== State Management ======================
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [availableGoals, setAvailableGoals] = useState<Record<string, string>>({});
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
  useEffect(() => {
    fetchTemplates();
    fetchAvailableGoals();
  }, []);

  const fetchTemplates = async () => {
    try {
      // ดึงข้อมูล templates จาก API
      const response = await fetch("http://10.0.2.2:8000/api/v1/template/");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      // ดึงสถานะ isFavorite ของแต่ละ template
      const templatesWithFavoriteStatus = await Promise.all(
        data.map(async (template: any) => {
          const isFavorite = await fetchFavoriteStatus(template.id);
          return { ...template, isFavorite };
        })
      );

      setTemplates(templatesWithFavoriteStatus);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
      Alert.alert("Error", "Failed to fetch templates. Please try again.");
    }
  };

  const fetchAvailableGoals = async () => {
    try {
      const response = await fetch("http://10.0.2.2:8000/api/v1/template/available_goals");
      const data = await response.json();
      setAvailableGoals(data);
    } catch (error) {
      console.error("Failed to fetch available goals:", error);
    }
  };

  const fetchFavoriteStatus = async (templateId: number) => {
    try {
      const response = await fetch(
        `http://10.0.2.2:8000/api/v1/template/favorite/1`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.isFavorite; // สมมติว่า API ส่งกลับ { isFavorite: true/false }
    } catch (error) {
      console.error("Failed to fetch favorite status:", error);
      return false; // หากเกิดข้อผิดพลาด ให้คืนค่าเริ่มต้นเป็น false
    }
  };

  // ====================== Event Handlers ======================
  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setIsModalVisible(true);
  };

  const toggleFavorite = async (id: number) => {
    try {
      // ตรวจสอบว่า user.id มีค่าหรือไม่
      if (!user?.id) {
        throw new Error("User ID is missing. Please log in.");
      }

      // ส่ง request ไปยัง API เพื่อบันทึกสถานะ favorite
      const response = await fetch(
        `http://10.0.2.2:8000/api/v1/template/toggle_favorite/`,
        {
          method: "PUT", // ใช้ PUT เพื่อบันทึกข้อมูล
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: user.id,
            template_id: id, // ใช้ id ของ template ที่ส่งเข้ามา
          }),
        }
      );

      // ตรวจสอบว่า response ใช้งานได้หรือไม่
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // อัปเดต state templates ตามผลลัพธ์ที่ได้จาก API
      setTemplates((prev) =>
        prev.map((template) =>
          template.id === id
            ? { ...template, isFavorite: !template.isFavorite } // สลับค่า isFavorite
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
            selectedTemplate
              ? {
                isListed: selectedTemplate.isListed || false,
                isFavorite: selectedTemplate.isFavorite || false,
                title: selectedTemplate.title,
                category: selectedTemplate.category,
                description: selectedTemplate.description,
                image: selectedTemplate.image_url, // Map image_url to image
                owner: selectedTemplate.created_by, // Map created_by to owner
                duration: selectedTemplate.duration,
                goals: selectedTemplate.goals.map((goal) => ({
                  id: goal.id,
                  title: goal.title,
                })),
              }
              : {
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
