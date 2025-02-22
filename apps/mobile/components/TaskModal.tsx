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
import {
  format,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  getDaysInMonth,
} from "date-fns";
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from "react-native-reanimated";
import { Task } from "@/types/taskTypes";
import uuid from "react-native-uuid";

/// ====================== Type Definitions ======================
type TaskModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  initialTask?: Task;
  startDate: string;
  dueDate: string;
  goalId: string;
};

// ====================== Main Component ======================
export default function TaskModal({
  visible,
  initialTask,
  startDate,
  dueDate,
  goalId,
  onClose,
  onSave,
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

  // ====================== Animation Hooks ======================
  const modalTranslateY = useSharedValue(300);
  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: modalTranslateY.value }],
  }));

  // ====================== Handlers ======================
  {
    /* Select/Cancel days of the week */
  }
  const toggleDayOfWeek = (dayIndex: number) => {
    setSelectedDaysOfWeek((prev) => {
      if (prev.includes(dayIndex)) {
        return prev.filter((d) => d !== dayIndex);
      } else {
        return [...prev, dayIndex];
      }
    });
  };

  {
    /* Change Task Type */
  }
  const handleSegmentPress = (type: "daily" | "weekly" | "monthly") => {
    if (isRepeat) setTaskType(type);
  };

  {
    /* Select a day in the calendar */
  }
  const handleDateConfirm = (dates: string[]) => {
    setSelectedDates(dates);
  };

  {
    /* Save the Task and close the Modal. */
  }
  const handleSave = () => {
    if (!taskTitle.trim()) {
      Alert.alert("Missing Task Name", "Please enter a task name.");
      return;
    }

    if (selectedDates.length === 0) {
      Alert.alert("Missing Dates", "Please select a date for the Task.");
      return;
    }

    let taskData: Task = {
      id: initialTask?.id || (uuid.v4() as string),
      title: taskTitle,
      description: taskDescription,
      type: "normal",
      goalId,
    };

    if (isRepeat) {
      taskData.type = taskType;
      taskData.selectedDates = selectedDates;
    } else if (selectedDates.length > 0) {
      taskData.selectedDates = selectedDates;
    }

    if (taskType === "weekly") {
      taskData = { ...taskData, selectedDaysOfWeek };
    }

    if (taskType === "monthly") {
      taskData = { ...taskData, monthlyMode };
    }

    onSave(taskData);
    onClose();
  };

  // ====================== Effects ======================  //
  {
    /* 
    - Reset State value every time visible or initialTask ​​changes
    - If it is Edit Task (initialTask ​​has value) → Load old data
    - If it is Create new Task (initialTask ​​has no value) → Reset default value 
    */
  }
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

  {
    /* Help the Modal render more smoothly. */
  }
  useEffect(() => {
    modalTranslateY.value = visible ? withSpring(0) : withSpring(300);
  }, [visible]);

  {
    /* Recalculate selectedDates every time the Task Type or time range changes. */
  }
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
          { weekStartsOn: 0 } // กำหนดให้เริ่มนับสัปดาห์จากวันอาทิตย์ (index = 0)
        )
          .flatMap(
            (weekStart) =>
              eachDayOfInterval({
                start: weekStart,
                end: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000), // คำนวณวันสุดท้ายของสัปดาห์
              })
                .filter((day) => selectedDaysOfWeek.includes(day.getDay())) // เลือกเฉพาะวันที่ผู้ใช้กำหนด
                .map((date) => format(date, "yyyy-MM-dd")) // แปลงเป็น string format "yyyy-MM-dd"
          )
          .filter((date) => date >= startDate && date <= dueDate); // กรองเฉพาะวันที่อยู่ในช่วง startDate - dueDate
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
    <Modal isVisible={visible} onBackdropPress={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <Animated.View style={[modalAnimatedStyle]}>
            <View style={styles.container}>
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
              <View style={styles.switchContainer}>
                <Text style={styles.title_repeat}>Repeat</Text>
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

              {/* Calendar Pick Dates */}
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
            </View>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
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
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 8,
    fontSize: 16,
    textAlignVertical: "top",
    marginBottom: 10,
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
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    color: "#555",
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
  disabledButton: {
    opacity: 0.5,
  },
});
