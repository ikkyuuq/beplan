import React, { useState, useEffect } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { Alert } from "@/utils/alert";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useUser } from "@clerk/expo";
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import TaskModal from "@/components/TaskModal";
import CalendarPicker from "@/components/CalendarPicker";
import CustomGoalUI from "@/components/CustomGoalUI";
import { format } from "date-fns";
import { API_BASE_URL } from "@/constants/api";
import { useApiFetch } from "@/hooks/useApiFetch";
import { useTranslation } from "@/i18n";

type Task = {
  /** Saved task id (editing an existing goal); absent for new tasks. */
  id?: number;
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

// Editor task -> backend TaskUpdate. "normal" (specific dates) is "date" on
// the backend, as in formatGoalForBackend.
const toUpdateTask = (task: Task) => ({
  id: task.id,
  title: task.title,
  description: task.description || "",
  repeat_type: task.type === "normal" ? "date" : task.type,
  date_interval: task.selectedDates || [],
  week_interval: task.selectedDaysOfWeek || [],
});

// ====================== Main Component ======================
export default function CustomGoal() {
  // ====================== State Management ======================
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  // ====================== Get URL Parameters ======================
  const params = useLocalSearchParams();
  const initialGoalData = params.initialGoalData
    ? JSON.parse(params.initialGoalData as string)
    : null;
  // Editing a draft (from All goals): fully editable, saved to /api/v1/drafts.
  const draftId = params.draftId ? Number(params.draftId) : null;
  const initialDraft = params.initialDraft
    ? JSON.parse(params.initialDraft as string)
    : null;

  // ====================== Animation Values ======================
  const headerOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const formOpacity = useSharedValue(0);
  const taskListOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(20);

  // ====================== Animation Setup ======================
  useEffect(() => {
    // Header animation
    headerOpacity.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });

    // Title animation
    titleOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));

    // Form animation
    formOpacity.value = withDelay(500, withTiming(1, { duration: 500 }));

    // Task list animation
    taskListOpacity.value = withDelay(700, withTiming(1, { duration: 500 }));

    // Button animation
    buttonOpacity.value = withDelay(900, withTiming(1, { duration: 400 }));
    buttonTranslateY.value = withDelay(
      900,
      withTiming(0, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, []);

  // ====================== Animated Styles ======================
  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [
      {
        translateY: withTiming(titleOpacity.value * 1 === 1 ? 0 : 20, {
          duration: 500,
        }),
      },
    ],
  }));

  const formAnimatedStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [
      {
        translateY: withTiming(formOpacity.value * 1 === 1 ? 0 : 20, {
          duration: 500,
        }),
      },
    ],
  }));

  const taskListAnimatedStyle = useAnimatedStyle(() => ({
    opacity: taskListOpacity.value,
    transform: [
      {
        translateY: withTiming(taskListOpacity.value * 1 === 1 ? 0 : 20, {
          duration: 500,
        }),
      },
    ],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  // ====================== State Management ======================
  // A draft being edited seeds the editor's initial state.
  const [goalTitle, setGoalTitle] = useState<string>(() => initialDraft?.title || "");
  const [startDate, setStartDate] = useState<string>(() => initialDraft?.start_date || "");
  const [dueDate, setDueDate] = useState<string>(() => initialDraft?.due_date || "");
  const [isStartDatePickerVisible, setStartDatePickerVisible] = useState(false);
  const [isDueDatePickerVisible, setDueDatePickerVisible] = useState(false);
  const [taskList, setTaskList] = useState<Task[]>(() =>
    (initialDraft?.tasks || []).map((task: any) => ({
      title: task.title || "",
      description: task.description || "",
      type: task.type || "normal",
      selectedDates: task.selectedDates || [],
      selectedDaysOfWeek: task.selectedDaysOfWeek || [],
      monthlyMode: task.monthlyMode || "start",
      status: "pending",
    }))
  );
  // Saved tasks the user removed while editing; sent as "deleted" so the
  // backend stops their upcoming days (their history is kept).
  const [removedTasks, setRemovedTasks] = useState<Task[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isTaskModalVisible, setTaskModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [goalStarted, setGoalStarted] = useState(false);

  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const apiFetch = useApiFetch();
  const { t } = useTranslation();

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
        t("goal.clearTasksTitle"),
        t("goal.clearTasksMessage"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("goal.continue"),
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

    if (clearTasks) {
      setRemovedTasks((prev) => [...prev, ...taskList.filter((t) => t.id)]);
      setTaskList([]);
    }
  };

  // ====================== Task Handlers ======================
  const handleDeleteTask = (index: number) => {
    if (goalStarted) {
      return;
    }

    const removed = taskList[index];
    if (removed?.id) setRemovedTasks((prev) => [...prev, removed]);
    setTaskList((prevTaskList) => prevTaskList.filter((_, i) => i !== index));
  };

  const handleEditTask = (index: number) => {
    setEditingIndex(index);

    if (goalStarted) {
      Alert.alert(
        t("goal.limitedEditingTitle"),
        t("goal.limitedEditingMessage"),
        [{ text: t("common.ok"), onPress: () => setTaskModalVisible(true) }]
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
          ? prevTasks.map((t, index) =>
              // Keep the saved id so the backend updates this task, not a new one.
              index === editingIndex ? { ...newTask, id: t.id } : t
            )
          : [...prevTasks, newTask]
      );
    }

    setEditingIndex(null);
  };

  // ====================== Submit Handler ======================
  // ====================== Drafts ======================
  // The draft body is the editor's own format; the backend converts it when
  // the draft is started.
  const draftPayload = () => ({
    title: goalTitle,
    start_date: startDate || null,
    due_date: dueDate || null,
    tasks: taskList.map((task) => ({
      title: task.title,
      description: task.description || null,
      type: task.type,
      selectedDates: task.selectedDates || [],
      selectedDaysOfWeek: task.selectedDaysOfWeek || [],
      monthlyMode: task.monthlyMode || null,
    })),
  });

  const readError = async (response: Response) => {
    const body = await response.json().catch(() => null);
    return body?.detail || body?.message || t("goal.serverError", { status: response.status });
  };

  /** Create or update the draft; returns its id. */
  const saveDraftRequest = async (): Promise<number> => {
    const response = await apiFetch(
      draftId
        ? `${API_BASE_URL}/api/v1/drafts/${draftId}`
        : `${API_BASE_URL}/api/v1/drafts`,
      {
        method: draftId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftPayload()),
      }
    );
    if (!response.ok) throw new Error(await readError(response));
    return (await response.json()).id;
  };

  const handleSaveDraft = async () => {
    setIsLoading(true);
    try {
      await saveDraftRequest();
      router.dismissTo("/(other)/AllGoalAllTask");
      Alert.alert(t("goal.draftSavedTitle"), t("goal.draftSavedMessage"));
    } catch (error: any) {
      console.error("Failed to save draft:", error);
      Alert.alert(t("goal.draftSaveFailed"), error.message || t("ai.tryAgain"));
    } finally {
      setIsLoading(false);
    }
  };

  /** Start goal from a draft: save the latest edits, then start it. */
  const startDraft = async () => {
    const id = await saveDraftRequest();
    const response = await apiFetch(`${API_BASE_URL}/api/v1/drafts/${id}/start`, {
      method: "POST",
    });
    if (!response.ok) throw new Error(await readError(response));
    const result = await response.json();
    router.dismissTo("/(tabs)/schedule");
    Alert.alert(
      t("goal.startedTitle"),
      result.shifted_days > 0 ? t("goal.startedShifted") : t("goal.startedOnSchedule")
    );
  };

  const handleSubmit = async () => {
    if (!isFormValid) {
      Alert.alert(
        t("goal.incompleteTitle"),
        t("goal.incompleteMessage"),
        [{ text: t("common.ok") }]
      );
      return;
    }

    if (!isLoaded || !isSignedIn) {
      Alert.alert(t("goal.authErrorTitle"), t("goal.signInToSave"));
      return;
    }

    setIsLoading(true);

    try {
      if (draftId) {
        await startDraft();
        return;
      }

      const userId = user?.id;

      if (!userId) {
        Alert.alert(t("common.error"), t("goal.noUserId"));
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

      const response = await apiFetch(`${API_BASE_URL}/api/v1/goal/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedGoalData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || t("goal.serverError", { status: response.status })
        );
      }

      const responseData = await response.json();
      console.log("📌 API Response:", JSON.stringify(responseData, null, 2));

      // Go straight to the schedule (calendar). Don't wait for the alert's
      // OK button: Alert.alert is a no-op on web, so its onPress never ran there.
      router.dismissTo("/(tabs)/schedule");
      Alert.alert(t("goal.createdTitle"), t("goal.created"));
    } catch (error: any) {
      console.error("Failed to create goal:", error);
      Alert.alert(
        t("common.error"),
        error.message || t("goal.createFailed")
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ====================== Update Handler ======================
  const handleUpdate = async () => {
    if (!isLoaded || !isSignedIn) {
      Alert.alert(
        t("goal.authErrorTitle"),
        t("goal.signInToUpdate")
      );
      return;
    }

    setIsLoading(true);

    try {
      const userId = user?.id;

      if (!userId) {
        Alert.alert(t("common.error"), t("goal.noUserId"));
        setIsLoading(false);
        return;
      }

      const parsedGoalData = params.initialGoalData
        ? JSON.parse(
            Array.isArray(params.initialGoalData)
              ? params.initialGoalData[0]
              : params.initialGoalData
          )
        : null;

      const formattedParams = {
        user_id: userId || "unknown",
        assigned_goal_id: params.assignedGoalId,
        goal: parsedGoalData
          ? {
              ...parsedGoalData,
              title: goalTitle,
              start_date: startDate,
              due_date: dueDate,
              // Each task carries its own saved id (matching by list position
              // sent the wrong id once a task was removed or added).
              tasks: [
                ...taskList.map((task) => toUpdateTask(task)),
                ...removedTasks.map((task) => ({
                  ...toUpdateTask(task),
                  status: "deleted",
                })),
              ],
            }
          : null,
      };

      console.log(
        "📌 Update Params:",
        JSON.stringify(formattedParams, null, 2)
      );

      const response = await apiFetch(`${API_BASE_URL}/api/v1/goal/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedParams),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || t("goal.serverError", { status: response.status })
        );
      }

      const responseData = await response.json();
      console.log(
        "📌 Update API Response:",
        JSON.stringify(responseData, null, 2)
      );

      Alert.alert(t("goal.createdTitle"), t("goal.updated"), [
        {
          text: t("common.ok"),
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error("Failed to update goal:", error);
      Alert.alert(
        t("common.error"),
        error.message || t("goal.updateFailed")
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
        t("goal.discardTitle"),
        t("goal.discardMessage"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("goal.discard"),
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
  // Only an existing goal can have started: lock dates/tasks when editing a goal
  // whose *saved* start date is today or earlier. A new goal starting today,
  // or an unstarted goal whose start date is being moved, stays editable.
  const savedStartDate: string | undefined = initialGoalData?.start_date;
  useEffect(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    setGoalStarted(isEditingGoal && !!savedStartDate && today >= savedStartDate);
  }, [isEditingGoal, savedStartDate]);

  // ====================== Load Initial Data ======================
  useEffect(() => {
    if (!initialDataLoaded && initialGoalData) {
      console.log("📌 Loading initial goal data");

      setGoalTitle(initialGoalData.title || "");
      setStartDate(initialGoalData.start_date || "");
      setDueDate(initialGoalData.due_date || "");

      if (initialGoalData.tasks && Array.isArray(initialGoalData.tasks)) {
        const formattedTasks = initialGoalData.tasks.map((task: any) => ({
          id: task.id,
          title: task.title || "",
          description: task.description || "",
          type: task.repeat_type || "normal",
          selectedDates: task.date_interval || [],
          selectedDaysOfWeek: task.week_interval || [],
          status: task.status || "pending",
          monthlyMode: task.monthlyMode || "start",
        }));

        setTaskList(formattedTasks);
      }

      setInitialDataLoaded(true);
      setIsEditingGoal(true);
    }
  }, [initialGoalData, initialDataLoaded]);

  const testLogData = () => {
    const goalData = {
      title: goalTitle,
      startDate: startDate || "Not Set",
      dueDate: dueDate || "Not Set",
    };
    const taskData = taskList.map((task) => ({ ...task }));
    console.log("📌 Current Goal Data:", JSON.stringify(goalData, null, 2));
    console.log("📌 Task List:", JSON.stringify(taskData, null, 2));
  };

  // ====================== Render UI ======================
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#16171F" }}
    >
      {/* Main UI Component */}
      <CustomGoalUI
        // Animation Styles
        headerAnimatedStyle={headerAnimatedStyle}
        titleAnimatedStyle={titleAnimatedStyle}
        formAnimatedStyle={formAnimatedStyle}
        taskListAnimatedStyle={taskListAnimatedStyle}
        buttonAnimatedStyle={buttonAnimatedStyle}
        // Data
        goalTitle={goalTitle}
        startDate={startDate}
        dueDate={dueDate}
        taskList={taskList}
        isFormValid={isFormValid}
        isLoading={isLoading}
        goalStarted={goalStarted}
        isEditingGoal={isEditingGoal}
        // Event Handlers
        setGoalTitle={setGoalTitle}
        handleBack={handleBack}
        setStartDatePickerVisible={setStartDatePickerVisible}
        setDueDatePickerVisible={setDueDatePickerVisible}
        handleEditTask={handleEditTask}
        handleDeleteTask={handleDeleteTask}
        setTaskModalVisible={setTaskModalVisible}
        handleSubmit={handleSubmit}
        handleUpdate={handleUpdate}
        handleSaveDraft={isEditingGoal ? undefined : handleSaveDraft}
        // Debug
        testLogData={testLogData}
      />

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
        // restrict editing if goal has started
        restrictEditing={goalStarted && editingIndex !== null}
      />

      <CalendarPicker
        visible={isStartDatePickerVisible}
        onClose={() => setStartDatePickerVisible(false)}
        onConfirm={(dates) => {
          handleDateChange(dates[0], "start");
          setStartDatePickerVisible(false);
        }}
        title={t("goal.selectStartDate")}
        initialDates={startDate ? [startDate] : []}
        highlightColor="#4F46E5"
        singleSelect
        minDate={format(new Date(), "yyyy-MM-dd")}
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
        title={t("goal.selectEndDate")}
        initialDates={dueDate ? [dueDate] : []}
        highlightColor="#FF5733"
        singleSelect
        minDate={startDate || format(new Date(), "yyyy-MM-dd")}
        otherSelectedDate={startDate}
        otherHighlightColor="#4F46E5"
      />
    </KeyboardAvoidingView>
  );
}
