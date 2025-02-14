import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useState, useEffect } from "react";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import TaskModal from "@/components/TaskModal";
import CalendarPicker from "@/components/CalendarPicker";

export default function CreateGoal({ initialGoal }: { initialGoal?: any }) {
  const router = useRouter();

  const [goalTitle, setGoalTitle] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [isTaskModalVisible, setTaskModalVisible] = useState(false);
  const [isStartDatePickerVisible, setStartDatePickerVisible] = useState(false);
  const [isDueDatePickerVisible, setDueDatePickerVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [taskList, setTaskList] = useState<
    {
      title: string;
      type: "normal" | "daily" | "weekly" | "monthly";
      selectedDates?: string[];
    }[]
  >([]);

  useEffect(() => {
    if (initialGoal) {
      setGoalTitle(initialGoal.title);
      setStartDate(initialGoal.startDate);
      setDueDate(initialGoal.dueDate);
      setTaskList(initialGoal.tasks || []);
    }
  }, [initialGoal]);

  const addTask = (task: {
    title: string;
    type: "normal" | "daily" | "weekly" | "monthly";
    selectedDates?: string[];
  }) => {
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

  useEffect(() => {
    const interval = setInterval(() => {
      const goalData = {
        title: goalTitle,
        startDate: startDate || "Not Set",
        dueDate: dueDate || "Not Set",
        tasks: taskList.map((task) => ({
          title: task.title,
          type: task.type,
          selectedDates: task.selectedDates || [],
        })),
      };

      console.log("📌 Current Goal Data:", JSON.stringify(goalData, null, 2));
    }, 5000);

    return () => clearInterval(interval);
  }, [goalTitle, startDate, dueDate, taskList]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Design Your Path</Text>
      <Text style={styles.inputLabel}>Topic</Text>
      <TextInput
        value={goalTitle}
        onChangeText={setGoalTitle}
        placeholder="Enter your main topic of this plan"
        placeholderTextColor="#AAA"
        style={styles.input}
      />

      {taskList.length > 0 && (
        <View style={styles.taskListContainer}>
          <Text style={styles.sectionTitle}>Tasks</Text>
          <ScrollView style={styles.taskList} nestedScrollEnabled={true}>
            {taskList.map((task, index) => (
              <View key={index} style={styles.taskItem}>
                {/* Task Type Icon */}
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
                <Text style={styles.taskText}>{task.title}</Text>
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
          if (!startDate || !dueDate) return;
          setEditingIndex(null);
          setTaskModalVisible(true);
        }}
        style={styles.addTaskButton}
      >
        <Text style={styles.addTaskButtonText}>Add task</Text>
      </Pressable>

      {/* Error Message */}
      {(!startDate || !dueDate) && (
        <Text style={styles.errorText}>
          ⚠ Please set Goal Start and Finish Date first.
        </Text>
      )}

      {/* Task Modal */}
      <TaskModal
        visible={isTaskModalVisible}
        onClose={() => {
          setTaskModalVisible(false);
          setEditingIndex(null);
        }}
        onSave={addTask}
        initialTask={
          editingIndex !== null ? { ...taskList[editingIndex] } : undefined
        }
        startDate={startDate}
        dueDate={dueDate}
      />

      {/* Start Date & Due Date Pickers */}
      <View style={styles.dateContainer}>
        <View style={styles.dateBox}>
          <Text style={styles.inputLabel}>Start Date</Text>
          <Pressable
            onPress={() => setStartDatePickerVisible(true)}
            style={styles.dateInput}
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
            onPress={() => setDueDatePickerVisible(true)}
            style={styles.dateInput}
          >
            <Text style={{ color: dueDate ? "#fff" : "#AAA" }}>
              {dueDate || "Select Date"}
            </Text>
            <Feather name="calendar" size={20} color="#fff" />
          </Pressable>
        </View>
      </View>

      {/* Calendar Picker for Start Date */}
      <CalendarPicker
        visible={isStartDatePickerVisible}
        onClose={() => setStartDatePickerVisible(false)}
        onConfirm={(dates) => {
          setStartDate(dates[0]);
          setStartDatePickerVisible(false);
        }}
        title="Select Start Date"
        initialDates={startDate ? [startDate] : []}
        highlightColor="#4CAF50"
        singleSelect={true}
        minDate={new Date().toISOString().split("T")[0]}
        maxDate={dueDate}
        otherSelectedDate={dueDate}
        otherHighlightColor="#FF5733"
        mode="startGoal"
      />

      {/* Calendar Picker for Finish Date */}
      <CalendarPicker
        visible={isDueDatePickerVisible}
        onClose={() => setDueDatePickerVisible(false)}
        onConfirm={(dates) => {
          setDueDate(dates[0]);
          setDueDatePickerVisible(false);
        }}
        title="Select Finish Date"
        initialDates={dueDate ? [dueDate] : []}
        highlightColor="#FF5733"
        singleSelect={true}
        minDate={startDate || new Date().toISOString().split("T")[0]}
        otherSelectedDate={startDate}
        otherHighlightColor="#4CAF50"
        mode="startGoal"
      />

      {/* Create Goal Button */}
      <Pressable
        onPress={() =>
          console.log("📌 Goal Created:", {
            goalTitle,
            startDate,
            dueDate,
            tasks: taskList,
          })
        }
        style={styles.createButton}
      >
        <Feather name="plus-circle" size={20} color="#fff" />
        <Text style={styles.createButtonText}>Create your path</Text>
      </Pressable>
    </View>
  );
}

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
  disabledButton: {
    opacity: 0.5,
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
  taskText: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
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
});
