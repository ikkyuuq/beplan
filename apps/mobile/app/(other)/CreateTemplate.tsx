import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";

// ====================== Main Component ======================
export default function CreateTemplate() {
  // ====================== State Management ======================
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("All");
  const [image, setImage] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);
  const [isFormValid, setIsFormValid] = useState(false);
  const [isScrollEnabled, setIsScrollEnabled] = useState(true);
  const router = useRouter();

  // Ref for ScrollView
  const mainScrollViewRef = React.useRef<ScrollView>(null);

  // Mock Data
  const mockGoals = [
    { id: "1", title: "Build Strength" },
    { id: "2", title: "Improve Cardio" },
    { id: "3", title: "Lose Weight" },
    { id: "4", title: "Financial Stability" },
    { id: "5", title: "Time Management" },
    { id: "6", title: "Stress Reduction" },
    { id: "7", title: "Sleep Better" },
    { id: "8", title: "Learn New Skills" },
    { id: "9", title: "Read More Books" },
    { id: "10", title: "Improve Posture" },
    { id: "11", title: "Drink More Water" },
    { id: "12", title: "Travel Planning" },
  ];

  // ====================== Animation Setup ======================
  const createButtonScale = useSharedValue(1);
  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: createButtonScale.value }],
  }));

  // Animation Handlers
  const handlePressIn = () => {
    createButtonScale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    createButtonScale.value = withSpring(1);
  };

  // ====================== Effects ======================
  useEffect(() => {
    setIsFormValid(
      title.trim() !== "" && image !== "" && selectedGoalIds.length > 0
    );
  }, [title, image, selectedGoalIds]);

  // ====================== Handlers ======================
  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "We need access to your photos to upload an image."
        );
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [16, 9],
        quality: 1,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const toggleGoalSelection = (goalId: string) => {
    setSelectedGoalIds((prev) =>
      prev.includes(goalId)
        ? prev.filter((id) => id !== goalId)
        : [...prev, goalId]
    );
  };

  const handleCreateTemplate = () => {
    if (!isFormValid) {
      Alert.alert(
        "Missing Information",
        "Please provide a title, cover image, and select at least one goal."
      );
      return;
    }

    const newTemplate = {
      title,
      description,
      category,
      image,
      isFavorite,
      goals_id: selectedGoalIds,
    };

    console.log("📌 New Template:", JSON.stringify(newTemplate, null, 2));
    Alert.alert("Success", "Template created successfully!", [
      { text: "OK", onPress: () => resetForm() },
    ]);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("All");
    setImage("");
    setIsFavorite(false);
    setSelectedGoalIds([]);
  };

  // Function to check if a goal is selected
  const isGoalSelected = (goalId: string) => {
    return selectedGoalIds.includes(goalId);
  };

  // ====================== Render UI ======================
  // Back button handler
  const handleGoBack = () => {
    router.replace("/(tabs)/community");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Back Button Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={handleGoBack}
          android_ripple={{ color: "rgba(0,0,0,0.1)", radius: 20 }}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>
      <ScrollView
        ref={mainScrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={isScrollEnabled}
      >
        {/* Preview Section */}
        <View style={styles.previewContainer}>
          {image ? (
            <View style={styles.heroContainer}>
              <Image source={{ uri: image }} style={styles.heroImage} />
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.8)"]}
                style={styles.gradient}
              />
              <View style={styles.heroContent}>
                <Text style={styles.heroTitle}>
                  {title ? title : "Template Title"}
                </Text>
                <View style={styles.categoryChip}>
                  <Text style={styles.categoryText}>{category}</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.emptyPreview}>
              <Text style={styles.headerTitle}>Create New Template</Text>
              <Text style={styles.previewText}>
                Add an image to see your template preview
              </Text>
            </View>
          )}
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          {/* Title Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Template Title <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter a descriptive title"
              value={title}
              onChangeText={setTitle}
              maxLength={50}
            />
          </View>

          {/* Description Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe what this template does"
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={500}
            />
            <Text style={styles.charCount}>{description.length}/500</Text>
          </View>

          {/* Category Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={category}
                onValueChange={(itemValue) => setCategory(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="All" value="All" />
                <Picker.Item label="Workout" value="Workout" />
                <Picker.Item label="Finance" value="Finance" />
                <Picker.Item label="Productivity" value="Productivity" />
                <Picker.Item label="Education" value="Education" />
                <Picker.Item label="Health" value="Health" />
              </Picker>
            </View>
          </View>

          {/* Image Upload */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Cover Image <Text style={styles.required}>*</Text>
            </Text>
            <Pressable
              style={styles.imagePicker}
              onPress={pickImage}
              android_ripple={{ color: "rgba(0,0,0,0.1)" }}
            >
              {image ? (
                <>
                  <Image source={{ uri: image }} style={styles.imagePreview} />
                  <Text style={styles.changeImageText}>Change Image</Text>
                </>
              ) : (
                <>
                  <View style={styles.uploadIconContainer}>
                    <Ionicons
                      name="cloud-upload-outline"
                      size={40}
                      color="#555"
                    />
                  </View>
                  <Text style={styles.imageText}>Upload Cover Image</Text>
                  <Text style={styles.imageSubText}>
                    Recommended ratio: 16:9
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Goals Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Template Goals <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.helpText}>
              Select goals that this template will help achieve
            </Text>
            <View style={styles.goalsScrollOuterContainer}>
              <ScrollView
                horizontal={false}
                style={styles.goalsScrollContainer}
                contentContainerStyle={styles.goalsContentContainer}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                onTouchStart={() => setIsScrollEnabled(false)}
                onTouchEnd={() => setIsScrollEnabled(true)}
                onScrollEndDrag={() => setIsScrollEnabled(true)}
              >
                <View style={styles.goalsContainer}>
                  {mockGoals.map((goal) => (
                    <Pressable
                      key={goal.id}
                      style={[
                        styles.goalItem,
                        isGoalSelected(goal.id) && styles.goalSelected,
                      ]}
                      onPress={() => toggleGoalSelection(goal.id)}
                      android_ripple={{ color: "rgba(0,0,0,0.1)" }}
                    >
                      <Ionicons
                        name={
                          isGoalSelected(goal.id)
                            ? "checkmark-circle"
                            : "ellipse-outline"
                        }
                        size={22}
                        color={isGoalSelected(goal.id) ? "#32CD32" : "#888"}
                      />
                      <Text
                        style={[
                          styles.goalText,
                          isGoalSelected(goal.id) && styles.goalTextSelected,
                        ]}
                      >
                        {goal.title}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
            <View style={styles.scrollIndicator}>
              <Ionicons name="chevron-down" size={16} color="#888" />
              <Text style={styles.scrollText}>Scroll for more goals</Text>
            </View>
            <Text style={styles.goalsSelectionInfo}>
              {selectedGoalIds.length > 0
                ? `${selectedGoalIds.length} goal${
                    selectedGoalIds.length > 1 ? "s" : ""
                  } selected`
                : "No goals selected"}
            </Text>
          </View>

          {/* Favorite Option */}
          <Pressable
            style={styles.favoriteButton}
            onPress={() => setIsFavorite(!isFavorite)}
            android_ripple={{ color: "rgba(0,0,0,0.05)" }}
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={24}
              color={isFavorite ? "red" : "#555"}
            />
            <Text style={styles.favoriteText}>
              {isFavorite ? "Marked as Favorite" : "Mark as Favorite"}
            </Text>
          </Pressable>

          {/* Create Button */}
          <Pressable
            style={[
              styles.createButton,
              !isFormValid && styles.createButtonDisabled,
            ]}
            onPress={handleCreateTemplate}
            onPressIn={isFormValid ? handlePressIn : undefined}
            onPressOut={isFormValid ? handlePressOut : undefined}
            disabled={!isFormValid}
            android_ripple={
              isFormValid ? { color: "rgba(255,255,255,0.2)" } : undefined
            }
          >
            <Animated.View style={[styles.buttonContent, animatedButtonStyle]}>
              <Ionicons name="add-circle-outline" size={24} color="#fff" />
              <Text style={styles.createButtonText}>Create Template</Text>
            </Animated.View>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ====================== Styles ======================
const styles = StyleSheet.create({
  // Main Layout
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 50 : 16,
    paddingBottom: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    zIndex: 10,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    width: 100,
  },
  backText: {
    marginLeft: 8,
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },

  // Preview Section
  previewContainer: {
    backgroundColor: "#f9f9f9",
  },
  emptyPreview: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  previewText: {
    color: "#777",
    marginTop: 8,
  },
  heroContainer: {
    height: 200,
    width: "100%",
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "70%",
  },
  heroContent: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  categoryChip: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  categoryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  // Form Section
  formSection: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  required: {
    color: "red",
  },
  helpText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
  },
  charCount: {
    textAlign: "right",
    color: "#888",
    fontSize: 12,
    marginTop: 5,
  },

  // Picker Styles
  pickerContainer: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    overflow: "hidden",
  },
  picker: {
    height: 50,
  },

  // Image Upload Styles
  imagePicker: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderStyle: "dashed",
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadIconContainer: {
    backgroundColor: "#e0e0e0",
    borderRadius: 50,
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  imagePreview: {
    width: "100%",
    height: 180,
    borderRadius: 10,
  },
  imageText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#555",
    marginTop: 10,
  },
  imageSubText: {
    fontSize: 14,
    color: "#888",
    marginTop: 5,
  },
  changeImageText: {
    fontSize: 14,
    color: "#2196F3",
    marginTop: 10,
    fontWeight: "500",
  },

  // Goals Selection Styles
  goalsScrollOuterContainer: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    backgroundColor: "#f9f9f9",
    marginVertical: 5,
  },
  goalsScrollContainer: {
    maxHeight: 180,
  },
  goalsContentContainer: {
    padding: 10,
  },
  goalsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  scrollIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    opacity: 0.7,
  },
  scrollText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  goalsSelectionInfo: {
    textAlign: "center",
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },
  goalItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  goalSelected: {
    backgroundColor: "rgba(50, 205, 50, 0.15)",
    borderColor: "rgba(50, 205, 50, 0.5)",
  },
  goalText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#555",
  },
  goalTextSelected: {
    color: "#228B22",
    fontWeight: "500",
  },

  // Favorite Button Styles
  favoriteButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 0, 0, 0.05)",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 25,
  },
  favoriteText: {
    marginLeft: 10,
    fontSize: 16,
    color: "#555",
  },

  // Create Button Styles
  createButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 30,
  },
  createButtonDisabled: {
    backgroundColor: "#A5D6A7",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 10,
  },
});
