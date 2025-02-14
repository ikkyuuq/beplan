import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, Modal, Switch } from "react-native";
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from "react-native-reanimated";
import { StyleSheet } from "react-native";
import CalendarPicker from "./CalendarPicker";
import {
  eachDayOfInterval,
  eachWeekOfInterval,
  format,
  eachMonthOfInterval,
  getDaysInMonth,
  startOfMonth,
  endOfMonth,
} from "date-fns";

type TaskModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (task: {
    title: string;
    type: "normal" | "daily" | "weekly" | "monthly";
    selectedDates?: string[];
  }) => void;
  initialTask?: {
    title: string;
    type: "normal" | "daily" | "weekly" | "monthly";
    selectedDates?: string[];
    selectedDaysOfWeek?: number[];
  };
  startDate: string;
  dueDate: string;
};

export default function TaskModal({
  visible,
  onClose,
  onSave,
  initialTask,
  startDate,
  dueDate,
}: TaskModalProps) {
  const [taskTitle, setTaskTitle] = useState(initialTask?.title || "");
  const [monthlyMode, setMonthlyMode] = useState<"start" | "mid" | "end">(
    "start"
  );

  const [taskType, setTaskType] = useState<
    "normal" | "daily" | "weekly" | "monthly"
  >(initialTask?.type || "normal");
  const [isRepeat, setIsRepeat] = useState(taskType !== "normal");
  const [selectedDates, setSelectedDates] = useState<string[]>(
    initialTask?.selectedDates || []
  );
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState<number[]>([]);

  const toggleDayOfWeek = (dayIndex: number) => {
    setSelectedDaysOfWeek((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex]
    );
  };

  const calculateMonthlyDates = (
    startDate: string,
    dueDate: string,
    mode: "start" | "mid" | "end"
  ) => {
    const start = new Date(startDate);
    const end = new Date(dueDate);

    const months = eachMonthOfInterval({ start, end });

    return months.map((monthDate) => {
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();
      const daysInMonth = getDaysInMonth(monthDate);

      let selectedDay;

      if (mode === "start") {
        selectedDay = 1;
      } else if (mode === "mid") {
        selectedDay = Math.ceil(daysInMonth / 2);
      } else if (mode === "end") {
        selectedDay = daysInMonth;
      }

      return format(new Date(year, month, selectedDay), "yyyy-MM-dd");
    });
  };

  useEffect(() => {
    if (!visible) return; // ✅ ถ้า Pop-up ไม่ได้เปิด ไม่ต้องทำอะไร

    if (initialTask) {
      // ✅ ถ้ามี Task ให้แก้ไข → โหลดข้อมูลเดิม
      setTaskTitle(initialTask.title);
      setTaskType(initialTask.type);
      setSelectedDates(initialTask.selectedDates || []);
      setSelectedDaysOfWeek(initialTask.selectedDaysOfWeek || []);

      setIsRepeat(initialTask.type !== "normal");
    } else {
      // ✅ ถ้าเป็น Task ใหม่ → รีเซ็ตค่าเริ่มต้น
      setTaskTitle("");
      setTaskType("normal");
      setSelectedDates([]);
      setSelectedDaysOfWeek([]);
      setIsRepeat(false);
    }
  }, [visible, initialTask]);

  useEffect(() => {
    if (isRepeat && taskType === "monthly" && startDate && dueDate) {
      const monthlyDates = calculateMonthlyDates(
        startDate,
        dueDate,
        monthlyMode
      );
      setSelectedDates(monthlyDates);
    }
  }, [taskType, isRepeat, startDate, dueDate, monthlyMode]);

  const modalTranslateY = useSharedValue(300);
  useEffect(() => {
    modalTranslateY.value = visible ? withSpring(0) : withSpring(300);
  }, [visible]);

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: modalTranslateY.value }],
  }));

  const selectedIndex = useSharedValue(
    taskType === "daily" ? 0 : taskType === "weekly" ? 1 : 2
  );

  const handleSegmentPress = (
    index: number,
    type: "daily" | "weekly" | "monthly"
  ) => {
    if (isRepeat) {
      selectedIndex.value = withSpring(index);
      setTaskType(type);
    }
  };

  const handleDateConfirm = (dates: string[]) => {
    console.log("📅 Selected Dates for Normal Task:", dates);
    setSelectedDates(dates);
  };

  useEffect(() => {
    if (isRepeat && taskType === "daily" && startDate && dueDate) {
      const allDates = eachDayOfInterval({
        start: new Date(startDate),
        end: new Date(dueDate),
      }).map((date) => format(date, "yyyy-MM-dd"));

      setSelectedDates(allDates);
    }
  }, [taskType, isRepeat, startDate, dueDate]);

  useEffect(() => {
    if (isRepeat && taskType === "weekly" && startDate && dueDate) {
      const start = new Date(startDate);
      const end = new Date(dueDate);

      const allWeeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 0 });

      const weeklyDates = allWeeks.flatMap((weekStart) => {
        return eachDayOfInterval({
          start: weekStart,
          end: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000),
        })
          .filter((day) => selectedDaysOfWeek.includes(day.getDay()))
          .map((date) => format(date, "yyyy-MM-dd"))
          .filter((date) => date >= startDate && date <= dueDate); // ✅ ห้ามมีวันก่อน Start และเกิน Due Date
      });

      setSelectedDates(weeklyDates);
    }
  }, [taskType, isRepeat, startDate, dueDate, selectedDaysOfWeek]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Animated.View style={[styles.container, modalAnimatedStyle]}>
          <Text style={styles.title}>Title of Task</Text>
          <TextInput
            value={taskTitle}
            onChangeText={setTaskTitle}
            placeholder="Enter task name"
            placeholderTextColor="#AAA"
            style={styles.input}
          />

          {/* Toggle Switch */}
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

          {/* Pick Date Button (Only for "Normal" Type when Repeat is OFF) */}
          {!isRepeat && (
            <View style={styles.datePickerContainer}>
              <Pressable
                style={styles.datePickerButton}
                onPress={() => setIsCalendarVisible(true)}
              >
                <Text style={styles.datePickerButtonText}>Pick Dates</Text>
              </Pressable>
              <Text style={styles.selectedDatesText}>
                Total: {selectedDates.length} days
              </Text>
            </View>
          )}

          {/* Calendar Modal */}
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

          {/* Segmented Control */}
          <View
            style={[
              styles.segmentContainer,
              !isRepeat && styles.disabledSegment,
            ]}
          >
            {["Daily", "Weekly", "Monthly"].map((label, index) => (
              <Pressable
                key={label}
                onPress={() =>
                  handleSegmentPress(
                    index,
                    label.toLowerCase() as "daily" | "weekly" | "monthly"
                  )
                }
                style={[
                  styles.segment,
                  taskType === label.toLowerCase() && isRepeat
                    ? styles.segmentActive
                    : {},
                ]}
                disabled={!isRepeat}
              >
                <Text
                  style={[
                    styles.segmentText,
                    taskType === label.toLowerCase() && isRepeat
                      ? styles.segmentTextActive
                      : {},
                    !isRepeat && styles.disabledSegmentText,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          {taskType === "monthly" && (
            <View style={styles.monthlyContainer}>
              {["Start", "Mid", "End"].map((label, index) => (
                <Pressable
                  key={index}
                  onPress={() =>
                    setMonthlyMode(
                      label.toLowerCase() as "start" | "mid" | "end"
                    )
                  }
                  style={[
                    styles.monthlyButton,
                    monthlyMode === label.toLowerCase() &&
                      styles.monthlyButtonSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.monthlyButtonText,
                      monthlyMode === label.toLowerCase() &&
                        styles.monthlyButtonTextSelected,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* แสดงปุ่มเลือกวันเฉพาะเมื่อเลือก Weekly */}
          {taskType === "weekly" && (
            <View style={styles.weeklyContainer}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                (day, index) => (
                  <Pressable
                    key={index}
                    onPress={() => toggleDayOfWeek(index)}
                    style={[
                      styles.weeklyButton,
                      selectedDaysOfWeek.includes(index) &&
                        styles.weeklyButtonSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.weeklyButtonText,
                        selectedDaysOfWeek.includes(index) &&
                          styles.weeklyButtonSelected,
                      ]}
                    >
                      {day}
                    </Text>
                  </Pressable>
                )
              )}
            </View>
          )}

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={styles.confirmButton}
              onPress={() => {
                console.log("🔍 Checking selectedDates:", selectedDates);

                const taskData = {
                  title: taskTitle,
                  type: isRepeat ? taskType : "normal",
                  selectedDates: isRepeat
                    ? selectedDates
                    : selectedDates.length > 0
                    ? selectedDates
                    : undefined,
                  selectedDaysOfWeek:
                    taskType === "weekly" ? selectedDaysOfWeek : undefined,
                };

                console.log(
                  "📝 Task Added:",
                  JSON.stringify(taskData, null, 2)
                );

                onSave(taskData);
                onClose();
              }}
            >
              <Text style={styles.confirmText}>Confirm</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    marginLeft: 10,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "90%",
    backgroundColor: "#16171F",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  title: {
    color: "#fff",
    fontSize: 16,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 8,
    width: "100%",
    marginBottom: 16,
    fontSize: 16,
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
  },
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "#222",
    borderRadius: 8,
    width: "100%",
    padding: 4,
    marginBottom: 15,
  },
  disabledSegment: {
    opacity: 0.5,
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
  disabledSegmentText: {
    color: "#555",
  },
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
    backgroundColor: "#4F46E5",
    opacity: 0.5,
  },
  weeklyButtonSelected: {
    opacity: 1,
  },
  weeklyButtonText: {
    color: "#FFF",
    fontSize: 14,
  },
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
  monthlyButtonSelected: {
    backgroundColor: "#4F46E5",
  },
  monthlyButtonText: {
    color: "#AAA",
  },
  monthlyButtonTextSelected: {
    color: "#FFF",
    fontWeight: "bold",
  },
  cancelText: { color: "#fff", fontWeight: "bold" },
  confirmText: { color: "#fff", fontWeight: "bold" },
});
