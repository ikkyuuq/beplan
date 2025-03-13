import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, Platform } from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { useFocusEffect } from "expo-router";

type Task = {
  id: number;
  title: string;
  description: string | null;
  repeat_type?: string;
  date_interval?: string[];
  week_interval?: string[];
  status?: string;
};

type Goal = {
  id: number;
  title: string;
  status: string;
  start_date: string;
  due_date: string;
  tasks: Task[];
};

// ====================== Service สำหรับดึงข้อมูล ======================
const baseUrl =
  Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://127.0.0.1:8000";

const fetchAllGoalsAndTasks = async (userId: string): Promise<Goal[]> => {
  try {
    if (!userId) throw new Error("User ID is required");

    // เรียกใช้ endpoint ที่มีอยู่
    const response = await fetch(
      `${baseUrl}/api/v1/goal/?user_id=${userId}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log("API Response:", data); // Log ข้อมูลที่ได้จาก API
    return data;
  } catch (error) {
    console.error("Failed to fetch goals and tasks:", error);
    throw error;
  }
};

// ====================== หน้า AllGoalAllTask ======================
export default function AllGoalAllTask() {
  const { user } = useUser();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ดึงข้อมูล Goal และ Task ทั้งหมด
  const fetchData = async () => {
    if (!user || !user.id) {
      setError("User ID is missing. Please log in again.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAllGoalsAndTasks(user.id);
      console.log("Fetched Data:", data); // Log ข้อมูลที่ได้
      setGoals(data);
    } catch (error) {
      console.error("Failed to fetch goals and tasks:", error);
      setError("Failed to load data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ใช้ useFocusEffect เพื่อดึงข้อมูลใหม่ทุกครั้งที่หน้าถูกโฟกัส
  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [user])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>All Goals and Tasks</Text>
      {isLoading ? (
        <ActivityIndicator size="large" color="#4E5A94" />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : goals.length === 0 ? (
        <Text style={styles.emptyText}>No goals or tasks found.</Text>
      ) : (
        <ScrollView>
          {goals.map((goal) => (
            <View key={goal.id} style={styles.goalContainer}>
              <Text style={styles.goalTitle}>{goal.title}</Text>
              <Text style={styles.goalStatus}>Status: {goal.status}</Text>
              <Text style={styles.goalDates}>
                Start Date: {goal.start_date} | Due Date: {goal.due_date}
              </Text>
              {goal.tasks.map((task) => (
                <View key={task.id} style={styles.taskContainer}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <Text style={styles.taskDescription}>{task.description}</Text>
                  <Text style={styles.taskStatus}>Status: {task.status}</Text>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ====================== Styles ======================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#16171F",
  },
  goalContainer: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4E5A94",
    marginBottom: 10,
  },
  goalStatus: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  goalDates: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  taskContainer: {
    marginLeft: 10,
    marginBottom: 10,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  taskDescription: {
    fontSize: 14,
    color: "#666",
  },
  taskStatus: {
    fontSize: 14,
    color: "#666",
  },
  errorText: {
    color: "red",
    textAlign: "center",
  },
  emptyText: {
    color: "#666",
    textAlign: "center",
  },
});