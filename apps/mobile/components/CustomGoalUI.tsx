import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Alert } from "@/utils/alert";
import { useScreenTopPadding } from "@/constants/layout";
import { Feather, Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { format, isValid, parseISO } from "date-fns";
import i18n, { dateLocale, useTranslation } from "@/i18n";

// Show a stored yyyy-MM-dd date as weekday, month and day, e.g. "Fri, Oct 16".
// parseISO reads date-only strings as local dates, so no timezone shift.
const formatPickedDate = (value: string) => {
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, "EEE, MMM d", { locale: dateLocale() }) : value;
};

type Task = {
  title: string;
  description?: string;
  type: "normal" | "daily" | "weekly" | "monthly";
  selectedDates?: string[];
  selectedDaysOfWeek?: number[];
  monthlyMode?: "start" | "mid" | "end";
  status: "pending" | "completed" | "failed" | "deleted";
};

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
  isEditingGoal: boolean;

  // Event Handlers
  setGoalTitle: (text: string) => void;
  handleBack: () => void;
  setStartDatePickerVisible: (visible: boolean) => void;
  setDueDatePickerVisible: (visible: boolean) => void;
  handleEditTask: (index: number) => void;
  handleDeleteTask: (index: number) => void;

  setTaskModalVisible: (visible: boolean) => void;
  handleSubmit: () => void;
  handleUpdate: () => void;
  /** Shown for new goals and drafts (not for started goals). */
  handleSaveDraft?: () => void;

  // Debug Functions
  testLogData: () => void;
};

// Helper Functions
const getTaskColor = (type: string) => {
  const taskColors: Record<string, string> = {
    normal: "#D500F9",
    daily: "#00BFA5",
    weekly: "#FFC400",
    monthly: "#FF7043",
  };
  return taskColors[type] || "#888";
};

const getTaskLabel = (type: string) =>
  i18n.t(`goalForm.taskTypes.${type}` as "goalForm.taskTypes.normal", { defaultValue: type });

// Status Color Helper
const getStatusColor = (status: string) => {
  const statusColors: Record<string, string> = {
    pending: "#4F46E5",
    completed: "#4CAF50",
    failed: "#B71C1C",
  };
  return statusColors[status] || "#888";
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

  setTaskModalVisible,
  handleSubmit,
  handleUpdate,
  handleSaveDraft,
}) => {
  // The header floats over the content: pad it below the notch, and start the
  // content under the header's real height (was a fixed 100 px).
  const { t } = useTranslation();
  const headerTop = useScreenTopPadding(12);
  const [headerHeight, setHeaderHeight] = useState(headerTop + 52);

  return (
    <>
      {/* Header with Back Button */}
      <Animated.View
        style={[styles.header, { paddingTop: headerTop }, headerAnimatedStyle]}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
      >
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="white" />
          <Text style={styles.backText}>{t("common.back")}</Text>
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: headerHeight + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Section */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Animated.View style={[styles.titleContainer, titleAnimatedStyle]}>
            <Text style={styles.title}>{t("goalForm.title")}</Text>
            <Text style={styles.subtitle}>
              {t("goalForm.subtitle")}
            </Text>
          </Animated.View>
        </Animated.View>

        {/* Form Section */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)}>
          <Animated.View style={[styles.formSection, formAnimatedStyle]}>
            {/* Goal Title Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {t("goalForm.goalTitle")} <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                value={goalTitle}
                onChangeText={setGoalTitle}
                placeholder={t("goalForm.goalTitlePlaceholder")}
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
                  {t("goalForm.startDate")} <Text style={styles.required}>*</Text>
                </Text>
                <View style={{ position: "relative" }}>
                  <Pressable
                    style={[
                      styles.dateInput,
                      startDate ? styles.dateInputSelected : {},
                      goalStarted && styles.disabledButton,
                    ]}
                    onPress={() =>
                      !goalStarted && setStartDatePickerVisible(true)
                    }
                    disabled={goalStarted}
                  >
                    <Text style={{ color: startDate ? "#fff" : "#AAA" }}>
                      {startDate ? formatPickedDate(startDate) : t("goalForm.selectDate")}
                    </Text>
                    <Feather name="calendar" size={20} color="#fff" />
                  </Pressable>
                  {goalStarted && <View style={styles.disabledOverlay} />}
                </View>
              </View>
              <View style={styles.dateBox}>
                <Text style={styles.inputLabel}>
                  {t("goalForm.endDate")} <Text style={styles.required}>*</Text>
                </Text>
                <View style={{ position: "relative" }}>
                  <Pressable
                    style={[
                      styles.dateInput,
                      dueDate ? styles.dateInputSelected : {},
                      goalStarted && styles.disabledButton,
                    ]}
                    onPress={() =>
                      !goalStarted && setDueDatePickerVisible(true)
                    }
                    disabled={goalStarted}
                  >
                    <Text style={{ color: dueDate ? "#fff" : "#AAA" }}>
                      {dueDate ? formatPickedDate(dueDate) : t("goalForm.selectDate")}
                    </Text>
                    <Feather name="calendar" size={20} color="#fff" />
                  </Pressable>
                  {goalStarted && <View style={styles.disabledOverlay} />}
                </View>
              </View>
            </View>

            {/* Warning message for date changes if goal has started */}
            {goalStarted && (
              <View style={styles.warningContainer}>
                <Ionicons
                  name="warning-outline"
                  size={18}
                  color="#FF5733"
                  style={styles.warningIcon}
                />
                <Text style={styles.warningText}>
                  {t("goalForm.datesLocked")}
                </Text>
              </View>
            )}
          </Animated.View>
        </Animated.View>

        {/* Task Section */}
        <Animated.View entering={FadeInDown.delay(600).duration(500)}>
          <Animated.View style={[styles.taskSection, taskListAnimatedStyle]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t("goalForm.tasks")}</Text>
              <Text style={styles.sectionDescription}>
                {t("goalForm.tasksDescription")}
              </Text>
            </View>

            {/* Task Progress Summary */}
            {taskList.length > 0 && <TaskProgressSummary taskList={taskList} />}

            {/* Warning message for task modifications if goal has started */}
            {goalStarted && taskList.length > 0 && (
              <View
                style={[styles.warningContainer, styles.taskSectionWarning]}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color="#FF5733"
                  style={styles.warningIcon}
                />
                <Text style={styles.warningText}>
                  {t("goalForm.limitedEditing")}
                </Text>
              </View>
            )}

            {/* Task List with Status Grouping */}
            {taskList.length > 0 ? (
              <TaskList
                taskList={taskList}
                handleEditTask={handleEditTask}
                handleDeleteTask={handleDeleteTask}
                goalStarted={goalStarted}
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
                    t("goalForm.cannotAddTitle"),
                    t("goalForm.cannotAddMessage")
                  );
                  return;
                }

                if (startDate && dueDate) {
                  setTaskModalVisible(true);
                } else {
                  Alert.alert(
                    t("goalForm.setDatesTitle"),
                    t("goalForm.setDatesMessage")
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
                {t("goalForm.addTask")}
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
            onPress={isEditingGoal ? handleUpdate : handleSubmit}
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
                  {isEditingGoal ? t("goalForm.updateGoal") : t("goalForm.startGoal")}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Plan now, start later: drafts stay fully editable. */}
          {!!handleSaveDraft && (
            <TouchableOpacity
              style={styles.draftButton}
              onPress={handleSaveDraft}
              disabled={isLoading}
              accessibilityRole="button"
            >
              <Ionicons name="document-text-outline" size={20} color="#4E5A94" />
              <Text style={styles.draftButtonText}>{t("goalForm.saveDraft")}</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </ScrollView>

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>{t("goalForm.creating")}</Text>
        </View>
      )}
    </>
  );
};

// ====================== Sub-Components ======================

// Task Progress Summary
const TaskProgressSummary = ({ taskList }: { taskList: Task[] }) => {
  const { t } = useTranslation();
  const pendingCount = taskList.filter((t) => t.status === "pending").length;
  const completedCount = taskList.filter(
    (t) => t.status === "completed"
  ).length;
  const failedCount = taskList.filter((t) => t.status === "failed").length;

  const pendingWidth = (pendingCount / taskList.length) * 100;
  const completedWidth = (completedCount / taskList.length) * 100;
  const failedWidth = (failedCount / taskList.length) * 100;

  return (
    <View>
      <View style={styles.progressSummary}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>{t("goalForm.progressSummary")}</Text>
          <Text style={styles.progressTotal}>
            {t("goalForm.totalTasks", { count: taskList.length })}
          </Text>
        </View>

        <View style={styles.progressContainer}>
          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarContent}>
              {pendingCount > 0 && (
                <View
                  style={[
                    styles.progressBarSegment,
                    {
                      backgroundColor: getStatusColor("pending"),
                      width: `${pendingWidth}%`,
                    },
                  ]}
                />
              )}
              {completedCount > 0 && (
                <View
                  style={[
                    styles.progressBarSegment,
                    {
                      backgroundColor: getStatusColor("completed"),
                      width: `${completedWidth}%`,
                    },
                  ]}
                />
              )}
              {failedCount > 0 && (
                <View
                  style={[
                    styles.progressBarSegment,
                    {
                      backgroundColor: getStatusColor("failed"),
                      width: `${failedWidth}%`,
                    },
                  ]}
                />
              )}
            </View>
          </View>

          {/* Progress Legend */}
          <View style={styles.progressLegend}>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendIndicator,
                  { backgroundColor: getStatusColor("pending") },
                ]}
              />
              <Text style={styles.legendText}>{t("goalForm.pendingCount", { count: pendingCount })}</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendIndicator,
                  { backgroundColor: getStatusColor("completed") },
                ]}
              />
              <Text style={styles.legendText}>
                {t("goalForm.completedCount", { count: completedCount })}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendIndicator,
                  { backgroundColor: getStatusColor("failed") },
                ]}
              />
              <Text style={styles.legendText}>{t("goalForm.failedCount", { count: failedCount })}</Text>
            </View>
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
  goalStarted,
}: {
  taskList: Task[];
  handleEditTask: (index: number) => void;
  handleDeleteTask: (index: number) => void;
  goalStarted: boolean;
}) => {
  const { t } = useTranslation();
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
                  { backgroundColor: getStatusColor(status) },
                ]}
              />
              <Text style={styles.statusTitle}>
                {status === "pending"
                  ? t("goalForm.pendingTasks")
                  : status === "completed"
                  ? t("goalForm.completedTasks")
                  : t("goalForm.failedTasks")}
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
                goalStarted={goalStarted}
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
  goalStarted,
}: {
  task: Task;
  index: number;
  handleEditTask: (index: number) => void;
  handleDeleteTask: (index: number) => void;
  goalStarted: boolean;
}) => {
  const { t } = useTranslation();
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
        {!!task.description && (
          <Text style={styles.taskDescription} numberOfLines={2}>
            {task.description}
          </Text>
        )}
        <View style={styles.taskStats}>
          {task.type === "normal" && task.selectedDates && (
            <Text style={styles.taskDates}>
              {t("goalForm.dates", { count: task.selectedDates.length })}
            </Text>
          )}
          {task.type === "weekly" && task.selectedDaysOfWeek && (
            <Text style={styles.taskDates}>
              {t("goalForm.daysPerWeek", { count: task.selectedDaysOfWeek.length })}
            </Text>
          )}
          {task.type === "monthly" && (
            <Text style={styles.taskDates}>{t("goalForm.monthlyTask")}</Text>
          )}
        </View>
      </View>
      <View style={styles.taskActions}>
        <TouchableOpacity
          style={styles.taskAction}
          onPress={() => handleEditTask(index)}
          accessibilityRole="button"
          accessibilityLabel={t("goalForm.editTask", { title: task.title })}
        >
          <Ionicons name="pencil" size={20} color="#4F46E5" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.taskAction}
          onPress={() => !goalStarted && handleDeleteTask(index)}
          disabled={goalStarted}
          accessibilityRole="button"
          accessibilityLabel={t("goalForm.deleteTask", { title: task.title })}
          accessibilityState={{ disabled: goalStarted }}
        >
          {/* Neutral grey when disabled (started goals can't remove tasks);
              a faded red still read as an active delete button. */}
          <Ionicons
            name="trash-outline"
            size={20}
            color={goalStarted ? "#6B6F80" : "#FF3B30"}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Empty Task List
const EmptyTaskList = () => {
  const { t } = useTranslation();
  return (
    <View style={styles.emptyTaskList}>
      <Ionicons name="list" size={40} color="#CCC" />
      <Text style={styles.emptyTaskText}>{t("goalForm.noTasks")}</Text>
      <Text style={styles.emptyTaskSubtext}>
        {t("goalForm.noTasksHint")}
      </Text>
    </View>
  );
};

// ====================== Styles ======================
const styles = StyleSheet.create({
  // Main Layout
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 20,
  },

  // Header Styles
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
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

  // disable
  disabledOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(70, 70, 70, 0.4)",
    borderRadius: 12,
    zIndex: 1,
  },
  disabledButton: {
    backgroundColor: "#2A2C3A",
    opacity: 0.5,
    position: "relative",
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
  draftButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#4E5A94",
    padding: 14,
    borderRadius: 12,
    marginVertical: 4,
  },
  draftButtonText: {
    color: "#4E5A94",
    fontSize: 16,
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

  //warning
  warningContainer: {
    backgroundColor: "rgba(255, 87, 51, 0.1)",
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  warningIcon: {
    marginRight: 8,
  },
  warningText: {
    color: "#FF5733",
    fontSize: 13,
    flex: 1,
  },
  taskSectionWarning: {
    marginTop: 5,
    marginBottom: 15,
  },
});

export default CustomGoalUI;
