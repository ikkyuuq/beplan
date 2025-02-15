import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { useState, useEffect } from "react";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import TaskModal from "@/components/TaskModal";
import CalendarPicker from "@/components/CalendarPicker";

// ====================== Type Definitions ======================
type Task = {
  title: string;
  description?: string;
  type: "normal" | "daily" | "weekly" | "monthly";
  selectedDates?: string[];
  selectedDaysOfWeek?: number[];
  monthlyMode?: "start" | "mid" | "end";
};

// ====================== Main Component ======================
export default function CreateGoal({ initialGoal }: { initialGoal?: any }) {
  const router = useRouter();

  // ====================== State Hooks ======================
  const [goalTitle, setGoalTitle] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [isTaskModalVisible, setTaskModalVisible] = useState(false);
  const [isStartDatePickerVisible, setStartDatePickerVisible] = useState(false);
  const [isDueDatePickerVisible, setDueDatePickerVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [taskList, setTaskList] = useState<Task[]>([]);

  // ====================== Handlers ======================
  const handleDateChange = (newDate: string, type: "start" | "due") => {
    if (taskList.length > 0) {
      Alert.alert(
        "Clear Tasks",
        "Changing the date will remove all existing tasks. Are you sure you want to continue?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Continue",
            style: "destructive",
            onPress: () => {
              if (type === "start") setStartDate(newDate);
              else setDueDate(newDate);
              setTaskList([]);
            },
          },
        ]
      );
    } else {
      if (type === "start") setStartDate(newDate);
      else setDueDate(newDate);
    }
  };

  const addTask = (task: Task) => {
    if (editingIndex !== null) {
      const updatedTasks = [...taskList];
      updatedTasks[editingIndex] = task;
      setTaskList(updatedTasks);
      setEditingIndex(null);
    } else {
      setTaskList([...taskList, task]);
    }
  };

  const getTaskColor = (type: string) => {
    switch (type) {
      case "daily":
        return "#4CAF50";
      case "weekly":
        return "#FFC107";
      case "monthly":
        return "#FF5733";
      default:
        return "#888";
    }
  };

  // ====================== Effects ======================
  useEffect(() => {
    if (initialGoal) {
      setGoalTitle(initialGoal.title);
      setStartDate(initialGoal.startDate);
      setDueDate(initialGoal.dueDate);
      setTaskList(initialGoal.tasks || []);
    }
  }, [initialGoal]);

  useEffect(() => {
    const interval = setInterval(() => {
      const goalData = {
        title: goalTitle,
        startDate: startDate || "Not Set",
        dueDate: dueDate || "Not Set",
        tasks: taskList.map((task) => ({
          ...task,
          description: task.description || "No description",
          selectedDates: task.selectedDates || [],
          selectedDaysOfWeek: task.selectedDaysOfWeek || [],
        })),
      };
      console.log("📌 Current Goal Data:", JSON.stringify(goalData, null, 2));
    }, 5000);
    return () => clearInterval(interval);
  }, [goalTitle, startDate, dueDate, taskList]);

  // ====================== Render ======================
  return (
    <View style={styles.container}>
      {/* Header Section */}
      <Text style={styles.title}>Design Your Path</Text>

      {/* Topic Input */}
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

      {/* Add Task Section */}
      <Pressable
        onPress={() => {
          if (startDate && dueDate) {
            setEditingIndex(null);
            setTaskModalVisible(true);
          }
        }}
        style={styles.addTaskButton}
      >
        <Text style={styles.addTaskButtonText}>Add task</Text>
      </Pressable>

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

      {/* Modals and Additional Components */}
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

      {/* Create Button */}
      <Pressable
        style={styles.createButton}
        onPress={() =>
          console.log(
            "📌 Goal Created:",
            JSON.stringify(
              { goalTitle, startDate, dueDate, tasks: taskList },
              null,
              2
            )
          )
        }
      >
        <Feather name="plus-circle" size={20} color="#fff" />
        <Text style={styles.createButtonText}>Create your path</Text>
      </Pressable>

      {/* Error Message */}
      {(!startDate || !dueDate) && (
        <Text style={styles.errorText}>
          ⚠ Please set Goal Start and Finish Date first.
        </Text>
      )}
    </View>
  );
}

// ====================== Styles ======================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#16171F",
    padding: 20,
    paddingTop: 80,
    paddingHorizontal: 40,
  },
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
  input: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 25,
    marginTop: 5,
    marginBottom: 20,
    fontSize: 15,
  },
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
  errorText: {
    color: "#FF5733",
    fontSize: 14,
    marginBottom: 15,
    textAlign: "center",
  },
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
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
});
