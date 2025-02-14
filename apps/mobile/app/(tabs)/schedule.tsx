import { Feather } from "@expo/vector-icons";
import {
  View,
  Text,
  Image,
  Pressable,
  LayoutChangeEvent,
  ScrollView,
  FlatList,
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
import { useClerk } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { routes } from "@/routesConfig";

export default function schedule() {
  const { signOut } = useClerk();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace(routes.signIn);
  };
  const [currentMonth, setCurrentMonth] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [latestIndex, setLatestIndex] = useState(0);
  const dayNames = ["S", "M", "T", "W", "T", "F", "S"];
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
    week.some((day) => isSameDay(day, today)),
  );

  useEffect(() => {
    const dayIndex = selectedDate.getDay();
    (datePosX.value = withSpring((dimensions.width / 7) * dayIndex)),
      {
        mass: 1,
        damping: 20,
        stiffness: 200,
        overshootClamping: false,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 2,
      };
    setLatestIndex(dayIndex);
  }, [selectedDate, dimensions.width, latestIndex]);

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
          overshootClamping: false,
          restDisplacementThreshold: 0.01,
          restSpeedThreshold: 2,
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

  const [data, setData] = useState([
    {
      id: 1,
      title: "I want to save $5000 by the end of the months",
      type: "SMART GOALS",
      startDate: new Date(),
      dueDate: new Date(startDate.getDate() + 30),
      tasks: [
        {
          id: 1,
          title: "Morning Routine",
          status: "inProgress",
          description:
            "Start your day with a structured morning routine including exercise, meditation, and healthy breakfast to boost productivity and wellness",
          repeat: {
            id: 1,
            type: "daily",
            interval: null,
          },
        },
        {
          id: 2,
          title: "Morning Routine",
          status: "inProgress",
          description:
            "Start your day with a structured morning routine including exercise, meditation, and healthy breakfast to boost productivity and wellness",
          repeat: {
            id: 2,
            type: "weekly",
            interval: [1, 3, 5], // Monday, Wednesday, Friday
          },
        },
      ],
    },
    {
      id: 2,
      title: "I want to save $5000 by the end of the months",
      type: "SMART GOALS",
      startDate: new Date(),
      dueDate: new Date(startDate.getDate() + 30),
      tasks: [
        {
          id: 1,
          title: "Morning Routine",
          status: "inProgress",
          description:
            "Start your day with a structured morning routine including exercise, meditation, and healthy breakfast to boost productivity and wellness",
          repeat: {
            id: 1,
            type: "daily",
            interval: null,
          },
        },
        {
          id: 2,
          title: "Morning Routine",
          status: "inProgress",
          description:
            "Start your day with a structured morning routine including exercise, meditation, and healthy breakfast to boost productivity and wellness",
          repeat: {
            id: 2,
            type: "weekly",
            interval: [1, 3, 5], // Monday, Wednesday, Friday
          },
        },
      ],
    },
  ]);

  const handleFailAllTasks = (goalId: number) => {
    setData((prev) =>
      prev.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              tasks: goal.tasks.map((task) => ({
                ...task,
                status: "failed",
              })),
            }
          : goal,
      ),
    );
    console.log(data);
    setData((prev) => prev.filter((goal) => goal.id !== goalId));
  };

  const handleCompleteAllTasks = (goalId: number) => {
    console.log(data.filter((goal) => goal.id !== goalId));
    setTimeout(
      () => setData((prev) => prev.filter((goal) => goal.id !== goalId)),
      300,
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          height: 320,
          backgroundColor: "#16171F",
          borderBottomLeftRadius: 30,
          borderBottomRightRadius: 30,
          padding: 24,
          gap: 18,
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: 10,
          },
          shadowRadius: 10,
          shadowOpacity: 0.1,
          elevation: 5,
        }}
      >
        <View
          style={{
            justifyContent: "space-between",
            alignItems: "center",
            flexDirection: "row",
          }}
        >
          <Feather name="menu" size={24} color="#fff" />
          <Pressable onPress={handleSignOut} style={{ alignItems: "center" }}>
            <Image
              source={{ uri: "https://picsum.photos/200/300" }}
              style={{ width: 35, height: 35, borderRadius: 100 }}
              resizeMode="cover"
            />
          </Pressable>
        </View>
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
            {dayNames.map((day, i) => {
              return (
                <Text
                  key={i}
                  style={{ color: "white", width: 48, textAlign: "center" }}
                >
                  {day}
                </Text>
              );
            })}
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
            {dates.map((week, i) => {
              return (
                <View key={i} style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    {week.map((day, i) => {
                      return (
                        <View key={i} style={{ alignItems: "center", gap: 10 }}>
                          <Pressable
                            onPress={(e) => {
                              e.preventDefault();
                              setSelectedDate(day);
                            }}
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
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </PagerView>
        </View>
      </View>

      <ScrollView>
        <Animated.View style={{ marginTop: 20, marginBottom: 120 }}>
          {data.map((goal, _) => (
            <Collapsable
              key={goal.id}
              title={goal.title}
              type={goal.type}
              onComplete={() => handleCompleteAllTasks(goal.id)}
              onFail={() => handleFailAllTasks(goal.id)}
            >
              {goal.tasks.map((task) => (
                <CollapseItem
                  key={task.id}
                  title={task.title}
                  description={task.description}
                />
              ))}
            </Collapsable>
          ))}
        </Animated.View>
      </ScrollView>
    </View>
  );
}
