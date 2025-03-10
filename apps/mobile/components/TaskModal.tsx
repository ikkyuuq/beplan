import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Switch,
  Keyboard,
  TextInput,
  Pressable,
  StyleSheet,
  TouchableWithoutFeedback,
  Alert,
} from "react-native";
import Modal from "react-native-modal";
import CalendarPicker from "./CalendarPicker";
import { format, eachMonthOfInterval, getDaysInMonth } from "date-fns";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Task } from "@/types/taskTypes";
import { Ionicons } from "@expo/vector-icons";

// ====================== Type Definitions ======================
type TaskModalProps = {
  visible: boolean;
  initialTask?: Task;
  startDate: string;
  dueDate: string;
  onClose: () => void;
  onSave: (task: Task) => void;
  restrictEditing?: boolean;
};

// ====================== Main Component ======================
export default function TaskModal({
  visible,
  initialTask,
  startDate,
  dueDate,
  onClose,
  onSave,
  restrictEditing,
}: TaskModalProps) {
  // ====================== State Management ======================
  const [taskTitle, setTaskTitle] = useState(initialTask?.title || "");
  const [taskDescription, setTaskDescription] = useState(
    initialTask?.description || ""
  );
  const defaultTaskType = initialTask?.type || "normal";
  const [taskType, setTaskType] = useState(defaultTaskType);
  const [monthlyMode, setMonthlyMode] = useState<"start" | "mid" | "end">(
    initialTask?.monthlyMode || "start"
  );
  const [isRepeat, setIsRepeat] = useState(defaultTaskType !== "normal");
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [selectedDates, setSelectedDates] = useState<string[]>(
    initialTask?.selectedDates ?? []
  );
  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState<number[]>(
    initialTask?.selectedDaysOfWeek ?? []
  );

  // ====================== Animation Values ======================
  const modalTranslateY = useSharedValue(300);
  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: modalTranslateY.value }],
  }));

  // ====================== Animation Effect ======================
  useEffect(() => {
    modalTranslateY.value = withSpring(visible ? 0 : 300, {
      damping: 300,
      stiffness: 110,
    });
  }, [visible]);

  // ====================== Handlers ======================
  const toggleDayOfWeek = (dayIndex: number) => {
    setSelectedDaysOfWeek((prev) => {
      if (prev.includes(dayIndex)) {
        return prev.filter((d) => d !== dayIndex);
      } else {
        return [...prev, dayIndex];
      }
    });
  };

  const handleSegmentPress = (type: "daily" | "weekly" | "monthly") => {
    if (isRepeat) setTaskType(type);
  };

  const handleDateConfirm = (dates: string[]) => {
    setSelectedDates(dates);
  };

  const handleSave = () => {
    if (!taskTitle.trim()) {
      Alert.alert("Missing Task Name", "Please enter a task name.");
      return;
    }

    if (
      (taskType === "normal" || taskType === "monthly") &&
      selectedDates.length === 0
    ) {
      Alert.alert("Missing Dates", "Please select a date for the Task.");
      return;
    }

    let taskData: Task = {
      title: taskTitle,
      description: taskDescription,
      type: taskType,
      selectedDates: selectedDates,
      selectedDaysOfWeek: selectedDaysOfWeek,
      status: "pending",
    };

    onSave(taskData);
    handleClose();
  };

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  // ====================== Task Data Reset Effect ======================
  useEffect(() => {
    if (!visible) return;

    if (initialTask) {
      setTaskTitle(initialTask.title);
      setTaskDescription(initialTask.description || "");
      setTaskType(initialTask.type);
      setSelectedDates(initialTask.selectedDates || []);
      setSelectedDaysOfWeek(initialTask.selectedDaysOfWeek || []);
      setMonthlyMode(initialTask.monthlyMode || "start");
      setIsRepeat(initialTask.type !== "normal");
    } else {
      setTaskTitle("");
      setTaskDescription("");
      setTaskType("normal");
      setSelectedDates([]);
      setSelectedDaysOfWeek([]);
      setMonthlyMode("start");
      setIsRepeat(false);
    }
  }, [visible, initialTask]);

  // ====================== Task Dates Calculation Effect ======================
  useEffect(() => {
    if (!isRepeat || !startDate || !dueDate) return;

    switch (taskType) {
      case "monthly":
        setSelectedDates(
          calculateMonthlyDates(startDate, dueDate, monthlyMode)
        );
        break;
    }
  }, [taskType, isRepeat, startDate, dueDate, selectedDaysOfWeek, monthlyMode]);

  // ====================== Helper Functions ======================
  const calculateMonthlyDates = (
    startDate: string,
    dueDate: string,
    mode: "start" | "mid" | "end"
  ) => {
    const start = new Date(startDate);
    const end = new Date(dueDate);
    const months = eachMonthOfInterval({ start, end });

    return months
      .map((monthDate) => {
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth();
        const daysInMonth = getDaysInMonth(monthDate);

        let selectedDay;
        if (mode === "start") selectedDay = 1;
        else if (mode === "mid") selectedDay = Math.ceil(daysInMonth / 2);
        else selectedDay = daysInMonth;

        return format(new Date(year, month, selectedDay), "yyyy-MM-dd");
      })
      .filter((date) => date >= startDate && date <= dueDate);
  };

  // ====================== Render Helper Functions ======================
  const renderWeeklySelector = () => (
    <View style={styles.weeklyContainer}>
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
        <Pressable
          key={index}
          onPress={() => toggleDayOfWeek(index)}
          style={[
            styles.weeklyButton,
            selectedDaysOfWeek.includes(index) && styles.weeklyButtonActive,
          ]}
        >
          <Text
            style={[
              styles.weeklyButtonText,
              selectedDaysOfWeek.includes(index) &&
                styles.weeklyButtonTextActive,
            ]}
          >
            {day}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  const renderMonthlySelector = () => (
    <View style={styles.monthlyContainer}>
      {["Start", "Mid", "End"].map((label) => {
        const mode = label.toLowerCase() as "start" | "mid" | "end";
        const dates = calculateMonthlyDates(startDate, dueDate, mode);
        const isDisabled = dates.length === 0;

        return (
          <Pressable
            key={mode}
            onPress={() => !isDisabled && setMonthlyMode(mode)}
            style={[
              styles.monthlyButton,
              monthlyMode === mode && styles.monthlyButtonActive,
              isDisabled && styles.disabledButton,
            ]}
            disabled={isDisabled}
          >
            <Text
              style={[
                styles.monthlyButtonText,
                monthlyMode === mode && styles.monthlyButtonTextActive,
                isDisabled && styles.disabledText,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  // ====================== Render UI ======================
  return (
    <View>
      <Modal isVisible={visible} avoidKeyboard={true}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.overlay}>
            <Animated.View style={[styles.container, modalAnimatedStyle]}>
              {/* Restricted Editing Banner */}
              {restrictEditing && (
                <View style={styles.restrictedBanner}>
                  <Ionicons name="warning-outline" size={20} color="#FF5733" />
                  <Text style={styles.restrictedText}>
                    Limited editing mode. You can only edit the task title and
                    description.
                  </Text>
                </View>
              )}

              {/* Form Inputs */}
              <Text style={styles.title}>Title of Task</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  value={taskTitle}
                  onChangeText={setTaskTitle}
                  placeholder="Enter task name"
                  placeholderTextColor="#AAA"
                  style={styles.input}
                  multiline={true}
                />
                <Text style={styles.title}>Description</Text>
                <TextInput
                  value={taskDescription}
                  onChangeText={setTaskDescription}
                  placeholder="Enter task description"
                  placeholderTextColor="#AAA"
                  style={styles.description}
                  multiline={true}
                />
              </View>

              {/* Repeat Settings */}
              <View
                style={[
                  styles.switchContainer,
                  restrictEditing && styles.disabledSection,
                ]}
              >
                <Text style={styles.title_repeat}>Repeat</Text>
                <Switch
                  value={isRepeat}
                  onValueChange={(value) => {
                    if (!restrictEditing) {
                      setIsRepeat(value);
                      if (!value) {
                        setTaskType("normal");
                        setSelectedDates([]);
                      }
                    }
                  }}
                  trackColor={{ false: "#767577", true: "#4F46E5" }}
                  thumbColor={isRepeat ? "#fff" : "#ccc"}
                  disabled={restrictEditing}
                />
              </View>

              {/* Date Picker */}
              {!isRepeat && !restrictEditing && (
                <View style={styles.datePickerContainer}>
                  <Pressable
                    style={styles.datePickerButton}
                    onPress={() => setIsCalendarVisible(true)}
                  >
                    <Text style={styles.datePickerButtonText}>Pick Dates</Text>
                  </Pressable>
                  <Text style={styles.selectedDatesText}>
                    Selected: {selectedDates.length} days
                  </Text>
                </View>
              )}

              {/* Display selected dates */}
              {!isRepeat && restrictEditing && selectedDates.length > 0 && (
                <View style={styles.datePickerContainer}>
                  <View style={styles.disabledDatePicker}>
                    <Text style={styles.disabledText}>
                      {selectedDates.length} day
                      {selectedDates.length !== 1 ? "s" : ""} selected
                    </Text>
                  </View>
                </View>
              )}

              {/* Calendar Picker  */}
              {!restrictEditing && (
                <CalendarPicker
                  visible={isCalendarVisible}
                  onClose={() => setIsCalendarVisible(false)}
                  onConfirm={handleDateConfirm}
                  title="Select Task Dates"
                  initialDates={selectedDates}
                  highlightColor="#4F46E5"
                  singleSelect={false}
                  minDate={startDate}
                  maxDate={dueDate}
                />
              )}

              {/* Task Type Segments */}
              <View
                style={[
                  styles.segmentContainer,
                  (!isRepeat || restrictEditing) && styles.disabled,
                ]}
              >
                {["Daily", "Weekly", "Monthly"].map((label) => {
                  const type = label.toLowerCase() as
                    | "daily"
                    | "weekly"
                    | "monthly";
                  return (
                    <Pressable
                      key={type}
                      onPress={() =>
                        !restrictEditing && handleSegmentPress(type)
                      }
                      style={[
                        styles.segment,
                        taskType === type && styles.segmentActive,
                      ]}
                      disabled={!isRepeat || restrictEditing}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          taskType === type && styles.segmentTextActive,
                          (!isRepeat || restrictEditing) && styles.disabledText,
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Custom Selectors */}
              {!restrictEditing &&
                taskType === "monthly" &&
                renderMonthlySelector()}
              {!restrictEditing &&
                taskType === "weekly" &&
                renderWeeklySelector()}

              {/* Display selected days/options */}
              {restrictEditing &&
                taskType === "weekly" &&
                selectedDaysOfWeek.length > 0 && (
                  <View style={styles.restrictedInfoBox}>
                    <Text style={styles.restrictedInfoText}>
                      Repeats weekly on:{" "}
                      {selectedDaysOfWeek
                        .map(
                          (day) =>
                            ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
                              day
                            ]
                        )
                        .join(", ")}
                    </Text>
                  </View>
                )}

              {restrictEditing && taskType === "monthly" && (
                <View style={styles.restrictedInfoBox}>
                  <Text style={styles.restrictedInfoText}>
                    Repeats monthly:{" "}
                    {monthlyMode === "start"
                      ? "Beginning"
                      : monthlyMode === "mid"
                      ? "Middle"
                      : "End"}{" "}
                    of each month
                  </Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                <Pressable style={styles.cancelButton} onPress={handleClose}>
                  <Text style={styles.buttonText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.confirmButton} onPress={handleSave}>
                  <Text style={styles.buttonText}>Confirm</Text>
                </Pressable>
              </View>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

// ====================== Styles ======================
const styles = StyleSheet.create({
  // Layout Styles
  container: {
    backgroundColor: "#16171F",
    borderRadius: 12,
    padding: 20,
    alignItems: "flex-start",
    width: "100%",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Text Styles
  title: {
    color: "#fff",
    fontSize: 16,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  title_repeat: {
    color: "#fff",
    fontSize: 16,
    alignSelf: "flex-start",
    marginTop: 10,
  },

  // Input Styles
  inputContainer: {
    maxHeight: 154,
    width: "100%",
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#FFFF",
    padding: 14,
    borderRadius: 8,
    fontSize: 16,
    textAlignVertical: "top",
    marginBottom: 10,
  },
  description: {
    backgroundColor: "#FFFF",
    padding: 14,
    borderRadius: 8,
    fontSize: 16,
    textAlignVertical: "top",
  },

  // Switch Styles
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
  },

  // Date Picker Styles
  datePickerContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    justifyContent: "space-between",
  },
  datePickerButton: {
    backgroundColor: "#4F46E5",
    padding: 10,
    borderRadius: 8,
    minWidth: 100,
  },
  datePickerButtonText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
  selectedDatesText: {
    color: "#fff",
    fontSize: 14,
  },

  // Segment Control Styles
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "#222",
    borderRadius: 8,
    width: "100%",
    padding: 4,
    marginTop: 10,
  },
  segment: {
    flex: 1,
    padding: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: "#4F46E5",
  },
  segmentText: {
    color: "#AAA",
    fontSize: 16,
  },
  segmentTextActive: {
    color: "#FFF",
    fontWeight: "bold",
  },

  // Weekly Selector Styles
  weeklyContainer: {
    flexDirection: "row",
    alignSelf: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 20,
  },
  weeklyButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#4F46E555",
  },
  weeklyButtonActive: {
    backgroundColor: "#4F46E5",
  },
  weeklyButtonText: {
    color: "#FFF",
    fontSize: 14,
  },
  weeklyButtonTextActive: {
    fontWeight: "bold",
  },

  // Monthly Selector Styles
  monthlyContainer: {
    flexDirection: "row",
    alignSelf: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 20,
  },
  monthlyButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#333",
  },
  monthlyButtonActive: {
    backgroundColor: "#4F46E5",
  },
  monthlyButtonText: {
    color: "#AAA",
  },
  monthlyButtonTextActive: {
    color: "#FFF",
    fontWeight: "bold",
  },

  // Button Styles
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 25,
  },
  cancelButton: {
    backgroundColor: "#FF4444",
    padding: 12,
    borderRadius: 10,
    flex: 1,
    marginRight: 8,
    alignItems: "center",
  },
  confirmButton: {
    backgroundColor: "#4CAF50",
    padding: 12,
    borderRadius: 10,
    flex: 1,
    marginLeft: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },

  // Disabled Styles
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    color: "#555",
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledSection: {
    opacity: 0.5,
  },
  disabledDatePicker: {
    backgroundColor: "#2A2C3A",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  // Restricted Info Styles
  restrictedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 87, 51, 0.1)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  restrictedText: {
    color: "#FF5733",
    fontSize: 14,
    flex: 1,
  },
  restrictedInfoBox: {
    backgroundColor: "#2A2C3A",
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  restrictedInfoText: {
    color: "#AAA",
    textAlign: "center",
  },
});
