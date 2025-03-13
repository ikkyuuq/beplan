import {
  View,
  Text,
  Pressable,
  LayoutChangeEvent,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import {
  addDays,
  eachDayOfInterval,
  eachWeekOfInterval,
  subDays,
  format,
  isSameDay,
  startOfWeek,
} from "date-fns";
import PagerView from "react-native-pager-view";
import { useEffect, useState } from "react";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import CollapseItem from "@/components/CollapseItem";
import Collapsable from "@/components/Collapsable";
import Header from "@/components/Header";
import { useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useFocusEffect } from 'expo-router';
import React from "react";

type Task = {
  id: number;
  title: string;
  description: string | null;
  status: "pending" | "completed" | "failed" | "deleted";
};

type Goal = {
  id: number;
  title: string;
  type?: string;
  status: "pending" | "completed" | "failed";
  start_date: string;
  due_date: string;
  tasks: Task[];
};

export default function schedule() {
  const [currentMonth, setCurrentMonth] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [latestIndex, setLatestIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Goal[]>([]);

  const { user } = useUser();
  const router = useRouter();

  const dayNames = ["S", "M", "T", "W", "T", "F", "S"];
  const today = new Date();
  const startDate = startOfWeek(subDays(today, 60), { weekStartsOn: 0 });
  const endDate = addDays(
    startOfWeek(addDays(today, 60), { weekStartsOn: 0 }),
    6
  );

  const dates = eachWeekOfInterval(
    {
      start: startDate,
      end: endDate,
    },
    { weekStartsOn: 0 }
  ).reduce((acc: Date[][], curr) => {
    const allDays = eachDayOfInterval({
      start: curr,
      end: addDays(curr, 6),
    });
    acc.push(allDays);
    return acc;
  }, []);

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const onDateLayout = (e: LayoutChangeEvent) => {
    setDimensions({
      width: e.nativeEvent.layout.width,
      height: e.nativeEvent.layout.height,
    });
  };

  const todayIndex = dayNames.findIndex((_, index) => index === today.getDay());
  const datePosX = useSharedValue((dimensions.width / 7) * todayIndex);
  const initialPage = dates.findIndex((week) =>
    week.some((day) => isSameDay(day, today))
  );

  useEffect(() => {
    const dayIndex = selectedDate.getDay();
    datePosX.value = withSpring((dimensions.width / 7) * dayIndex, {
      mass: 1,
      damping: 20,
      stiffness: 200,
    });
    setLatestIndex(dayIndex);
  }, [selectedDate, dimensions.width]);

  const scale = useSharedValue(1);

  useEffect(() => {
    const newIndex = selectedDate.getDay();
    if (newIndex !== latestIndex) {
      scale.value = 0;
      setTimeout(() => {
        scale.value = withSpring(1, {
          mass: 1,
          damping: 20,
          stiffness: 200,
        });
      }, 200);
    }
  }, [selectedDate, latestIndex]);

  const animateDateSelected = useAnimatedStyle(() => {
    const s = interpolate(scale.value, [0, 1], [0.8, 1]);
    return {
      transform: [{ translateX: datePosX.value }, { scaleY: s }],
    };
  });

  const fetchGoals = async (selectedDate: Date, userId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const baseUrl =
        Platform.OS === "android"
          ? "http://10.0.2.2:8000"
          : "http://127.0.0.1:8000";
      const resp = await fetch(
        `${baseUrl}/api/v1/goal?user_id=${userId}&today=${format(
          selectedDate,
          "yyyy-MM-dd"
        )}`
      );
      if (!resp.ok) throw new Error(`Error: ${resp.status}`);
      const data = await resp.json();
      setData(data);
    } catch (error) {
      console.error("Failed to fetch goals:", error);
      setError("Failed to load your goals. Please try again.");
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user || !user.id) return;
    fetchGoals(selectedDate, user.id);
  }, [selectedDate, user]);

  const handleCompleteAllTasks = async (
    index: number,
    userId: string,
    taskIds: number[]
  ) => {
    try {
      const baseUrl =
        Platform.OS === "android"
          ? "http://10.0.2.2:8000"
          : "http://127.0.0.1:8000";
      await fetch(`${baseUrl}/api/v1/goal/update_task_status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          assigned_task_id: taskIds,
          assigned_goal_id: data[index].id,
          to: "success",
        }),
      });
      setTimeout(() => {
        setData((prev) => prev.filter((_, i) => i !== index));
      }, 300);
    } catch (error) {
      console.error("Failed to complete all tasks:", error);
    }
  };

  const handleFailAllTasks = async (
    index: number,
    userId: string,
    taskIds: number[]
  ) => {
    try {
      const baseUrl =
        Platform.OS === "android"
          ? "http://10.0.2.2:8000"
          : "http://127.0.0.1:8000";
      await fetch(`${baseUrl}/api/v1/goal/update_task_status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          assigned_task_id: taskIds,
          assigned_goal_id: data[index].id,
          to: "failed",
        }),
      });
      setTimeout(() => {
        setData((prev) => prev.filter((_, i) => i !== index));
      }, 300);
    } catch (error) {
      console.error("Failed to fail all tasks:", error);
    }
  };

  const handleCompleteTask = async (
    taskId: number,
    userId: string,
    taskIds: number[],
    goalId: number
  ) => {
    try {
      const baseUrl =
        Platform.OS === "android"
          ? "http://10.0.2.2:8000"
          : "http://127.0.0.1:8000";
      await fetch(`${baseUrl}/api/v1/goal/update_task_status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          assigned_task_id: taskIds,
          assigned_goal_id: goalId,
          to: "success",
        }),
      });
      setData((prev) =>
        prev.map((goal) => ({
          ...goal,
          tasks: goal.tasks.filter((task) => task.id !== taskId),
        }))
      );
    } catch (error) {
      console.error("Failed to complete task:", error);
    }
  };

  const handleFailTask = async (
    userId: string,
    taskId: number,
    goalId: number
  ) => {
    try {
      const baseUrl =
        Platform.OS === "android"
          ? "http://10.0.2.2:8000"
          : "http://127.0.0.1:8000";
      await fetch(`${baseUrl}/api/v1/goal/update_task_status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          assigned_task_id: [taskId],
          assigned_goal_id: goalId,
          to: "failed",
        }),
      });
      setData((prev) =>
        prev.map((goal) => ({
          ...goal,
          tasks: goal.tasks.filter((task) => task.id !== taskId),
        }))
      );
    } catch (error) {
      console.error("Failed to fail task:", error);
    }
  };

  const handleReschedule = async (
    goalId: number,
    taskId: number,
    date: string
  ) => {
    try {
      const baseUrl =
        Platform.OS === "android"
          ? "http://10.0.2.2:8000"
          : "http://127.0.0.1:8000";
      await fetch(`${baseUrl}/api/v1/task/reschedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task_id: taskId,
          assigned_goal_id: goalId,
          new_date: date,
        }),
      });
      setData((prev) =>
        prev.map((goal) =>
          goal.id === goalId
            ? {
                ...goal,
                tasks: goal.tasks.filter((task) => task.id !== taskId),
              }
            : goal
        )
      );
      Alert.alert("Success", "Task has been rescheduled");
    } catch (error) {
      console.error("Failed to reschedule task:", error);
    }
  };

  const handleCustomizeGoal = async (goal: Goal) => {
    setIsLoading(true);
    try {
      const baseUrl =
        Platform.OS === "android"
          ? "http://10.0.2.2:8000"
          : "http://127.0.0.1:8000";

      const resp = await fetch(`${baseUrl}/api/v1/goal/${goal.id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log(goal.id);

      if (!resp.ok) throw new Error(`Error: ${resp.status}`);
      const responseData = await resp.json();
      const goalData = responseData.goal;

      console.log(
        "Customize Goal Response:",
        JSON.stringify(goalData, null, 2)
      );

      setTimeout(() => {
        router.push({
          pathname: "/(other)/customGoal",
          params: {
            initialGoalData: JSON.stringify(goalData),
            assignedGoalId: goal.id,
          },
        });
        setIsLoading(false);
      }, 500);
    } catch (error) {
      console.error("Failed to fetch goal for customization:", error);
      setError("Failed to load goal data. Please try again.");
      setIsLoading(false);
    }
  };

  const handleDeleteGoal = async (goalId: number) => {
    try {
      const baseUrl =
        Platform.OS === "android"
          ? "http://10.0.2.2:8000"
          : "http://127.0.0.1:8000";

      const response = await fetch(`${baseUrl}/api/v1/goal/delete/${goalId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const result = await response.json();
      console.log("Goal deleted successfully:", result);

      // Remove the deleted goal from the state
      setData((prev) => prev.filter((goal) => goal.id !== goalId));
      Alert.alert("Success", "Goal has been deleted successfully.");
    } catch (error) {
      console.error("Failed to delete goal:", error);
      Alert.alert("Error", "Failed to delete the goal. Please try again.");
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      if (user && user.id) {
        fetchGoals(selectedDate, user.id);
      }
    }, [selectedDate, user])
  );

  return (
    <View style={{ flex: 1 }}>
      <Header>
        <View
          style={{ gap: 10, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ color: "#fff", fontSize: 20, fontStyle: "italic" }}>
            Start today, conquer tomorrow
          </Text>
          <Text
            style={{
              color: "#fff",
              fontSize: 36,
              fontWeight: "bold",
              marginBottom: 20,
            }}
          >
            {currentMonth || format(today, "MMMM")}
          </Text>
        </View>

        <View onLayout={onDateLayout}>
          <Animated.View
            style={[
              animateDateSelected,
              {
                width: dimensions.width / 7,
                height: 48,
                borderRadius: 100,
                position: "absolute",
                backgroundColor: "#4E5A94",
                bottom: 32,
              },
            ]}
          />

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-around",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            {dayNames.map((day, i) => (
              <Text
                key={i}
                style={{ color: "white", width: 48, textAlign: "center" }}
              >
                {day}
              </Text>
            ))}
          </View>

          <PagerView
            style={{ height: 80 }}
            initialPage={initialPage}
            onPageSelected={(e) => {
              const weekIndex = e.nativeEvent.position;
              const visibleWeek = dates[weekIndex];
              setCurrentMonth(format(visibleWeek[0], "MMMM"));
              setSelectedDate(visibleWeek[latestIndex]);
            }}
          >
            {dates.map((week, i) => (
              <View key={i} style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  {week.map((day, i) => (
                    <View key={i} style={{ alignItems: "center", gap: 10 }}>
                      <Pressable
                        onPress={() => setSelectedDate(day)}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 100,
                          justifyContent: "space-around",
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: isSameDay(day, selectedDate)
                              ? "#fff"
                              : isSameDay(day, today)
                              ? "#8B98D5"
                              : "#B7B7B7",
                            fontWeight:
                              isSameDay(day, selectedDate) ||
                              isSameDay(day, today)
                                ? "bold"
                                : "normal",
                            textDecorationLine:
                              isSameDay(day, today) &&
                              !isSameDay(day, selectedDate)
                                ? "underline"
                                : "none",
                          }}
                        >
                          {day.getDate()}
                        </Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </PagerView>
        </View>
      </Header>

      <ScrollView>
        <Animated.View style={{ marginTop: 20, marginBottom: 120 }}>
          {isLoading ? (
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                marginTop: 50,
              }}
            >
              <ActivityIndicator size="large" color="#4E5A94" />
              <Text style={{ marginTop: 10, color: "#666" }}>
                Loading your goals...
              </Text>
            </View>
          ) : error ? (
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                marginTop: 50,
              }}
            >
              <Text style={{ color: "red" }}>{error}</Text>
              <Pressable
                style={{
                  marginTop: 20,
                  backgroundColor: "#4E5A94",
                  padding: 10,
                  borderRadius: 5,
                }}
                onPress={() => user && fetchGoals(selectedDate, user.id)}
              >
                <Text style={{ color: "white" }}>Try Again</Text>
              </Pressable>
            </View>
          ) : data.length === 0 ? (
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                marginTop: 50,
              }}
            >
              <Text style={{ color: "#666" }}>
                No goals scheduled for today
              </Text>
            </View>
          ) : (
            data.map((goal, i) => (
              <Collapsable
                key={goal.id}
                title={goal.title}
                type={goal.type || "Goal"}
                onComplete={() =>
                  user &&
                  handleCompleteAllTasks(
                    i,
                    user.id,
                    goal.tasks.map((t) => t.id)
                  )
                }
                onFail={() =>
                  user &&
                  handleFailAllTasks(
                    i,
                    user.id,
                    goal.tasks.map((t) => t.id)
                  )
                }
                onCustomize={() => handleCustomizeGoal(goal)}
                onDelete={() => {
                  Alert.alert(
                    "Delete Goal",
                    "Are you sure you want to delete this goal?",
                    [
                      {
                        text: "Cancel",
                        style: "cancel",
                      },
                      {
                        text: "Delete",
                        onPress: () => handleDeleteGoal(goal.id),
                      },
                    ]
                  );
                }}
                onCollapseFinish={() => {
                  setTimeout(() => {
                    setData((prev) => prev.filter((g) => g.id !== goal.id));
                  }, 300);
                }}
              >
                {goal.tasks.map((task) => (
                  <CollapseItem
                    key={task.id}
                    title={task.title}
                    description={task.description || ""}
                    onComplete={() =>
                      user &&
                      handleCompleteTask(task.id, user.id, [task.id], goal.id)
                    }
                    onFail={() =>
                      user && handleFailTask(user.id, task.id, goal.id)
                    }
                    onReschedule={(date) =>
                      handleReschedule(goal.id, task.id, date)
                    }
                  />
                ))}
              </Collapsable>
            ))
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}