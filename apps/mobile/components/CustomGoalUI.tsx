import React from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Task } from "@/types/taskTypes";

// ====================== Type Definitions ======================
type CustomGoalUIProps = {
  // Animation Styles
  headerAnimatedStyle: any;
  titleAnimatedStyle: any;
  formAnimatedStyle: any;
  taskListAnimatedStyle: any;
  buttonAnimatedStyle: any;

  // Data
  goalTitle: string;
  startDate: string;
  dueDate: string;
  taskList: Task[];
  isFormValid: boolean;
  isLoading: boolean;
  goalStarted: boolean;
  isEditingGoal: boolean; // ✅ เพิ่มตัวแปรนี้

  // Event Handlers
  setGoalTitle: (text: string) => void;
  handleBack: () => void;
  setStartDatePickerVisible: (visible: boolean) => void;
  setDueDatePickerVisible: (visible: boolean) => void;
  handleEditTask: (index: number) => void;
  handleDeleteTask: (index: number) => void;
  setEditingIndex: (index: number | null) => void;
  setTaskModalVisible: (visible: boolean) => void;
  handleSubmit: () => void;

  // Debug Functions
  testLogData: () => void;
  setIsEditingGoal: (isEditing: boolean) => void; // ✅ เพิ่มตัวแปรนี้
};

// Helper Functions
const getTaskColor = (type: string) => {
  const taskColors: Record<string, string> = {
    normal: "#4F46E5",
    daily: "#4CAF50",
    weekly: "#FFC107",
    monthly: "#FF5733",
  };
  return taskColors[type] || "#888";
};

const getTaskLabel = (type: string) => {
  const taskTypeLabels: Record<string, string> = {
    normal: "Normal",
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
  };
  return taskTypeLabels[type] || type;
};

// ====================== Main Component ======================
const CustomGoalUI: React.FC<CustomGoalUIProps> = ({
  // Animation Styles
  headerAnimatedStyle,
  titleAnimatedStyle,
  formAnimatedStyle,
  taskListAnimatedStyle,
  buttonAnimatedStyle,

  // Data
  goalTitle,
  startDate,
  dueDate,
  taskList,
  isFormValid,
  isLoading,
  goalStarted,
  isEditingGoal,

  // Event Handlers
  setGoalTitle,
  handleBack,
  setStartDatePickerVisible,
  setDueDatePickerVisible,
  handleEditTask,
  handleDeleteTask,
  setEditingIndex,
  setTaskModalVisible,
  handleSubmit,

  // Debug Functions
  testLogData,
}) => {
  return (
    <>
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

            {/* Task Progress Summary */}
            {taskList.length > 0 && <TaskProgressSummary taskList={taskList} />}

            {/* Task List with Status Grouping */}
            {taskList.length > 0 ? (
              <TaskList
                taskList={taskList}
                handleEditTask={handleEditTask}
                handleDeleteTask={handleDeleteTask}
              />
            ) : (
              <EmptyTaskList />
            )}

            {/* Add Task Button */}
            <TouchableOpacity
              style={[
                styles.addTaskButton,
                (!(startDate && dueDate) || goalStarted) &&
                  styles.disabledButton,
              ]}
              onPress={() => {
                if (goalStarted) {
                  Alert.alert(
                    "Cannot Add Tasks",
                    "This goal has already started. New tasks cannot be added."
                  );
                  return;
                }

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
              disabled={!(startDate && dueDate) || goalStarted}
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
                <Text style={styles.createButtonText}>
                  {isEditingGoal ? "Update Goal" : "Create Goal"}{" "}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Test Log Button */}
        <View style={styles.testButtonsContainer}>
          <TouchableOpacity style={styles.testButton} onPress={testLogData}>
            <Text style={styles.testButtonText}>Log Current State</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Creating your goal...</Text>
        </View>
      )}
    </>
  );
};

// ====================== Sub-Components ======================

// Task Progress Summary Component
const TaskProgressSummary = ({ taskList }: { taskList: Task[] }) => {
  const pendingCount = taskList.filter((t) => t.status === "pending").length;
  const completedCount = taskList.filter(
    (t) => t.status === "completed"
  ).length;
  const failedCount = taskList.filter((t) => t.status === "failed").length;

  const pendingWidth = (pendingCount / taskList.length) * 100;
  const completedWidth = (completedCount / taskList.length) * 100;
  const failedWidth = (failedCount / taskList.length) * 100;

  return (
    <View style={styles.progressSummary}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressTitle}>Progress Summary</Text>
        <Text style={styles.progressTotal}>{taskList.length} total tasks</Text>
      </View>

      <View style={styles.progressContainer}>
        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarContent}>
            {pendingCount > 0 && (
              <View
                style={[
                  styles.progressBarSegment,
                  styles.pendingSegment,
                  { width: `${pendingWidth}%` },
                ]}
              />
            )}
            {completedCount > 0 && (
              <View
                style={[
                  styles.progressBarSegment,
                  styles.completedSegment,
                  { width: `${completedWidth}%` },
                ]}
              />
            )}
            {failedCount > 0 && (
              <View
                style={[
                  styles.progressBarSegment,
                  styles.failedSegment,
                  { width: `${failedWidth}%` },
                ]}
              />
            )}
          </View>
        </View>

        {/* Progress Legend */}
        <View style={styles.progressLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendIndicator, styles.pendingIndicator]} />
            <Text style={styles.legendText}>Pending ({pendingCount})</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendIndicator, styles.completedIndicator]} />
            <Text style={styles.legendText}>Completed ({completedCount})</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendIndicator, styles.failedIndicator]} />
            <Text style={styles.legendText}>Failed ({failedCount})</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

// Task List Component
const TaskList = ({
  taskList,
  handleEditTask,
  handleDeleteTask,
}: {
  taskList: Task[];
  handleEditTask: (index: number) => void;
  handleDeleteTask: (index: number) => void;
}) => {
  return (
    <View style={styles.taskListContainer}>
      {/* Group tasks by status */}
      {["pending", "completed", "failed"].map((status) => {
        const tasksInGroup = taskList.filter((task) => task.status === status);
        if (tasksInGroup.length === 0) return null;
        return (
          <View key={status} style={styles.taskStatusGroup}>
            {/* Status Header */}
            <View style={styles.statusHeader}>
              <View
                style={[
                  styles.statusIndicator,
                  status === "pending"
                    ? styles.pendingIndicator
                    : status === "completed"
                    ? styles.completedIndicator
                    : styles.failedIndicator,
                ]}
              />
              <Text style={styles.statusTitle}>
                {status === "pending"
                  ? "Pending Tasks"
                  : status === "completed"
                  ? "Completed Tasks"
                  : "Failed Tasks"}
              </Text>
              <View style={styles.statusCount}>
                <Text style={styles.statusCountText}>
                  {tasksInGroup.length}
                </Text>
              </View>
            </View>

            {/* Tasks in this status group */}
            {tasksInGroup.map((task, index) => (
              <TaskItem
                key={index}
                task={task}
                index={taskList.indexOf(task)}
                handleEditTask={handleEditTask}
                handleDeleteTask={handleDeleteTask}
              />
            ))}
          </View>
        );
      })}
    </View>
  );
};

// Individual Task Item Component
const TaskItem = ({
  task,
  index,
  handleEditTask,
  handleDeleteTask,
}: {
  task: Task;
  index: number;
  handleEditTask: (index: number) => void;
  handleDeleteTask: (index: number) => void;
}) => {
  return (
    <View style={styles.taskItem}>
      <View
        style={[
          styles.taskTypeIndicator,
          { backgroundColor: getTaskColor(task.type) },
        ]}
      />
      <View style={styles.taskContent}>
        <View style={styles.taskHeader}>
          <Text style={styles.taskType}>{getTaskLabel(task.type)}</Text>
          <Text style={styles.taskTitle}>{task.title}</Text>
        </View>
        {task.description && (
          <Text style={styles.taskDescription} numberOfLines={2}>
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
          {task.type === "weekly" && task.selectedDaysOfWeek && (
            <Text style={styles.taskDates}>
              {task.selectedDaysOfWeek.length} day
              {task.selectedDaysOfWeek.length !== 1 ? "s" : ""}
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
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Empty Task List Component
const EmptyTaskList = () => {
  return (
    <View style={styles.emptyTaskList}>
      <Ionicons name="list" size={40} color="#CCC" />
      <Text style={styles.emptyTaskText}>No tasks added yet</Text>
      <Text style={styles.emptyTaskSubtext}>
        Add tasks to break down your goal
      </Text>
    </View>
  );
};

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
  },
  testButton: {
    backgroundColor: "rgba(79, 70, 229, 0.7)",
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

  // task status
  taskStatusGroup: {
    marginBottom: 20,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  pendingIndicator: {
    backgroundColor: "#4F46E5", // Blue for pending
  },
  completedIndicator: {
    backgroundColor: "#4CAF50", // Green for completed
  },
  failedIndicator: {
    backgroundColor: "#FF3B30", // Red for failed
  },
  statusTitle: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  statusCount: {
    backgroundColor: "#2A2C3A",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusCountText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  // Progress Summary Styles
  progressSummary: {
    backgroundColor: "#2A2C3A",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  progressTitle: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "500",
  },
  progressTotal: {
    color: "#AAA",
    fontSize: 14,
  },
  progressContainer: {
    gap: 12,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: "#16171F",
    borderRadius: 6,
    overflow: "hidden",
  },
  progressBarContent: {
    height: "100%",
    width: "100%",
    flexDirection: "row",
  },
  progressBarSegment: {
    height: "100%",
  },
  pendingSegment: {
    backgroundColor: "#4F46E5",
  },
  completedSegment: {
    backgroundColor: "#4CAF50",
  },
  failedSegment: {
    backgroundColor: "#FF3B30",
  },
  progressLegend: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    marginBottom: 4,
  },
  legendIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    color: "#AAA",
    fontSize: 12,
  },
});

export default CustomGoalUI;
