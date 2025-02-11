import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { useState, useEffect } from "react";
import { Ionicons, Feather, MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { StyleSheet } from "react-native";

type Task = {
  id: string;
  text: string;
  type: "daily" | "weekly" | "monthly";
};

export default function CustomizeGoal() {
  const router = useRouter();
  const { title, tasks } = useLocalSearchParams();

  const formattedTitle = Array.isArray(title) ? title[0] : title || "";
  const [goalTitle, setGoalTitle] = useState<string>(formattedTitle);
  const [taskList, setTaskList] = useState<Task[]>([]);

  useEffect(() => {
    if (tasks) {
      setTaskList(JSON.parse(tasks as string));
    }
  }, [tasks]);

  const removeTask = (id: string) => {
    setTaskList(taskList.filter((task) => task.id !== id));
  };
  const changeTaskType = (id: string, newType: Task["type"]) => {
    setTaskList(
      taskList.map((task) =>
        task.id === id ? { ...task, type: newType } : task
      )
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>

      <Text style={styles.title}>Customize</Text>

      <Text style={styles.inputLabel}>Topic</Text>
      <TextInput
        value={goalTitle}
        onChangeText={setGoalTitle}
        style={styles.input}
      />

      <Text style={styles.inputLabel}>Tasks</Text>
      <FlatList
        data={taskList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.taskItem}>
            <Text style={styles.taskText}>{item.text}</Text>

            <Pressable
              onPress={() => {
                const nextType =
                  item.type === "daily"
                    ? "weekly"
                    : item.type === "weekly"
                    ? "monthly"
                    : "daily";
                changeTaskType(item.id, nextType);
              }}
            >
              <Text style={styles.taskType}>{item.type}</Text>
            </Pressable>

            <Pressable onPress={() => console.log("Edit Task", item.id)}>
              <Feather
                name="edit-2"
                size={20}
                color="#fff"
                style={{ marginRight: 10 }}
              />
            </Pressable>
            <Pressable onPress={() => removeTask(item.id)}>
              <MaterialIcons name="delete" size={24} color="red" />
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#16171F",
    padding: 20,
    paddingTop: 80,
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    padding: 10,
  },
  title: {
    color: "#fff",
    fontSize: 40,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 16,
    textAlign: "center",
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
    fontSize: 18,
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#222",
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
  },
  taskText: {
    color: "#fff",
    flex: 1,
  },
  taskType: {
    color: "#fff",
    marginRight: 10,
  },
});
