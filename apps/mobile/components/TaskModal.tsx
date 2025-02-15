import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  Switch,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import CalendarPicker from "./CalendarPicker";
import {
  eachDayOfInterval,
  eachWeekOfInterval,
  format,
  eachMonthOfInterval,
  getDaysInMonth,
} from "date-fns";
import * as Animatable from "react-native-animatable";

// ====================== Type Definitions ======================
type TaskType = "normal" | "daily" | "weekly" | "monthly";

type TaskData = {
  title: string;
  description?: string;
  type: TaskType;
  selectedDates?: string[];
  selectedDaysOfWeek?: number[];
  monthlyMode?: "start" | "mid" | "end";
};

type TaskModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (task: TaskData) => void;
  initialTask?: TaskData;
  startDate: string;
  dueDate: string;
};

// ====================== Main Component ======================
export default function TaskModal({
  visible,
  onClose,
  onSave,
  initialTask,
  startDate,
  dueDate,
}: TaskModalProps) {
  // ====================== State Hooks ======================
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

  // ====================== Handlers ======================
  const toggleDayOfWeek = (dayIndex: number) => {
    setSelectedDaysOfWeek((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex]
    );
  };

  const handleSegmentPress = (type: "daily" | "weekly" | "monthly") => {
    if (isRepeat) setTaskType(type);
  };

  const handleDateConfirm = (dates: string[]) => {
    setSelectedDates(dates);
  };

  const handleSave = () => {
    onSave({
      title: taskTitle,
      description: taskDescription,
      type: isRepeat ? taskType : "normal",
      selectedDates: isRepeat
        ? selectedDates
        : selectedDates.length > 0
        ? selectedDates
        : undefined,
      ...(taskType === "weekly" && { selectedDaysOfWeek }),
      ...(taskType === "monthly" && { monthlyMode }),
    });
    onClose();
  };

  // ====================== Effects ======================
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

  useEffect(() => {
    if (!isRepeat || !startDate || !dueDate) return;

    const start = new Date(startDate);
    const end = new Date(dueDate);

    switch (taskType) {
      case "daily":
        setSelectedDates(
          eachDayOfInterval({ start, end }).map((date) =>
            format(date, "yyyy-MM-dd")
          )
        );
        break;

      case "weekly":
        const weeklyDates = eachWeekOfInterval(
          { start, end },
          { weekStartsOn: 0 }
        )
          .flatMap((weekStart) =>
            eachDayOfInterval({
              start: weekStart,
              end: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000),
            })
              .filter((day) => selectedDaysOfWeek.includes(day.getDay()))
              .map((date) => format(date, "yyyy-MM-dd"))
          )
          .filter((date) => date >= startDate && date <= dueDate);
        setSelectedDates(weeklyDates);
        break;

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

  // ====================== Render Functions ======================
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

  // ====================== Main UI ======================
  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <Animatable.View
            animation={visible ? "slideInUp" : "slideOutDown"}
            duration={300}
            style={styles.container}
          >
            {/* Form Inputs */}
            <Text style={styles.title}>Title of Task</Text>
            <TextInput
              value={taskTitle}
              onChangeText={setTaskTitle}
              placeholder="Enter task name"
              placeholderTextColor="#AAA"
              style={styles.input}
            />

            <Text style={styles.title}>Description</Text>
            <View style={styles.descriptionContainer}>
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
            <View style={styles.switchContainer}>
              <Text style={styles.title}>Repeat</Text>
              <Switch
                value={isRepeat}
                onValueChange={(value) => {
                  setIsRepeat(value);
                  if (!value) {
                    setTaskType("normal");
                    setSelectedDates([]);
                  }
                }}
                trackColor={{ false: "#767577", true: "#4F46E5" }}
                thumbColor={isRepeat ? "#fff" : "#ccc"}
              />
            </View>

            {/* Date Picker */}
            {!isRepeat && (
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

            {/* Task Type Segments */}
            <View
              style={[styles.segmentContainer, !isRepeat && styles.disabled]}
            >
              {["Daily", "Weekly", "Monthly"].map((label) => {
                const type = label.toLowerCase() as
                  | "daily"
                  | "weekly"
                  | "monthly";
                return (
                  <Pressable
                    key={type}
                    onPress={() => handleSegmentPress(type)}
                    style={[
                      styles.segment,
                      taskType === type && styles.segmentActive,
                    ]}
                    disabled={!isRepeat}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        taskType === type && styles.segmentTextActive,
                        !isRepeat && styles.disabledText,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Custom Selectors */}
            {taskType === "monthly" && renderMonthlySelector()}
            {taskType === "weekly" && renderWeeklySelector()}

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <Pressable style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.buttonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.confirmButton} onPress={handleSave}>
                <Text style={styles.buttonText}>Confirm</Text>
              </Pressable>
            </View>
          </Animatable.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ====================== Styles ======================
const styles = StyleSheet.create({
  // Layout Styles
  container: {
    width: "90%",
    backgroundColor: "#16171F",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
  },

  // Text Styles
  title: {
    color: "#fff",
    fontSize: 16,
    alignSelf: "flex-start",
    marginBottom: 8,
  },

  // Input Styles
  input: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 8,
    width: "100%",
    marginBottom: 16,
    fontSize: 16,
  },
  descriptionContainer: {
    maxHeight: 154,
    width: "100%",
    marginBottom: 16,
  },
  description: {
    backgroundColor: "#fff",
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
    marginBottom: 15,
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
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    color: "#555",
  },

  // Weekly Selector Styles
  weeklyContainer: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 25,
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
    justifyContent: "center",
    marginVertical: 10,
    gap: 10,
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
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#FF5733",
    padding: 12,
    borderRadius: 5,
    marginRight: 5,
    alignItems: "center",
  },
  confirmButton: {
    flex: 1,
    backgroundColor: "#4CAF50",
    padding: 12,
    borderRadius: 5,
    marginLeft: 5,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  disabledButton: {
    opacity: 0.5,
  },
});
