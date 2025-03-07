import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import TaskModal from "@/components/TaskModal";
import CalendarPicker from "@/components/CalendarPicker";
import { Task } from "@/types/taskTypes";
import { useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  FadeInDown,
} from "react-native-reanimated";

// ====================== Helper Functions ======================
const formatGoalForBackend = (
  userId: string,
  goalData: any,
  taskList: any[]
): any => {
  const formattedTasks = taskList
    .filter((task) => task.status !== "deleted")
    .map((task) => {
      let repeatType = task.type.toLowerCase();

      if (repeatType === "normal") {
        repeatType = "date";
      }

      let dateInterval: string[] = [];
      let weekInterval: number[] = [];

      if (repeatType === "date" || repeatType === "monthly") {
        dateInterval = task.selectedDates || [];
      }

      if (repeatType === "weekly") {
        weekInterval = task.selectedDaysOfWeek || [];
      }

      return {
        title: task.title,
        description: task.description || null,
        repeat_type: repeatType,
        date_interval: dateInterval,
        week_interval: weekInterval,
      };
    });

  return {
    user_id: userId,
    goal: {
      title: goalData.title,
      type: "custom goal",
      start_date: goalData.startDate,
      due_date: goalData.dueDate,
      tasks: formattedTasks,
    },
  };
};

// ====================== Task Type Helpers ======================
const taskTypeLabels: Record<string, string> = {
  normal: "Normal",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

const taskColors: Record<string, string> = {
  normal: "#4F46E5",
  daily: "#4CAF50",
  weekly: "#FFC107",
  monthly: "#FF5733",
};

// ====================== Main Component ======================
export default function CustomGoal({ initialGoal }: { initialGoal?: any }) {
  // ====================== Animation Values ======================
  const headerOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const formOpacity = useSharedValue(0);
  const taskListOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(20);

  // ====================== Animation Setup ======================
  useEffect(() => {
    // Header animation
    headerOpacity.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });

    // Title animation
    titleOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));

    // Form animation
    formOpacity.value = withDelay(500, withTiming(1, { duration: 500 }));

    // Task list animation
    taskListOpacity.value = withDelay(700, withTiming(1, { duration: 500 }));

    // Button animation
    buttonOpacity.value = withDelay(900, withTiming(1, { duration: 400 }));
    buttonTranslateY.value = withDelay(
      900,
      withTiming(0, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, []);

  // ====================== Animated Styles ======================
  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [
      {
        translateY: withTiming(titleOpacity.value * 1 === 1 ? 0 : 20, {
          duration: 500,
        }),
      },
    ],
  }));

  const formAnimatedStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [
      {
        translateY: withTiming(formOpacity.value * 1 === 1 ? 0 : 20, {
          duration: 500,
        }),
      },
    ],
  }));

  const taskListAnimatedStyle = useAnimatedStyle(() => ({
    opacity: taskListOpacity.value,
    transform: [
      {
        translateY: withTiming(taskListOpacity.value * 1 === 1 ? 0 : 20, {
          duration: 500,
        }),
      },
    ],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  // ====================== State Management ======================
  const [goalTitle, setGoalTitle] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [isStartDatePickerVisible, setStartDatePickerVisible] = useState(false);
  const [isDueDatePickerVisible, setDueDatePickerVisible] = useState(false);
  const [taskList, setTaskList] = useState<Task[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isTaskModalVisible, setTaskModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const windowWidth = Dimensions.get("window").width;

  // ====================== Validation Effect ======================
  useEffect(() => {
    setIsFormValid(
      goalTitle.trim() !== "" &&
        startDate !== "" &&
        dueDate !== "" &&
        taskList.filter((task) => task.status !== "deleted").length > 0
    );
  }, [goalTitle, startDate, dueDate, taskList]);

  // ====================== Utility Functions ======================
  const getTaskColor = (type: string) => taskColors[type] || "#888";
  const getTaskLabel = (type: string) => taskTypeLabels[type] || type;

  // ====================== Date Handlers ======================
  const handleDateChange = (newDate: string, type: "start" | "due") => {
    if (taskList.filter((task) => task.status !== "deleted").length > 0) {
      return Alert.alert(
        "Clear Tasks",
        "Changing the date will remove all existing tasks. Continue?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Continue",
            style: "destructive",
            onPress: () => updateDate(newDate, type, true),
          },
        ]
      );
    }
    updateDate(newDate, type);
  };

  const updateDate = (
    newDate: string,
    type: "start" | "due",
    clearTasks = false
  ) => {
    if (type === "start") {
      setStartDate(newDate);
    } else {
      setDueDate(newDate);
    }

    if (clearTasks) setTaskList([]);
  };

  // ====================== Task Handlers ======================
  const handleDeleteTask = (index: number) => {
    setTaskList((prevTaskList) =>
      prevTaskList.map((task, i) =>
        i === index ? { ...task, status: "deleted" } : task
      )
    );
  };

  const handleEditTask = (index: number) => {
    setEditingIndex(index);
    setTaskModalVisible(true);
  };

  const addTask = (task: Task) => {
    const newTask = {
      ...task,
      status: task.status || "pending",
    };

    setTaskList((prevTasks) =>
      editingIndex !== null
        ? prevTasks.map((t, index) => (index === editingIndex ? newTask : t))
        : [...prevTasks, newTask]
    );

    setEditingIndex(null);
  };

  // ====================== Submit Handler ======================
  const handleSubmit = () => {
    if (!isFormValid) {
      Alert.alert(
        "Incomplete Goal",
        "Please fill all required fields and add at least one task.",
        [{ text: "OK" }]
      );
      return;
    }

    if (!isLoaded || !isSignedIn) {
      Alert.alert("Authentication Error", "Please sign in to save your goal.");
      return;
    }

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      const userId = user?.id;

      if (!userId) {
        Alert.alert("Error", "Could not get user ID. Please try again later.");
        setIsLoading(false);
        return;
      }

      const newGoal = {
        title: goalTitle,
        startDate,
        dueDate,
        tasks: taskList,
      };

      const formattedGoalData = formatGoalForBackend(userId, newGoal, taskList);
      console.log(
        "📌 Formatted for Backend:",
        JSON.stringify(formattedGoalData, null, 2)
      );

      // Show success and navigate back
      Alert.alert(
        "Success!",
        "Your custom goal has been created successfully.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
      setIsLoading(false);
    }, 1500);
  };

  // ====================== Back Button Handler ======================
  const handleBack = () => {
    if (
      goalTitle.trim() !== "" ||
      startDate !== "" ||
      dueDate !== "" ||
      taskList.filter((task) => task.status !== "deleted").length > 0
    ) {
      Alert.alert(
        "Discard Changes",
        "Are you sure you want to discard your changes?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      router.back();
    }
  };

  // ====================== Load Initial Data ======================
  useEffect(() => {
    if (initialGoal) {
      setGoalTitle(initialGoal.title);
      setStartDate(initialGoal.startDate);
      setDueDate(initialGoal.dueDate);

      const updatedTasks = (initialGoal.tasks ?? []).map((task: Task) => ({
        ...task,
      }));

      setTaskList(updatedTasks);
    }
  }, [initialGoal]);

  // ====================== Render UI ======================
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Header with Back Button */}
      <Animated.View style={[styles.header, headerAnimatedStyle]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="white" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Section */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Animated.View style={[styles.titleContainer, titleAnimatedStyle]}>
            <Text style={styles.title}>Create Custom Goal</Text>
            <Text style={styles.subtitle}>
              Design your path to success, one step at a time
            </Text>
          </Animated.View>
        </Animated.View>

        {/* Form Section */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)}>
          <Animated.View style={[styles.formSection, formAnimatedStyle]}>
            {/* Goal Title Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Goal Title <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                value={goalTitle}
                onChangeText={setGoalTitle}
                placeholder="What do you want to achieve?"
                placeholderTextColor="#AAA"
                style={styles.input}
                multiline={true}
                maxLength={100}
              />
            </View>

            {/* Date Pickers */}
            <View style={styles.dateContainer}>
              <View style={styles.dateBox}>
                <Text style={styles.inputLabel}>
                  Start Date <Text style={styles.required}>*</Text>
                </Text>
                <Pressable
                  style={[
                    styles.dateInput,
                    startDate ? styles.dateInputSelected : {},
                  ]}
                  onPress={() => setStartDatePickerVisible(true)}
                >
                  <Text style={{ color: startDate ? "#fff" : "#AAA" }}>
                    {startDate || "Select Date"}
                  </Text>
                  <Feather name="calendar" size={20} color="#fff" />
                </Pressable>
              </View>
              <View style={styles.dateBox}>
                <Text style={styles.inputLabel}>
                  End Date <Text style={styles.required}>*</Text>
                </Text>
                <Pressable
                  style={[
                    styles.dateInput,
                    dueDate ? styles.dateInputSelected : {},
                  ]}
                  onPress={() => setDueDatePickerVisible(true)}
                >
                  <Text style={{ color: dueDate ? "#fff" : "#AAA" }}>
                    {dueDate || "Select Date"}
                  </Text>
                  <Feather name="calendar" size={20} color="#fff" />
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </Animated.View>

        {/* Task Section */}
        <Animated.View entering={FadeInDown.delay(600).duration(500)}>
          <Animated.View style={[styles.taskSection, taskListAnimatedStyle]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Tasks</Text>
              <Text style={styles.sectionDescription}>
                Break down your goal into manageable tasks
              </Text>
            </View>

            {/* Task List */}
            {taskList.filter((task) => task.status !== "deleted").length > 0 ? (
              <View style={styles.taskListContainer}>
                {taskList
                  .filter((task) => task.status !== "deleted")
                  .map((task, index) => (
                    <View key={index} style={styles.taskItem}>
                      <View
                        style={[
                          styles.taskTypeIndicator,
                          { backgroundColor: getTaskColor(task.type) },
                        ]}
                      />
                      <View style={styles.taskContent}>
                        <View style={styles.taskHeader}>
                          <Text style={styles.taskType}>
                            {getTaskLabel(task.type)}
                          </Text>
                          <Text style={styles.taskTitle}>{task.title}</Text>
                        </View>
                        {task.description && (
                          <Text
                            style={styles.taskDescription}
                            numberOfLines={2}
                          >
                            {task.description}
                          </Text>
                        )}
                        <View style={styles.taskStats}>
                          {task.type === "normal" && task.selectedDates && (
                            <Text style={styles.taskDates}>
                              {task.selectedDates.length} date
                              {task.selectedDates.length !== 1 ? "s" : ""}
                            </Text>
                          )}
                          {task.type === "weekly" &&
                            task.selectedDaysOfWeek && (
                              <Text style={styles.taskDates}>
                                {task.selectedDaysOfWeek.length} day
                                {task.selectedDaysOfWeek.length !== 1
                                  ? "s"
                                  : ""}
                                /week
                              </Text>
                            )}
                          {task.type === "monthly" && (
                            <Text style={styles.taskDates}>Monthly task</Text>
                          )}
                        </View>
                      </View>
                      <View style={styles.taskActions}>
                        <TouchableOpacity
                          style={styles.taskAction}
                          onPress={() => handleEditTask(index)}
                        >
                          <Ionicons name="pencil" size={20} color="#4F46E5" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.taskAction}
                          onPress={() => handleDeleteTask(index)}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={20}
                            color="#FF3B30"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
              </View>
            ) : (
              <View style={styles.emptyTaskList}>
                <Ionicons name="list" size={40} color="#CCC" />
                <Text style={styles.emptyTaskText}>No tasks added yet</Text>
                <Text style={styles.emptyTaskSubtext}>
                  Add tasks to break down your goal
                </Text>
              </View>
            )}

            {/* Add Task Button */}
            <TouchableOpacity
              style={[
                styles.addTaskButton,
                !(startDate && dueDate) && styles.disabledButton,
              ]}
              onPress={() => {
                if (startDate && dueDate) {
                  setEditingIndex(null);
                  setTaskModalVisible(true);
                } else {
                  Alert.alert(
                    "Set Dates First",
                    "Please set start and end dates before adding tasks."
                  );
                }
              }}
              disabled={!(startDate && dueDate)}
            >
              <Ionicons
                name="add-circle-outline"
                size={20}
                color={startDate && dueDate ? "#FFF" : "#AAA"}
              />
              <Text
                style={[
                  styles.addTaskButtonText,
                  !(startDate && dueDate) && styles.disabledButtonText,
                ]}
              >
                Add Task
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>

        {/* Create Button */}
        <Animated.View style={[buttonAnimatedStyle, { width: "100%" }]}>
          <TouchableOpacity
            style={[
              styles.createButton,
              !isFormValid && styles.disabledCreateButton,
            ]}
            onPress={handleSubmit}
            disabled={!isFormValid || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color="#FFF"
                />
                <Text style={styles.createButtonText}>Create Goal</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Test Buttons */}
        <View style={styles.testButtonsContainer}>
          <TouchableOpacity
            style={styles.testButton}
            onPress={() => {
              const goalData = {
                title: goalTitle,
                startDate: startDate || "Not Set",
                dueDate: dueDate || "Not Set",
              };
              const taskData = taskList.map((task) => ({ ...task }));
              console.log(
                "📌 Current Goal Data:",
                JSON.stringify(goalData, null, 2)
              );
              console.log("📌 Task List:", JSON.stringify(taskData, null, 2));
            }}
          >
            <Text style={styles.testButtonText}>Get Test Log</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testButton}
            onPress={() => {
              // Mock Data
              setGoalTitle("My New Goal");
              setStartDate("2025-03-01");
              setDueDate("2025-03-21");
              setTaskList([
                {
                  title: "Task 1",
                  description: "Read a book",
                  type: "normal",
                  selectedDates: ["2025-03-02", "2025-03-05", "2025-03-07"],
                  selectedDaysOfWeek: [] as number[],
                  status: "pending",
                },
                {
                  title: "Task 2",
                  description: "Exercise",
                  type: "daily",
                  selectedDates: [],
                  selectedDaysOfWeek: [] as number[],
                  status: "pending",
                },
                {
                  title: "Task 3",
                  description: "Practice coding",
                  type: "weekly",
                  selectedDates: [],
                  selectedDaysOfWeek: [1, 3, 5],
                  status: "pending",
                },
                {
                  title: "Task 4",
                  description: "Plan the month",
                  type: "monthly",
                  selectedDates: ["2025-03-16"],
                  selectedDaysOfWeek: [] as number[],
                  status: "pending",
                },
              ]);
              console.log("📌 Mock Data Loaded!");
            }}
          >
            <Text style={styles.testButtonText}>Load Test Data</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modals */}
      <View>
        <TaskModal
          visible={isTaskModalVisible}
          onClose={() => {
            setTaskModalVisible(false);
            setEditingIndex(null);
          }}
          onSave={addTask}
          initialTask={
            editingIndex !== null ? taskList[editingIndex] : undefined
          }
          startDate={startDate}
          dueDate={dueDate}
        />
      </View>

      <View>
        <CalendarPicker
          visible={isStartDatePickerVisible}
          onClose={() => setStartDatePickerVisible(false)}
          onConfirm={(dates) => {
            handleDateChange(dates[0], "start");
            setStartDatePickerVisible(false);
          }}
          title="Select Start Date"
          initialDates={startDate ? [startDate] : []}
          highlightColor="#4F46E5"
          singleSelect
          minDate={new Date().toISOString().split("T")[0]}
          maxDate={dueDate}
          otherSelectedDate={dueDate}
          otherHighlightColor="#FF5733"
        />
      </View>

      <View>
        <CalendarPicker
          visible={isDueDatePickerVisible}
          onClose={() => setDueDatePickerVisible(false)}
          onConfirm={(dates) => {
            handleDateChange(dates[0], "due");
            setDueDatePickerVisible(false);
          }}
          title="Select End Date"
          initialDates={dueDate ? [dueDate] : []}
          highlightColor="#FF5733"
          singleSelect
          minDate={startDate || new Date().toISOString().split("T")[0]}
          otherSelectedDate={startDate}
          otherHighlightColor="#4F46E5"
        />
      </View>

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Creating your goal...</Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 100,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },

  // Header Styles
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === "ios" ? 60 : 30,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#16171F",
    zIndex: 10,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  backText: {
    color: "#fff",
    marginLeft: 8,
    fontSize: 16,
  },

  // Title Styles
  titleContainer: {
    marginBottom: 24,
  },
  title: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    color: "#AAA",
    fontSize: 16,
  },

  // Form Section
  formSection: {
    backgroundColor: "#1E1F29",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  required: {
    color: "#FF5733",
  },
  input: {
    backgroundColor: "#2A2C3A",
    borderRadius: 12,
    padding: 16,
    color: "#fff",
    fontSize: 16,
  },

  // Date Pickers
  dateContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dateBox: {
    flex: 1,
    marginHorizontal: 4,
  },
  dateInput: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#2A2C3A",
    padding: 16,
    borderRadius: 12,
  },
  dateInputSelected: {
    backgroundColor: "#4F46E5",
  },

  // Task Section
  taskSection: {
    backgroundColor: "#1E1F29",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  sectionDescription: {
    color: "#AAA",
    fontSize: 14,
  },

  // Task List
  taskListContainer: {
    marginBottom: 16,
  },
  taskItem: {
    flexDirection: "row",
    backgroundColor: "#2A2C3A",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  taskTypeIndicator: {
    width: 6,
    height: "100%",
  },
  taskContent: {
    flex: 1,
    padding: 16,
    paddingRight: 8,
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  taskTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  taskType: {
    color: "#AAA",
    fontSize: 12,
    backgroundColor: "#16171F",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  taskDescription: {
    color: "#BBB",
    fontSize: 14,
    marginBottom: 8,
  },
  taskStats: {
    flexDirection: "row",
  },
  taskDates: {
    color: "#AAA",
    fontSize: 12,
  },
  taskActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingRight: 12,
  },
  taskAction: {
    padding: 8,
  },

  // Empty State
  emptyTaskList: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  emptyTaskText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "500",
    marginTop: 12,
  },
  emptyTaskSubtext: {
    color: "#AAA",
    fontSize: 14,
    marginTop: 4,
  },

  // Add Task Button
  addTaskButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    padding: 14,
    borderRadius: 12,
  },
  addTaskButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: "#2A2C3A",
  },
  disabledButtonText: {
    color: "#AAA",
  },

  // Create Button
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4CAF50",
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 8,
  },
  disabledCreateButton: {
    backgroundColor: "#2A2C3A",
  },

  // Test Buttons
  testButtonsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 20,
    gap: 10,
  },
  testButton: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  testButtonText: {
    color: "#FFF",
    fontWeight: "500",
    fontSize: 14,
  },

  // Loading Overlay
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(22, 23, 31, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 16,
  },
});
