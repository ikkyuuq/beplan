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
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import CategoryPicker from "@/components/CategoryPicker";
import CalendarPicker from "@/components/CalendarPicker";
import { useUser } from "@clerk/clerk-expo";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

// ====================== Type Definitions ======================
type Goal = {
  id: string;
  title: string;
};

// ====================== Main Component ======================
export default function createTemplate() {
  // ====================== State Management ======================
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("All");
  const [image, setImage] = useState("");
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);
  const [isFormValid, setIsFormValid] = useState(false);
  const [isScrollEnabled, setIsScrollEnabled] = useState(true);
  const [isLoadingGoals, setIsLoadingGoals] = useState(false);
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [goalDates, setGoalDates] = useState<
    Map<
      string,
      { newStartDate?: string; newDueDate?: string; showDatePicker: boolean }
    >
  >(new Map());
  const [currentGoalId, setCurrentGoalId] = useState<string | null>(null);
  const [isStartDatePickerVisible, setStartDatePickerVisible] = useState(false);
  const [isDueDatePickerVisible, setDueDatePickerVisible] = useState(false);
  const [currentStartDate, setCurrentStartDate] = useState<string>("");
  const [currentDueDate, setCurrentDueDate] = useState<string>("");
  const today = new Date().toISOString().split("T")[0];

  // ====================== Available Goals State ======================
  const [availableGoals, setAvailableGoals] = useState<Goal[]>([]);

  // ====================== Animation Values ======================
  const createButtonScale = useSharedValue(1);
  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: createButtonScale.value }],
  }));

  // ====================== Animation Setup ======================
  const handlePressIn = () => {
    createButtonScale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    createButtonScale.value = withSpring(1);
  };

  // ====================== Effects ======================
  useEffect(() => {
    const basicFieldsValid =
      title.trim() !== "" && image !== "" && selectedGoalIds.length > 0;

    let allDatesValid = true;

    for (const goalId of selectedGoalIds) {
      const goalDateInfo = goalDates.get(goalId);

      if (
        goalDateInfo?.showDatePicker &&
        (!goalDateInfo.newStartDate || !goalDateInfo.newDueDate)
      ) {
        allDatesValid = false;
        break;
      }
    }

    setIsFormValid(basicFieldsValid && allDatesValid);
  }, [title, image, selectedGoalIds, goalDates]);

  // ====================== Fetch Available Goals ======================
  useEffect(() => {
    const fetchAvailableGoals = async () => {
      if (!isLoaded || !isSignedIn || !user) return;

      const userId = user.id;
      if (!userId) {
        Alert.alert("Error", "Could not get user ID. Please try again later.");
        return;
      }

      setIsLoadingGoals(true);

      try {
        const baseUrl =
          Platform.OS === "android"
            ? "http://10.0.2.2:8000"
            : "http://127.0.0.1:8000";

        const response = await fetch(
          `${baseUrl}/api/v1/template/available_goals?user_id=${userId}`,
        );

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }

        const data = await response.json();
        console.log("Fetched goals:", data);

        const goalsArray = Object.entries(data).map(([id, goalObject]) => {
          const goal = goalObject as { title: string };

          return {
            id,
            title: goal.title,
          };
        });

        setAvailableGoals(goalsArray);
      } catch (error) {
        console.error("Failed to fetch available goals:", error);
        Alert.alert(
          "Error",
          "Failed to fetch your goals. Please check network connection and server status.",
        );

        setAvailableGoals([]);
      } finally {
        setIsLoadingGoals(false);
      }
    };

    fetchAvailableGoals();
  }, [isLoaded, isSignedIn, user]);

  // Function to fix the image upload functionality in createTemplate.tsx
  // This needs to be integrated into the pickImage function

  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "We need access to your photos to upload an image.",
        );
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 1,
      });

      if (!result.canceled) {
        setIsLoading(true);
        const uploadedImage = result.assets[0];

        const formData = new FormData();

        const fileType = uploadedImage.uri.substring(
          uploadedImage.uri.lastIndexOf(".") + 1,
        );
        const mimeType =
          fileType === "jpg" || fileType === "jpeg"
            ? "image/jpeg"
            : fileType === "png"
              ? "image/png"
              : "image/jpg";

        formData.append("file", {
          uri:
            Platform.OS === "ios"
              ? uploadedImage.uri.replace("file://", "")
              : uploadedImage.uri,
          name: uploadedImage.fileName || `photo.${fileType}`,
          type: uploadedImage.mimeType || mimeType,
        } as any);

        try {
          const baseUrl =
            Platform.OS === "android"
              ? "http://10.0.2.2:8000"
              : "http://127.0.0.1:8000";

          // Set a reasonable timeout
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Upload request timed out")),
              30000,
            ),
          );

          // Create the fetch promise
          const fetchPromise = fetch(`${baseUrl}/api/v1/user/upload_image`, {
            method: "POST",
            headers: {
              "Content-Type": "multipart/form-data",
            },
            body: formData,
          });

          // Race the fetch against the timeout
          const uploadResponse = (await Promise.race([
            fetchPromise,
            timeoutPromise,
          ])) as Response;

          if (!uploadResponse.ok) {
            // Try to get more information about the error
            const errorText = await uploadResponse.text();
            console.error(
              `Upload failed with status ${uploadResponse.status}: ${errorText}`,
            );
            throw new Error(
              `Failed to upload image (status ${uploadResponse.status})`,
            );
          }

          const uploadData = await uploadResponse.json();
          console.log("📌 Uploaded Image URL:", uploadData.url);

          setImage(uploadData.url);
        } catch (error) {
          console.error("Image upload failed:", error);

          if (
            error instanceof TypeError &&
            error.message === "Network request failed"
          ) {
            Alert.alert(
              "Network Error",
              "Failed to connect to the server. Please check your internet connection and try again.",
              [{ text: "OK" }],
            );
          } else {
            Alert.alert(
              "Upload Failed",
              "Failed to upload image. Please try again with a smaller image or check your connection.",
            );
          }
        } finally {
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error("Error in image picker:", error);
      Alert.alert("Error", "Failed to pick image");
      setIsLoading(false);
    }
  };

  const toggleGoalSelection = (goalId: string) => {
    if (selectedGoalIds.includes(goalId)) {
      setSelectedGoalIds((prev) => prev.filter((id) => id !== goalId));

      const updatedGoalDates = new Map(goalDates);
      updatedGoalDates.delete(goalId);
      setGoalDates(updatedGoalDates);
    } else {
      Alert.alert(
        "Goal Date Options",
        "Would you like to set new start and due dates for this goal?",
        [
          {
            text: "Yes",
            onPress: () => {
              setSelectedGoalIds((prev) => [...prev, goalId]);

              const updatedGoalDates = new Map(goalDates);
              updatedGoalDates.set(goalId, { showDatePicker: true });
              setGoalDates(updatedGoalDates);

              setCurrentGoalId(goalId);
              setCurrentStartDate("");
              setCurrentDueDate("");
              setStartDatePickerVisible(true);
            },
          },
          {
            text: "No",
            onPress: () => {
              setSelectedGoalIds((prev) => [...prev, goalId]);

              const updatedGoalDates = new Map(goalDates);
              updatedGoalDates.set(goalId, { showDatePicker: false });
              setGoalDates(updatedGoalDates);
            },
          },
        ],
      );
    }
  };

  const handleStartDateSelect = (dates: string[]) => {
    if (!currentGoalId || dates.length === 0) return;

    const selectedDate = dates[0];
    setCurrentStartDate(selectedDate);

    setStartDatePickerVisible(false);
    setTimeout(() => setDueDatePickerVisible(true), 300);
  };

  const handleDueDateSelect = (dates: string[]) => {
    if (!currentGoalId || dates.length === 0) return;

    const selectedDate = dates[0];
    setCurrentDueDate(selectedDate);
    setDueDatePickerVisible(false);

    const updatedGoalDates = new Map(goalDates);
    updatedGoalDates.set(currentGoalId, {
      showDatePicker: true,
      newStartDate: currentStartDate,
      newDueDate: selectedDate,
    });
    setGoalDates(updatedGoalDates);

    // Reset current goal
    setCurrentGoalId(null);
  };

  const handleCreateTemplate = async () => {
    if (!isFormValid) {
      Alert.alert(
        "Missing Information",
        "Please provide a title, cover image, and select at least one goal.",
      );
      return;
    }

    if (!isLoaded || !isSignedIn) {
      Alert.alert(
        "Authentication Error",
        "Please sign in to save your template.",
      );
      return;
    }

    const userId = user?.id;
    if (!userId) {
      Alert.alert("Error", "Could not get user ID. Please try again later.");
      return;
    }

    if (!image.startsWith("http")) {
      Alert.alert(
        "Error",
        "Image upload failed. Please select an image again.",
      );
      return;
    }

    setIsLoading(true);

    try {
      const existingGoals = selectedGoalIds.map((goalId) => {
        const goalDateInfo = goalDates.get(goalId);

        if (
          goalDateInfo?.showDatePicker &&
          goalDateInfo.newStartDate &&
          goalDateInfo.newDueDate
        ) {
          return {
            assigned_goal_id: goalId,
            new_start_date: goalDateInfo.newStartDate,
            new_due_date: goalDateInfo.newDueDate,
          };
        } else {
          return { assigned_goal_id: goalId };
        }
      });

      const newTemplate = {
        user_id: userId,
        title,
        description,
        image_url: image,
        created_by: userId,
        category,
        type: "community",
        existing_goals: existingGoals,
      };

      console.log("📌 New Template:", JSON.stringify(newTemplate, null, 2));

      const baseUrl =
        Platform.OS === "android"
          ? "http://10.0.2.2:8000"
          : "http://127.0.0.1:8000";
      const response = await fetch(`${baseUrl}/api/v1/template/create/user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTemplate),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Server error: ${response.status}`,
        );
      }

      const responseData = await response.json();
      console.log("📌 API Response:", JSON.stringify(responseData, null, 2));

      Alert.alert("Success", "Template created successfully!", [
        {
          text: "OK",
          onPress: () => {
            resetForm();
            router.back();
          },
        },
      ]);
    } catch (error) {
      console.error("Failed to create template:", error);
      let errorMessage = "Failed to create template. Please try again later.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("All");
    setImage("");
    setSelectedGoalIds([]);
    setGoalDates(new Map());
  };

  const isGoalSelected = (goalId: string) => {
    return selectedGoalIds.includes(goalId);
  };

  const getGoalDateText = (goalId: string) => {
    const goalDateInfo = goalDates.get(goalId);
    if (!goalDateInfo || !goalDateInfo.showDatePicker) {
      return "Using original dates";
    }

    if (goalDateInfo.newStartDate && goalDateInfo.newDueDate) {
      return `${goalDateInfo.newStartDate} to ${goalDateInfo.newDueDate}`;
    }

    return "Dates not set";
  };

  // ====================== Render UI ======================
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Back Button Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>
      <ScrollView
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
              placeholderTextColor="#777"
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
              placeholderTextColor="#777"
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
            <CategoryPicker
              value={category}
              onChange={setCategory}
              categories={[
                "All",
                "Workout",
                "Finance",
                "Productivity",
                "Education",
                "Health",
              ]}
            />
          </View>

          {/* Image Upload */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Cover Image <Text style={styles.required}>*</Text>
            </Text>
            <Pressable
              style={styles.imagePicker}
              onPress={pickImage}
              android_ripple={{ color: "rgba(255,255,255,0.1)" }}
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
                      color="#8B98D5"
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
              {isLoadingGoals ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#8B98D5" />
                  <Text style={styles.loadingText}>Loading your goals...</Text>
                </View>
              ) : availableGoals.length > 0 ? (
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
                    {availableGoals.map((goal) => (
                      <View key={goal.id} style={styles.goalItemContainer}>
                        <Pressable
                          style={[
                            styles.goalItem,
                            isGoalSelected(goal.id) && styles.goalSelected,
                          ]}
                          onPress={() => toggleGoalSelection(goal.id)}
                          android_ripple={{ color: "rgba(255,255,255,0.1)" }}
                        >
                          <Ionicons
                            name={
                              isGoalSelected(goal.id)
                                ? "checkmark-circle"
                                : "ellipse-outline"
                            }
                            size={22}
                            color={
                              isGoalSelected(goal.id) ? "#32CD32" : "#8B98D5"
                            }
                          />
                          <Text
                            style={[
                              styles.goalText,
                              isGoalSelected(goal.id) &&
                                styles.goalTextSelected,
                            ]}
                          >
                            {typeof goal.title === "string"
                              ? goal.title
                              : String(goal.title)}
                          </Text>
                        </Pressable>

                        {/* Date information for selected goals */}
                        {isGoalSelected(goal.id) && (
                          <View style={styles.goalDateInfo}>
                            <Text style={styles.goalDateText}>
                              {getGoalDateText(goal.id)}
                            </Text>
                            {/* Edit dates button if needed */}
                            {goalDates.get(goal.id)?.showDatePicker && (
                              <Pressable
                                style={styles.editDatesButton}
                                onPress={() => {
                                  setCurrentGoalId(goal.id);
                                  setCurrentStartDate("");
                                  setCurrentDueDate("");
                                  setStartDatePickerVisible(true);
                                }}
                              >
                                <Text style={styles.editDatesButtonText}>
                                  Edit Dates
                                </Text>
                              </Pressable>
                            )}
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              ) : (
                <View style={styles.noGoalsContainer}>
                  <Ionicons
                    name="information-circle-outline"
                    size={40}
                    color="#8B98D5"
                  />
                  <Text style={styles.noGoalsText}>No goals available</Text>
                  <Text style={styles.noGoalsSubText}>
                    Create some goals first to use in templates
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.scrollIndicator}>
              <Ionicons name="chevron-down" size={16} color="#8B98D5" />
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

          {/* Create Button */}
          <Pressable
            style={[
              styles.createButton,
              !isFormValid && styles.createButtonDisabled,
            ]}
            onPress={handleCreateTemplate}
            onPressIn={isFormValid ? handlePressIn : undefined}
            onPressOut={isFormValid ? handlePressOut : undefined}
            disabled={!isFormValid || isLoading}
            android_ripple={
              isFormValid ? { color: "rgba(255,255,255,0.2)" } : undefined
            }
          >
            <Animated.View style={[styles.buttonContent, animatedButtonStyle]}>
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={24} color="#fff" />
                  <Text style={styles.createButtonText}>Create Template</Text>
                </>
              )}
            </Animated.View>
          </Pressable>
        </View>
      </ScrollView>

      {/* Calendar Pickers for goal dates */}
      <CalendarPicker
        visible={isStartDatePickerVisible}
        onClose={() => setStartDatePickerVisible(false)}
        onConfirm={handleStartDateSelect}
        title="Select Start Date"
        initialDates={currentStartDate ? [currentStartDate] : []}
        highlightColor="#4F46E5"
        singleSelect
        minDate={today}
        maxDate={currentDueDate || undefined}
      />

      <CalendarPicker
        visible={isDueDatePickerVisible}
        onClose={() => setDueDatePickerVisible(false)}
        onConfirm={handleDueDateSelect}
        title="Select Due Date"
        initialDates={currentDueDate ? [currentDueDate] : []}
        highlightColor="#FF5733"
        singleSelect
        minDate={currentStartDate || today}
        otherSelectedDate={currentStartDate}
        otherHighlightColor="#4F46E5"
      />

      {/* Loading Overlay if needed */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingOverlayText}>Creating template...</Text>
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
    backgroundColor: "#16171F",
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 50 : 16,
    paddingBottom: 10,
    backgroundColor: "#16171F",
    borderBottomWidth: 1,
    borderBottomColor: "#2A2C3A",
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
    color: "#fff",
    fontWeight: "500",
  },

  // Preview
  previewContainer: {
    backgroundColor: "#1E1F29",
  },
  emptyPreview: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#2A2C3A",
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
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
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
  previewText: {
    color: "#8B98D5",
    marginTop: 8,
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

  // Form
  formSection: {
    padding: 20,
    backgroundColor: "#16171F",
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
  },
  required: {
    color: "#FF5733",
  },
  helpText: {
    fontSize: 14,
    color: "#8B98D5",
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#2A2C3A",
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#3A3F55",
    color: "#fff",
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
  },
  charCount: {
    textAlign: "right",
    color: "#8B98D5",
    fontSize: 12,
    marginTop: 5,
  },

  // Image Upload
  imagePicker: {
    backgroundColor: "#2A2C3A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3A3F55",
    borderStyle: "dashed",
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadIconContainer: {
    backgroundColor: "#1E1F29",
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
    color: "#fff",
    marginTop: 10,
  },
  imageSubText: {
    fontSize: 14,
    color: "#8B98D5",
    marginTop: 5,
  },
  changeImageText: {
    fontSize: 14,
    color: "#4F46E5",
    marginTop: 10,
    fontWeight: "500",
  },

  // Goals Selection
  goalsScrollOuterContainer: {
    borderWidth: 1,
    borderColor: "#3A3F55",
    borderRadius: 12,
    backgroundColor: "#1E1F29",
    marginVertical: 5,
    minHeight: 120,
  },
  goalsScrollContainer: {
    maxHeight: 240,
  },
  goalsContentContainer: {
    padding: 10,
  },
  goalsContainer: {
    flexDirection: "column",
    gap: 10,
  },
  goalItemContainer: {
    marginBottom: 8,
  },
  goalItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2A2C3A",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#3A3F55",
  },
  goalSelected: {
    backgroundColor: "rgba(50, 205, 50, 0.15)",
    borderColor: "rgba(50, 205, 50, 0.5)",
  },
  goalText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#fff",
    flex: 1,
  },
  goalTextSelected: {
    color: "#32CD32",
    fontWeight: "500",
  },
  // Goal date info styles
  goalDateInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 5,
    marginTop: 4,
  },
  goalDateText: {
    fontSize: 12,
    color: "#8B98D5",
    fontStyle: "italic",
  },
  editDatesButton: {
    backgroundColor: "rgba(79, 70, 229, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  editDatesButtonText: {
    fontSize: 11,
    color: "#a5a9ff",
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
    color: "#8B98D5",
    marginLeft: 4,
  },
  goalsSelectionInfo: {
    textAlign: "center",
    fontSize: 14,
    color: "#8B98D5",
    marginTop: 5,
  },

  // Loading
  loadingContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#8B98D5",
    marginTop: 10,
    fontSize: 14,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(22, 23, 31, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loadingOverlayText: {
    color: "#fff",
    marginTop: 16,
    fontSize: 16,
  },

  // No Goals
  noGoalsContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  noGoalsText: {
    color: "#fff",
    marginTop: 10,
    fontSize: 16,
    fontWeight: "600",
  },
  noGoalsSubText: {
    color: "#8B98D5",
    marginTop: 5,
    fontSize: 14,
    textAlign: "center",
  },

  // Create Button
  createButton: {
    backgroundColor: "#4F46E5",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 30,
  },
  createButtonDisabled: {
    backgroundColor: "#2A2C3A",
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
