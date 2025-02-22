import { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import TaskModal from "@/components/TaskModal";
import CalendarPicker from "@/components/CalendarPicker";
import { Task } from "@/types/taskTypes";
import uuid from "react-native-uuid";

// ====================== Main Component ======================
export default function CreateGoal({ initialGoal }: { initialGoal?: any }) {
  // ====================== State Management ======================
  const goalId = useMemo(
    () => initialGoal?.id || (uuid.v4() as string),
    [initialGoal?.id]
  );

  const [goalTitle, setGoalTitle] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [isStartDatePickerVisible, setStartDatePickerVisible] = useState(false);
  const [isDueDatePickerVisible, setDueDatePickerVisible] = useState(false);
  const [taskList, setTaskList] = useState<Task[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isTaskModalVisible, setTaskModalVisible] = useState(false);

  // ====================== Utility Functions ======================
  const taskColors: Record<string, string> = {
    daily: "#4CAF50",
    weekly: "#FFC107",
    monthly: "#FF5733",
    normal: "#888",
  };

  const getTaskColor = (type: string) => taskColors[type] || "#888";

  // ====================== Date Handlers ======================
  const handleDateChange = (newDate: string, type: "start" | "due") => {
    if (taskList.length > 0) {
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
  const addTask = (task: Task) => {
    const newTask = {
      ...task,
      id: uuid.v4() as string,
      goalId,
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
    if (!goalTitle.trim()) {
      Alert.alert("Missing Title", "Please enter a goal title.");
      return;
    }

    if (!startDate || !dueDate) {
      Alert.alert("Missing Dates", "Please set both start and finish dates.");
      return;
    }

    const newGoal = {
      id: goalId,
      title: goalTitle,
      startDate,
      dueDate,
    };

    console.log("📌 Goal Created:", JSON.stringify(newGoal, null, 2));
    console.log("📌 Task List:", JSON.stringify(taskList, null, 2));
  };

  // ====================== Effects ======================
  useEffect(() => {
    if (initialGoal) {
      setGoalTitle(initialGoal.title);
      setStartDate(initialGoal.startDate);
      setDueDate(initialGoal.dueDate);

      const updatedTasks = (initialGoal.tasks ?? []).map((task: Task) => ({
        ...task,
        goalId: initialGoal.id,
      }));

      setTaskList(updatedTasks);
    }
  }, [initialGoal]);

  const logGoalData = () => {
    const goalData = {
      id: goalId,
      title: goalTitle,
      startDate: startDate || "Not Set",
      dueDate: dueDate || "Not Set",
    };

    const taskData = taskList.map((task) => ({
      ...task,
      description: task.description || "No description",
      selectedDates: task.selectedDates || [],
      selectedDaysOfWeek: task.selectedDaysOfWeek || [],
    }));

    console.log("📌 Current Goal Data:", JSON.stringify(goalData, null, 2));
    console.log("📌 Task List:", JSON.stringify(taskData, null, 2));
  };

  // ====================== Render UI ======================
  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.title}>Design Your Path</Text>

      {/* Goal Input */}
      <Text style={styles.inputLabel}>Topic</Text>
      <TextInput
        value={goalTitle}
        onChangeText={setGoalTitle}
        placeholder="Enter your main topic of this plan"
        placeholderTextColor="#AAA"
        style={styles.input}
      />

      {/* Task List */}
      {taskList.length > 0 && (
        <View style={styles.taskListContainer}>
          <Text style={styles.sectionTitle}>Tasks</Text>
          <ScrollView style={styles.taskList} nestedScrollEnabled>
            {taskList.map((task, index) => (
              <View key={index} style={styles.taskItem}>
                <View
                  style={[
                    styles.taskIcon,
                    { backgroundColor: getTaskColor(task.type) },
                  ]}
                >
                  <Text style={styles.taskIconText}>
                    {task.type.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.taskContent}>
                  <Text style={styles.taskText}>{task.title}</Text>
                  {task.description && (
                    <Text style={styles.taskDescription}>
                      {task.description}
                    </Text>
                  )}
                </View>
                <View style={styles.taskActions}>
                  <Pressable
                    onPress={() => {
                      setEditingIndex(index);
                      setTaskModalVisible(true);
                    }}
                  >
                    <Text style={styles.editIcon}>✏️</Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      setTaskList(taskList.filter((_, i) => i !== index))
                    }
                  >
                    <Text style={styles.deleteIcon}>🗑️</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Add Task Button */}
      <Pressable
        onPress={() => {
          if (startDate && dueDate) {
            setEditingIndex(null);
            setTaskModalVisible(true);
          }
        }}
        style={[
          styles.addTaskButton,
          !(startDate && dueDate) && styles.disabledButton,
        ]}
        disabled={!(startDate && dueDate)}
      >
        <Text
          style={[
            styles.addTaskButtonText,
            !(startDate && dueDate) && styles.disabledButtonText,
          ]}
        >
          Add task
        </Text>
      </Pressable>
      {(!startDate || !dueDate) && (
        <Text style={styles.errorText}>
          ⚠ Please set Goal Start and Finish Date first.
        </Text>
      )}

      {/* Date Pickers */}
      <View style={styles.dateContainer}>
        <View style={styles.dateBox}>
          <Text style={styles.inputLabel}>Start Date</Text>
          <Pressable
            style={styles.dateInput}
            onPress={() => setStartDatePickerVisible(true)}
          >
            <Text style={{ color: startDate ? "#fff" : "#AAA" }}>
              {startDate || "Select Date"}
            </Text>
            <Feather name="calendar" size={20} color="#fff" />
          </Pressable>
        </View>
        <View style={styles.dateBox}>
          <Text style={styles.inputLabel}>Finish Date</Text>
          <Pressable
            style={styles.dateInput}
            onPress={() => setDueDatePickerVisible(true)}
          >
            <Text style={{ color: dueDate ? "#fff" : "#AAA" }}>
              {dueDate || "Select Date"}
            </Text>
            <Feather name="calendar" size={20} color="#fff" />
          </Pressable>
        </View>
      </View>

      {/* Modals */}
      <TaskModal
        visible={isTaskModalVisible}
        onClose={() => {
          setTaskModalVisible(false);
          setEditingIndex(null);
        }}
        onSave={addTask}
        initialTask={editingIndex !== null ? taskList[editingIndex] : undefined}
        startDate={startDate}
        dueDate={dueDate}
        goalId={goalId}
      />
      <CalendarPicker
        visible={isStartDatePickerVisible}
        onClose={() => setStartDatePickerVisible(false)}
        onConfirm={(dates) => {
          handleDateChange(dates[0], "start");
          setStartDatePickerVisible(false);
        }}
        title="Select Start Date"
        initialDates={startDate ? [startDate] : []}
        highlightColor="#4CAF50"
        singleSelect
        minDate={new Date().toISOString().split("T")[0]}
        maxDate={dueDate}
        otherSelectedDate={dueDate}
        otherHighlightColor="#FF5733"
      />
      <CalendarPicker
        visible={isDueDatePickerVisible}
        onClose={() => setDueDatePickerVisible(false)}
        onConfirm={(dates) => {
          handleDateChange(dates[0], "due");
          setDueDatePickerVisible(false);
        }}
        title="Select Finish Date"
        initialDates={dueDate ? [dueDate] : []}
        highlightColor="#FF5733"
        singleSelect
        minDate={startDate || new Date().toISOString().split("T")[0]}
        otherSelectedDate={startDate}
        otherHighlightColor="#4CAF50"
      />

      {/* Action Buttons */}
      <Pressable style={styles.createButton} onPress={handleSubmit}>
        <Feather name="plus-circle" size={20} color="#fff" />
        <Text style={styles.createButtonText}>Create your path</Text>
      </Pressable>
      <Pressable onPress={logGoalData} style={styles.logButton}>
        <Text style={styles.logButtonText}>Get Test Log</Text>
      </Pressable>
    </View>
  );
}

// ====================== Styles ======================
const styles = StyleSheet.create({
  // Main Layout
  container: {
    flex: 1,
    backgroundColor: "#16171F",
    padding: 20,
    paddingTop: 80,
    paddingHorizontal: 40,
  },

  //  Typography
  title: {
    color: "#fff",
    fontSize: 40,
    fontWeight: "bold",
    marginBottom: 16,
    marginLeft: -20,
  },
  inputLabel: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 6,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  errorText: {
    color: "#FF5733",
    fontSize: 14,
    marginBottom: 15,
    textAlign: "center",
  },

  // Input Fields
  input: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 25,
    marginTop: 5,
    marginBottom: 20,
    fontSize: 15,
  },

  // Buttons
  addTaskButton: {
    borderWidth: 1,
    borderColor: "#fff",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  addTaskButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: "#333",
  },
  disabledButtonText: {
    color: "darkgray",
  },
  createButton: {
    backgroundColor: "#8D8D8D",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 10,
  },
  logButton: {
    backgroundColor: "#4CAF50",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    alignSelf: "center",
    marginTop: 60,
    width: 150,
  },
  logButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },

  // Task List
  taskListContainer: {
    flex: 1,
    maxHeight: 180,
    marginBottom: 20,
  },
  taskList: {
    backgroundColor: "#222",
    borderRadius: 8,
    padding: 10,
  },
  taskItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#333",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  taskIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  taskIconText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  taskContent: {
    flex: 1,
    marginRight: 10,
  },
  taskText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  taskDescription: {
    color: "#AAA",
    fontSize: 14,
    marginTop: 4,
  },
  taskActions: {
    flexDirection: "row",
    gap: 8,
  },
  editIcon: {
    fontSize: 18,
    color: "#FFD700",
  },
  deleteIcon: {
    fontSize: 18,
    color: "#FF4444",
  },

  // Date Pickers
  dateContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  dateBox: {
    flex: 1,
    marginHorizontal: 5,
  },
  dateInput: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#222",
    padding: 14,
    borderRadius: 10,
  },
});
