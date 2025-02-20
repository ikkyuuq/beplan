import { Feather, Ionicons } from "@expo/vector-icons";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  TextInput,
  FlatList,
} from "react-native";
import { useClerk } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { routes } from "@/routesConfig";
import { useState } from "react";
import TemplateCard from "@/components/TemplateCard";
import { Template } from "@/types/templateTypes";
import { LinearGradient } from "expo-linear-gradient";
import TemplateModal from "@/components/TemplateModal";

export default function Community() {
  const { signOut } = useClerk();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null
  );
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");
  const [isModalVisible, setModalVisible] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([
    {
      id: "1",
      title: "Arnold Schwarzenegger",
      description: `1. Workout Routine
Do daily exercises like morning cardio (running, cycling) and strength training 3 times a week.
Add active recovery sessions, such as swimming or yoga, to stay balanced and flexible.
    
2. Strength Training
Focus on compound lifts like squats, deadlifts, and bench presses for full-body strength.
Increase weights gradually while maintaining proper form for better muscle growth.
    
3. Cardio and Endurance
Use HIIT to boost cardiovascular health and burn fat effectively.
Alternate steady-state cardio with HIIT for improved stamina and endurance.
    
4. Flexibility and Mobility
Stretch daily to prevent injuries and speed up recovery.
Use foam rolling and dynamic warm-ups to improve flexibility and reduce stiffness.
    
5. Recovery and Rest
Take at least one rest day per week for muscle recovery.
Get 7-9 hours of quality sleep for better performance and recovery.
    
6. Nutrition and Hydration
Eat a balanced diet rich in protein, healthy fats, and complex carbs.
Stay hydrated throughout the day, especially before and after workouts.
    
7. Mindset and Consistency
Set realistic goals and track progress with a journal or app.
Stick to a structured workout plan and stay motivated to reach your fitness goals.`,
      category: "Workout",
      image: "https://picsum.photos/200/300",
      isFavorite: false,
      goals_id: ["goal_001", "goal_002"],
    },
    {
      id: "2",
      title: "Warren Buffett",
      description: "Legendary investor and businessman.",
      category: "Finance",
      image: "https://picsum.photos/200/300",
      isFavorite: true,
      goals_id: ["goal_003"],
    },
    {
      id: "3",
      title: "Warren Buffett",
      description: "Legendary investor and businessman.",
      category: "Finance",
      image: "https://picsum.photos/200/300",
      isFavorite: true,
      goals_id: ["goal_003"],
    },
    {
      id: "4",
      title: "Warren Buffett",
      description: "Legendary investor and businessman.",
      category: "Finance",
      image: "https://picsum.photos/200/300",
      isFavorite: true,
      goals_id: ["goal_003"],
    },
    {
      id: "5",
      title: "Warren Buffett",
      description: "Legendary investor and businessman.",
      category: "Finance",
      image: "https://picsum.photos/200/300",
      isFavorite: true,
      goals_id: ["goal_003"],
    },
  ]);

  const handleSignOut = async () => {
    await signOut();
    router.replace(routes.signIn);
  };

  const openModal = (template: Template) => {
    setSelectedTemplate(template);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedTemplate(null);
  };

  const handleSelectTemplate = () => {
    console.log("Selected Template Goals:", selectedTemplate?.goals_id);
    closeModal();
  };

  const handleFilterChange = (filter: string) => {
    setSelectedFilter(filter);
  };

  const toggleFavorite = (id: string) => {
    setTemplates((prev) =>
      prev.map((template) =>
        template.id === id
          ? { ...template, isFavorite: !template.isFavorite }
          : template
      )
    );
  };

  const filteredTemplates = templates.filter((template) => {
    if (selectedFilter === "ALL") return true;
    if (selectedFilter === "FAVORITES") return template.isFavorite;
    if (selectedFilter === "WORKOUT") return template.category === "Workout";
    if (selectedFilter === "FINANCE") return template.category === "Finance";
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Feather name="menu" size={24} color="#fff" />
          <Pressable onPress={handleSignOut} style={styles.profileButton}>
            <Image
              source={{ uri: "https://picsum.photos/200/300" }}
              style={styles.profileImage}
              resizeMode="cover"
            />
          </Pressable>
        </View>

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
        <View style={styles.filterContainer}>
          {/* ALL */}
          <Pressable
            style={[
              styles.filterButton,
              selectedFilter === "ALL" && styles.selected,
            ]}
            onPress={() => handleFilterChange("ALL")}
          >
            <Text style={styles.filterText}>ALL</Text>
          </Pressable>

          {/* Favorites */}
          <Pressable
            style={[
              styles.filterButton,
              selectedFilter === "FAVORITES" && styles.selected,
            ]}
            onPress={() => handleFilterChange("FAVORITES")}
          >
            <Ionicons
              name="heart"
              size={20}
              color={selectedFilter === "FAVORITES" ? "#FF0000" : "#fff"}
            />
          </Pressable>

          {/* Workout */}
          <Pressable
            style={[
              styles.filterButton,
              selectedFilter === "WORKOUT" && styles.selected,
            ]}
            onPress={() => handleFilterChange("WORKOUT")}
          >
            <Ionicons name="barbell" size={20} color="#fff" />
          </Pressable>

          {/* Finance */}
          <Pressable
            style={[
              styles.filterButton,
              selectedFilter === "FINANCE" && styles.selected,
            ]}
            onPress={() => handleFilterChange("FINANCE")}
          >
            <Ionicons name="cash" size={20} color="#fff" />
          </Pressable>
        </View>
      </View>

      <View style={styles.templateContainer}>
        <View style={styles.cardContainer}>
          <FlatList
            data={filteredTemplates} // ✅ แสดงเฉพาะที่ตรงกับ Filter
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TemplateCard
                template={item}
                onSelect={() => openModal(item)}
                //onSelect={() => console.log("Selected:", item.id)}
                onToggleFavorite={() => toggleFavorite(item.id)}
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>

      <TemplateModal
        visible={isModalVisible}
        template={selectedTemplate}
        onClose={closeModal}
        onSelect={handleSelectTemplate}
      />

      <LinearGradient
        colors={["transparent", "rgb(255, 255, 255)"]}
        style={styles.gradientOverlay}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header Styles
  header: {
    height: 320,
    backgroundColor: "#16171F",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    padding: 24,
    gap: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 10,
    shadowOpacity: 0.1,
    elevation: 5, // For Android shadow
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  profileButton: {
    alignItems: "center",
  },
  profileImage: {
    width: 35,
    height: 35,
    borderRadius: 100,
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

  // Search Bar Styles
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 25,
    padding: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: "#fff", // Consider if you want white text on a white background
  },

  // Template/Card/Overlay Styles
  templateContainer: {
    padding: 5,
    maxHeight: 450,
  },
  cardContainer: {
    padding: 15,
    flexGrow: 1,
  },
  gradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
  },

  // Filter Styles
  filterContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginTop: 10,
  },
  filterButton: {
    backgroundColor: "#181D39",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  selected: {
    backgroundColor: "#8B98D5", // Highlight color when filter is selected
  },
  filterText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
});
