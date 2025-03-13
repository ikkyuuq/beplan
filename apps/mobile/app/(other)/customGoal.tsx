import React, { useState, useEffect } from "react";
import { Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import TaskModal from "@/components/TaskModal";
import CalendarPicker from "@/components/CalendarPicker";
import CustomGoalUI from "@/components/CustomGoalUI";

type Task = {
  title: string;
  description?: string;
  type: "normal" | "daily" | "weekly" | "monthly";
  selectedDates?: string[];
  selectedDaysOfWeek?: number[];
  monthlyMode?: "start" | "mid" | "end";
  status: "pending" | "completed" | "failed" | "deleted";
};

// ====================== Helper Functions ======================
const formatGoalForBackend = (
  userId: string,
  goalData: any,
  taskList: any[]
): any => {
  const formattedTasks = taskList.map((task) => {
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

// ====================== Main Component ======================
export default function CustomGoal() {
  // ====================== State Management ======================
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const params = useLocalSearchParams();
  const initialGoalData = params.initialGoalData
    ? JSON.parse(params.initialGoalData as string)
    : null;

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
  const [goalStarted, setGoalStarted] = useState(false);

  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();

  // ====================== Validation Effect ======================
  useEffect(() => {
    setIsFormValid(
      goalTitle.trim() !== "" &&
        startDate !== "" &&
        dueDate !== "" &&
        taskList.length > 0
    );
  }, [goalTitle, startDate, dueDate, taskList]);

  // ====================== Date Handlers ======================
  const handleDateChange = (newDate: string, type: "start" | "due") => {
    if (goalStarted) {
      return;
    }

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
  const handleDeleteTask = (index: number) => {
    if (goalStarted) {
      return;
    }

    setTaskList((prevTaskList) => prevTaskList.filter((_, i) => i !== index));
  };

  const handleEditTask = (index: number) => {
    setEditingIndex(index);

    if (goalStarted) {
      Alert.alert(
        "Limited Editing",
        "This goal has already started. You can only edit the task title.",
        [{ text: "OK", onPress: () => setTaskModalVisible(true) }]
      );
    } else {
      setTaskModalVisible(true);
    }
  };

  const addTask = (task: Task) => {
    if (goalStarted && editingIndex !== null) {
      setTaskList((prevTasks) =>
        prevTasks.map((t, index) =>
          index === editingIndex
            ? { ...t, title: task.title, description: task.description }
            : t
        )
      );
    } else {
      const newTask = {
        ...task,
        status: task.status || "pending",
      };

      setTaskList((prevTasks) =>
        editingIndex !== null
          ? prevTasks.map((t, index) => (index === editingIndex ? newTask : t))
          : [...prevTasks, newTask]
      );
    }

    setEditingIndex(null);
  };

  // ====================== Submit Handler ======================
  const handleSubmit = async () => {
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

    try {
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

      const baseUrl =
        Platform.OS === "android"
          ? "http://10.0.2.2:8000"
          : "http://127.0.0.1:8000";

      const response = await fetch(`${baseUrl}/api/v1/goal/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedGoalData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Server error: ${response.status}`
        );
      }

      const responseData = await response.json();
      console.log("📌 API Response:", JSON.stringify(responseData, null, 2));

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
    } catch (error: any) {
      console.error("Failed to create goal:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to create goal. Please try again later."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ====================== Back Button Handler ======================
  const handleBack = () => {
    if (
      goalTitle.trim() !== "" ||
      startDate !== "" ||
      dueDate !== "" ||
      taskList.length > 0
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

  // ====================== Check if Goal Has Started ======================
  useEffect(() => {
    if (startDate) {
      const today = new Date().toISOString().split("T")[0];
      const hasStarted = today > startDate;
      setGoalStarted(hasStarted);
    }
  }, [startDate]);

  // ====================== Load Initial Data ======================
  useEffect(() => {
    if (!initialDataLoaded && initialGoalData) {
      console.log("📌 Loading initial goal data");

      setGoalTitle(initialGoalData.title || "");
      setStartDate(initialGoalData.startDate || "");
      setDueDate(initialGoalData.dueDate || "");

      if (initialGoalData.tasks && Array.isArray(initialGoalData.tasks)) {
        const formattedTasks = initialGoalData.tasks.map((task: any) => ({
          title: task.title || "",
          description: task.description || "",
          type: task.type || "normal",
          selectedDates: task.selectedDates || [],
          selectedDaysOfWeek: task.selectedDaysOfWeek || [],
          status: task.status || "pending",
          monthlyMode: task.monthlyMode || "start",
        }));

        setTaskList(formattedTasks);
      }

      setInitialDataLoaded(true);
      setIsEditingGoal(true);
    }
  }, [initialGoalData, initialDataLoaded]);

  // ====================== Render UI ======================
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#16171F" }}
    >
      <CustomGoalUI
        goalTitle={goalTitle}
        startDate={startDate}
        dueDate={dueDate}
        taskList={taskList}
        isFormValid={isFormValid}
        isLoading={isLoading}
        goalStarted={goalStarted}
        isEditingGoal={isEditingGoal}
        setGoalTitle={setGoalTitle}
        handleBack={handleBack}
        setStartDatePickerVisible={setStartDatePickerVisible}
        setDueDatePickerVisible={setDueDatePickerVisible}
        handleEditTask={handleEditTask}
        handleDeleteTask={handleDeleteTask}
        setTaskModalVisible={setTaskModalVisible}
        handleSubmit={handleSubmit}
      />

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
        restrictEditing={goalStarted && editingIndex !== null}
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
        highlightColor="#4F46E5"
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
        title="Select End Date"
        initialDates={dueDate ? [dueDate] : []}
        highlightColor="#FF5733"
        singleSelect
        minDate={startDate || new Date().toISOString().split("T")[0]}
        otherSelectedDate={startDate}
        otherHighlightColor="#4F46E5"
      />
    </KeyboardAvoidingView>
  );
}
