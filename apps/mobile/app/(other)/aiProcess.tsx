import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useUser } from "@clerk/clerk-expo";
import Animated, {
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

type PredictionResult = {
  originalText: string;
  prediction: Record<string, Array<{ text: string }>>;
};

type Question = {
  label: string;
  question: string;
  type: "yes-no" | "open-ended" | "date";
};

type Task = {
  title: string;
  description: string;
  repeatType: "daily" | "weekly" | "monthly" | "date";
  weekInterval: number[] | null;
  dateInterval: string[] | null;
};

type Goal = {
  title: string;
  type: string;
  start_date: string;
  due_date: string;
  tasks: Task[];
};

enum ProcessStep {
  VALIDATING = "validating",
  ANIMATING = "animating",
  ASKING_QUESTIONS = "asking_questions",
  GENERATING_GOAL = "generating_goal",
  CREATING_GOAL = "creating_goal",
  COMPLETED = "completed",
  ERROR = "error",
}

const AnimatedKey = ({
  index,
  active,
  children,
  onComplete,
}: {
  index: number;
  active: boolean;
  children: React.ReactNode;
  onComplete: () => void;
}) => {
  const progress = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ["#a1a1aa", active ? "#34d399" : "#f4335e"],
    ),
  }));

  useEffect(() => {
    progress.value = withDelay(
      index * 700,
      withTiming(1, { duration: 500 }, (finished) => {
        finished && runOnJS(onComplete)();
      }),
    );
  }, []);

  return (
    <Animated.View style={[styles.key, animatedStyle]}>
      <Text style={styles.keyText}>{children}</Text>
    </Animated.View>
  );
};

export default function AiProcess() {
  const params = useLocalSearchParams();
  const { user } = useUser();
  const textToProcess =
    params.textToProcess?.toString().replaceAll('"', "") || "";

  const [step, setStep] = useState(ProcessStep.VALIDATING);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [predictionRes, setPredictionRes] = useState<PredictionResult>();
  const [predictionStatus, setPredictionStatus] = useState<
    Record<string, boolean>
  >({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [goal, setGoal] = useState<Goal>();
  const [animationCompleteCount, setAnimationCompleteCount] = useState(0);

  const totalKeys = Object.keys(predictionStatus).length;

  const handleError = (message: string) => {
    setError(message);
    setLoading(false);
    setStep(ProcessStep.ERROR);
  };

  const validateSentence = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://10.0.2.2:8000/api/v1/ai/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToProcess }),
      });

      if (!response.ok)
        throw new Error(`Validation failed: ${response.status}`);

      const data = await response.json();
      setPredictionRes({
        originalText: textToProcess,
        prediction: data.prediction,
      });

      // Immediately calculate prediction status
      const status = Object.entries(data.prediction).reduce(
        (acc, [key, value]) => ({
          ...acc,
          [key]: (value as any[]).length > 0,
        }),
        {},
      );
      setPredictionStatus(status);

      // Force transition to animating step
      setStep(ProcessStep.ANIMATING);
    } catch (err) {
      handleError("Failed to validate goal. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step === ProcessStep.VALIDATING) {
      validateSentence();
    }
  }, [step]);

  useEffect(() => {
    if (
      step === ProcessStep.ANIMATING &&
      animationCompleteCount === totalKeys
    ) {
      const hasMissing = Object.values(predictionStatus).some((v) => !v);

      if (hasMissing) {
        fetchQuestionsForMissingKeys().then((questions) => {
          questions.length > 0
            ? setStep(ProcessStep.ASKING_QUESTIONS)
            : setStep(ProcessStep.GENERATING_GOAL);
        });
      } else {
        setStep(ProcessStep.GENERATING_GOAL);
      }
    }
  }, [animationCompleteCount, totalKeys]);

  const fetchQuestionsForMissingKeys = async (): Promise<Question[]> => {
    try {
      setLoading(true);
      const response = await fetch(
        "http://10.0.2.2:8000/api/v1/ai/generate-questions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            original_text: textToProcess,
            prediction: predictionRes?.prediction || {},
          }),
        },
      );

      if (!response.ok) throw new Error("Question generation failed");

      const data = await response.json();
      return data.result || [];
    } catch (err) {
      handleError("Failed to get questions. Please try again.");
      return [];
    } finally {
      setLoading(false);
    }
  };

  // ... keep other functions same as previous version ...

  const renderContent = () => {
    if (step === ProcessStep.ERROR) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button
            title="Retry"
            onPress={() => {
              setError("");
              setStep(ProcessStep.VALIDATING);
            }}
          />
        </View>
      );
    }

    if (loading) {
      return <ActivityIndicator size="large" color="#fff" />;
    }

    switch (step) {
      case ProcessStep.VALIDATING:
        return <Text style={styles.infoText}>Analyzing your goal...</Text>;

      case ProcessStep.ANIMATING:
        return (
          <View style={styles.animationContainer}>
            <View style={styles.keysRow}>
              {Object.entries(predictionStatus).map(([key, active], index) => (
                <AnimatedKey
                  key={key}
                  index={index}
                  active={active}
                  onComplete={() =>
                    setAnimationCompleteCount((prev) => prev + 1)
                  }
                >
                  {key.charAt(0).toUpperCase()}
                </AnimatedKey>
              ))}
            </View>
            <Text style={styles.goalText}>{predictionRes?.originalText}</Text>
          </View>
        );

      case ProcessStep.ASKING_QUESTIONS:
        return questions[currentQuestionIndex] ? (
          <View style={styles.questionContainer}>
            <Text style={styles.questionText}>
              {questions[currentQuestionIndex].question}
            </Text>
            <TextInput
              value={currentAnswer}
              onChangeText={setCurrentAnswer}
              style={styles.input}
              placeholder="Type your answer..."
              placeholderTextColor="#94a3b8"
            />
            <Button
              title="Submit"
              onPress={handleSubmitAnswer}
              disabled={!currentAnswer.trim()}
            />
          </View>
        ) : (
          <Text style={styles.infoText}>Generating goal...</Text>
        );

      case ProcessStep.GENERATING_GOAL:
      case ProcessStep.CREATING_GOAL:
        return <Text style={styles.infoText}>Creating your goal plan...</Text>;

      case ProcessStep.COMPLETED:
        return (
          <View style={styles.completedContainer}>
            <Text style={styles.completedText}>
              Goal created successfully! 🎉
            </Text>
          </View>
        );

      default:
        return <Text style={styles.infoText}>Processing...</Text>;
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {renderContent()}
    </KeyboardAvoidingView>
  );
}

// Keep styles same as previous version

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#16171F",
    padding: 16,
    justifyContent: "center",
  },
  errorContainer: {
    backgroundColor: "#dc2626",
    padding: 16,
    borderRadius: 8,
    margin: 16,
    alignItems: "center",
  },
  errorText: {
    color: "white",
    fontSize: 16,
    marginBottom: 12,
  },
  animationContainer: {
    alignItems: "center",
  },
  keysRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 24,
  },
  key: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 999,
    margin: 4,
  },
  keyText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  goalText: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
  },
  questionContainer: {
    width: "100%",
    paddingHorizontal: 16,
  },
  questionText: {
    color: "white",
    fontSize: 18,
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#1e293b",
    color: "white",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
  },
  completedContainer: {
    alignItems: "center",
  },
  completedText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
});
