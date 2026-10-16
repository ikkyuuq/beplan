import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Alert } from "@/utils/alert";
import {
  addDays,
  eachDayOfInterval,
  eachWeekOfInterval,
  subDays,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isTomorrow,
  isYesterday,
  startOfDay,
  startOfWeek,
} from "date-fns";
import PagerView, { type PagerHandle } from "@/components/PagerViewWrapper";
import { useRef, useState } from "react";
import Animated from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import CollapseItem from "@/components/CollapseItem";
import Collapsable from "@/components/Collapsable";
import Header from "@/components/Header";
import { useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import React from "react";
import { API_BASE_URL } from "@/constants/api";
import { useApiFetch } from "@/hooks/useApiFetch";

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
export default function Schedule() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Goal[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const { user } = useUser();
  const apiFetch = useApiFetch();
  const router = useRouter();

  const today = new Date();
  const startDate = startOfWeek(subDays(today, 60), { weekStartsOn: 0 });
  const endDate = addDays(
    startOfWeek(addDays(today, 60), { weekStartsOn: 0 }),
    6,
  );

  const dates = eachWeekOfInterval(
    {
      start: startDate,
      end: endDate,
    },
    { weekStartsOn: 0 },
  ).reduce((acc: Date[][], curr) => {
    const allDays = eachDayOfInterval({
      start: curr,
      end: addDays(curr, 6),
    });
    acc.push(allDays);
    return acc;
  }, []);

  // ====================== Week strip ======================
  // Page index of the week that contains today (the pager opens there).
  const todayPage = dates.findIndex((week) =>
    week.some((day) => isSameDay(day, today)),
  );
  const [pageIndex, setPageIndex] = useState(todayPage);
  const pagerRef = useRef<PagerHandle>(null);

  // Month/year of the visible week, taken from its middle day so a week that
  // spans two months shows the month most of it belongs to.
  const visibleMonth = format(dates[pageIndex]?.[3] ?? today, "MMMM yyyy");

  const isTodaySelected = isSameDay(selectedDate, today);
  const selectedLabel = isTodaySelected
    ? "Today"
    : isTomorrow(selectedDate)
      ? "Tomorrow"
      : isYesterday(selectedDate)
        ? "Yesterday"
        : null;
  const showTodayButton = !isTodaySelected || pageIndex !== todayPage;
  // Tasks can only be marked on their day; future days are a read-only preview.
  const isFutureDay = isAfter(startOfDay(selectedDate), startOfDay(today));

  // Browsing weeks (swipe or arrows) only changes what's visible. The selected
  // day changes only when the user taps a day, so their pick stays highlighted
  // and its goals stay listed while they look around.
  const handleWeekChange = (index: number) => {
    if (dates[index]) setPageIndex(index);
  };

  const goToWeek = (delta: number) => {
    const target = Math.max(0, Math.min(pageIndex + delta, dates.length - 1));
    if (target !== pageIndex) pagerRef.current?.setPage(target);
  };

  const goToToday = () => {
    if (pageIndex !== todayPage) pagerRef.current?.setPage(todayPage);
    setSelectedDate(today);
  };

  const fetchGoals = React.useCallback(
    async (selectedDate: Date, userId: string, signal: AbortSignal) => {
      setIsLoading(true);
      setError(null);
      try {
        const resp = await apiFetch(
          `${API_BASE_URL}/api/v1/goal/?user_id=${encodeURIComponent(
            userId
          )}&today=${format(
            selectedDate,
            "yyyy-MM-dd"
          )}`,
          { signal }
        );
        if (!resp.ok) {
          const responseBody = await resp.text();
          throw new Error(
            `Goal request failed (${resp.status})${
              responseBody ? `: ${responseBody}` : ""
            }`
          );
        }
        const data = await resp.json();
        if (signal.aborted) return;
        setData(data);
      } catch (error) {
        if (signal.aborted) return;
        console.error("Failed to fetch goals:", error);
        setError(
          error instanceof TypeError
            ? `Cannot reach the backend at ${API_BASE_URL}. Check that the API is running and that this device can access the configured address.`
            : error instanceof Error
              ? error.message
              : "Failed to load your goals. Please try again."
        );
        setData([]);
      } finally {
        if (!signal.aborted) setIsLoading(false);
      }
    },
    []
  );

  const userId = user?.id;

  // Mark tasks done/failed on the server. Throws unless the server confirms,
  // so the UI only drops a task or goal after a successful update.
  const updateTaskStatus = async (
    taskIds: number[],
    to: "success" | "failed",
  ) => {
    const response = await apiFetch(
      `${API_BASE_URL}/api/v1/goal/update_task_status`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_task_id: taskIds, to }),
      },
    );
    if (!response.ok) {
      // Prefer the server's reason (e.g. "This task is scheduled for Oct 20...").
      const body = await response.json().catch(() => null);
      throw new Error(body?.detail || `Status update failed (HTTP ${response.status})`);
    }
  };

  // The swipe animation has already hidden the card when the request runs, so
  // on failure reload the list; cards are keyed by refreshKey and remount visible.
  const handleStatusUpdateError = (error: unknown) => {
    console.error("Failed to update task status:", error);
    Alert.alert(
      "Couldn't update",
      error instanceof Error && error.message
        ? error.message
        : "Your change wasn't saved. Please try again.",
    );
    setRefreshKey((key) => key + 1);
  };

  // Swipe on a goal card: complete or fail all of its tasks for this day.
  const handleGoalStatus = async (
    goalId: number,
    taskIds: number[],
    to: "success" | "failed",
  ) => {
    try {
      await updateTaskStatus(taskIds, to);
      setData((prev) => prev.filter((goal) => goal.id !== goalId));
    } catch (error) {
      handleStatusUpdateError(error);
    }
  };

  // Swipe on a single task.
  const handleTaskStatus = async (
    goalId: number,
    taskId: number,
    to: "success" | "failed",
  ) => {
    try {
      await updateTaskStatus([taskId], to);
      setData((prev) =>
        prev.map((goal) =>
          goal.id === goalId
            ? { ...goal, tasks: goal.tasks.filter((task) => task.id !== taskId) }
            : goal,
        ),
      );
    } catch (error) {
      handleStatusUpdateError(error);
    }
  };

  const handleReschedule = async (
    goalId: number,
    taskId: number,
    date: string,
  ) => {
    try {
      await apiFetch(`${API_BASE_URL}/api/v1/reschedule/task`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assigned_task_id: taskId,
          user_id: user?.id,
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
            : goal,
        ),
      );
      Alert.alert("Success", "Task has been rescheduled");
    } catch (error) {
      console.error("Failed to reschedule task:", error);
    }
  };

  const handleCustomizeGoal = async (goal: Goal) => {
    setIsLoading(true);
    try {
      const resp = await apiFetch(`${API_BASE_URL}/api/v1/goal/${goal.id}`, {
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
        JSON.stringify(goalData, null, 2),
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
      const response = await apiFetch(`${API_BASE_URL}/api/v1/goal/delete/${goalId}`, {
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
      if (!userId) return;
      const controller = new AbortController();
      void fetchGoals(selectedDate, userId, controller.signal);
      return () => controller.abort();
    }, [fetchGoals, selectedDate, userId, refreshKey])
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
          {/* Month of the visible week, with previous/next week buttons */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              alignSelf: "stretch",
              marginBottom: 12,
            }}
          >
            <Pressable
              onPress={() => goToWeek(-1)}
              disabled={pageIndex === 0}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Previous week"
            >
              <Feather
                name="chevron-left"
                size={28}
                color={pageIndex === 0 ? "#555" : "#fff"}
              />
            </Pressable>
            <Text style={{ color: "#fff", fontSize: 28, fontWeight: "bold" }}>
              {visibleMonth}
            </Text>
            <Pressable
              onPress={() => goToWeek(1)}
              disabled={pageIndex === dates.length - 1}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Next week"
            >
              <Feather
                name="chevron-right"
                size={28}
                color={pageIndex === dates.length - 1 ? "#555" : "#fff"}
              />
            </Pressable>
          </View>
        </View>

        {/* Week strip: weekday + date per cell. Selected = filled pill,
            today = bold with a dot, past days dimmed. */}
        <PagerView
          ref={pagerRef}
          style={{ height: 76 }}
          initialPage={todayPage}
          onPageSelected={(e: any) => handleWeekChange(e.nativeEvent.position)}
        >
          {dates.map((week, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                flexDirection: "row",
                justifyContent: "space-around",
              }}
            >
              {week.map((day) => {
                const isSelected = isSameDay(day, selectedDate);
                const isTodayCell = isSameDay(day, today);
                const isPast = isBefore(day, startOfDay(today));
                return (
                  <Pressable
                    key={day.toISOString()}
                    onPress={() => setSelectedDate(day)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${isTodayCell ? "Today, " : ""}${format(day, "EEEE, MMMM d")}`}
                    style={{
                      width: 44,
                      paddingVertical: 8,
                      borderRadius: 14,
                      alignItems: "center",
                      gap: 4,
                      backgroundColor: isSelected ? "#4E5A94" : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: isSelected ? "#fff" : isPast ? "#6F6F7A" : "#B7B7B7",
                      }}
                    >
                      {format(day, "EEEEE")}
                    </Text>
                    <Text
                      style={{
                        fontSize: 17,
                        fontWeight: isSelected || isTodayCell ? "700" : "500",
                        color: isSelected
                          ? "#fff"
                          : isTodayCell
                            ? "#8B98D5"
                            : isPast
                              ? "#6F6F7A"
                              : "#E6E6E6",
                      }}
                    >
                      {day.getDate()}
                    </Text>
                    <View
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: 3,
                        backgroundColor: isTodayCell
                          ? isSelected
                            ? "#fff"
                            : "#8B98D5"
                          : "transparent",
                      }}
                    />
                  </Pressable>
                );
              })}
            </View>
          ))}
        </PagerView>

        {/* Which day is shown, and a way back to today */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 12,
            paddingHorizontal: 4,
            minHeight: 32,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 }}>
            <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>
              {selectedLabel ? `${selectedLabel} · ` : ""}
              {format(selectedDate, "EEEE, MMM d")}
            </Text>
            {/* Future days are a read-only preview: tasks are marked on their day. */}
            {isFutureDay && (
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 999,
                  backgroundColor: "#2A2C3A",
                }}
              >
                <Text style={{ color: "#B7B7B7", fontSize: 11, fontWeight: "600" }}>
                  Upcoming
                </Text>
              </View>
            )}
          </View>
          {showTodayButton && (
            <Pressable
              onPress={goToToday}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Go to today"
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: "#8B98D5",
              }}
            >
              <Text style={{ color: "#8B98D5", fontSize: 13, fontWeight: "600" }}>
                Today
              </Text>
            </Pressable>
          )}
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
                onPress={() => setRefreshKey((key) => key + 1)}
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
            data.map((goal) => (
              <Collapsable
                key={`${goal.id}-${refreshKey}`}
                markable={!isFutureDay}
                title={goal.title}
                type={goal.type || "Goal"}
                onComplete={() =>
                  handleGoalStatus(
                    goal.id,
                    goal.tasks.map((t) => t.id),
                    "success",
                  )
                }
                onFail={() =>
                  handleGoalStatus(
                    goal.id,
                    goal.tasks.map((t) => t.id),
                    "failed",
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
                    ],
                  );
                }}
                onCollapseFinish={() =>
                  setData((prev) => prev.filter((g) => g.id !== goal.id))
                }
              >
                {goal.tasks.map((task) => (
                  <CollapseItem
                    key={task.id}
                    markable={!isFutureDay}
                    title={task.title}
                    description={task.description || ""}
                    onComplete={() =>
                      handleTaskStatus(goal.id, task.id, "success")
                    }
                    onFail={() => handleTaskStatus(goal.id, task.id, "failed")}
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
