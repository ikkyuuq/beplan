import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { routes } from "@/routesConfig";
import { LinearGradient } from "expo-linear-gradient";
import {
  View,
  Text,
  TextInput,
  Button,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
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
import DateTimePicker from "@react-native-community/datetimepicker";

// Component: Date Picker for date-type questions
const DatePickerComponent = ({
  answer,
  setAnswer,
  onSubmit,
}: {
  answer: string;
  setAnswer: (text: string) => void;
  onSubmit: () => void;
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [date, setDate] = useState(new Date());

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowPicker(false);
    if (selectedDate) {
      setDate(selectedDate);
      const formattedDate = selectedDate.toISOString().split("T")[0];
      setAnswer(formattedDate);
    }
  };

  return (
    <View style={styles.inputContainer}>
      <TextInput
        value={answer}
        placeholder="Select a date (YYYY-MM-DD)"
        placeholderTextColor="#aaa"
        style={styles.input}
        onFocus={() => setShowPicker(true)}
      />
      {showPicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
      <Button title="Submit Answer" onPress={onSubmit} />
    </View>
  );
};

// Component: Renders appropriate UI based on question type
const QuestionInput = ({
  question,
  answer,
  setAnswer,
  onSubmit,
}: {
  question: Question;
  answer: string;
  setAnswer: (text: string) => void;
  onSubmit: () => void;
}) => {
  if (question?.type === "open-ended") {
    return (
      <View style={styles.inputContainer}>
        <TextInput
          value={answer}
          onChangeText={setAnswer}
          placeholder="Type your answer here..."
          placeholderTextColor="#aaa"
          style={styles.multiLineInput}
          multiline
          numberOfLines={3}
        />
        <Button title="Submit Answer" onPress={onSubmit} />
      </View>
    );
  } else if (question?.type === "yes-no") {
    return (
      <View style={styles.buttonRow}>
        <View style={styles.buttonWrapper}>
          <Button
            title="Yes"
            onPress={() => {
              setAnswer("Yes");
              onSubmit();
            }}
            color="#34d399"
          />
        </View>
        <View style={styles.buttonWrapper}>
          <Button
            title="No"
            onPress={() => {
              setAnswer("No");
              onSubmit();
            }}
            color="#f4335e"
          />
        </View>
      </View>
    );
  } else if (question?.type === "date") {
    return (
      <DatePickerComponent
        answer={answer}
        setAnswer={setAnswer}
        onSubmit={onSubmit}
      />
    );
  } else {
    return null;
  }
};

const hasKey = "#34d399";
const noKey = "#f4335e";

enum ProcessStep {
  VALIDATING = "validating",
  ANIMATING = "animating",
  ASKING_QUESTIONS = "asking_questions",
  GENERATING_GOAL = "generating_goal",
  CREATING_GOAL = "creating_goal",
  COMPLETED = "completed",
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

  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        ["#a1a1aa", active ? hasKey : noKey],
      ),
    };
  });

  useEffect(() => {
    progress.value = withDelay(
      index * 700,
      withTiming(1, { duration: 500 }, (finished) => {
        if (finished) {
          runOnJS(onComplete)();
        }
      }),
    );
  }, []);

  return (
    <Animated.View style={[styles.animatedKey, animatedStyle]}>
      {children}
    </Animated.View>
  );
};

interface Question {
  label: string;
  question: string;
  type: "yes-no" | "open-ended" | "date";
}

interface Prediction {
  [key: string]: any[];
}

interface PredictionResult {
  originalText: string;
  prediction: Prediction;
}

interface Task {
  title: string;
  description: string;
  repeat_type: "daily" | "weekly" | "monthly" | "date";
  week_interval: number[] | null;
  date_interval: Date[] | null;
}

interface Goal {
  title: string;
  type: string;
  start_date: string;
  due_date: string;
  tasks: Task[];
}

export default function AiProcess() {
  const params = useLocalSearchParams();
  const textToProcess = params.textToProcess.toString().replaceAll('"', "");

  const [predictionRes, setPredictionRes] = useState<PredictionResult>();
  const [predictionStatus, setPredictionStatus] = useState<
    Record<string, boolean>
  >({});
  const [loading, setLoading] = useState(false);
  const { user } = useUser();

  // Process step state
  const [step, setStep] = useState<ProcessStep>(ProcessStep.VALIDATING);

  // Question states
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");

  const [goal, setGoal] = useState<Goal | null>(null);

  // ---------------------------
  // Step 1: Validate the sentence
  // ---------------------------
  const validateSentence = async (sentence: string) => {
    try {
      setLoading(true);
      const response = await fetch("http://10.0.2.2:8000/api/v1/ai/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sentence }),
      });
      const data = await response.json();
      setPredictionRes({
        originalText: textToProcess,
        prediction: data.prediction,
      });
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------
  // Set prediction status after validation
  // ---------------------------
  const handlePrediction = () => {
    if (!predictionRes) return;
    const status = Object.entries(predictionRes.prediction).reduce(
      (acc, [key, value]) => {
        acc[key] = value.length > 0;
        return acc;
      },
      {} as Record<string, boolean>,
    );
    setPredictionStatus(status);
  };

  // ---------------------------
  // Step 2: Generate questions for missing keys
  // ---------------------------
  const fetchQuestionsForMissingKeys = async () => {
    try {
      setLoading(true);
      if (!predictionRes) return;
      const formattedPrediction = Object.entries(
        predictionRes.prediction,
      ).reduce(
        (acc, [key, value]) => {
          acc[key] = Array.isArray(value) ? value : [value];
          return acc;
        },
        {} as Record<string, any[]>,
      );

      const response = await fetch(
        "http://10.0.2.2:8000/api/v1/ai/generate-questions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            original_text: textToProcess,
            prediction: formattedPrediction,
          }),
        },
      );
      const data = await response.json();
      setQuestions(data.result);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------
  // Submit a single question answer
  // ---------------------------
  const handleSubmitQuestion = async (question: Question, answer: string) => {
    if (!predictionRes) return;
    try {
      setLoading(true);
      const formattedPrediction = Object.entries(
        predictionRes.prediction,
      ).reduce(
        (acc, [key, value]) => {
          acc[key] = Array.isArray(value) ? value : [value];
          return acc;
        },
        {} as Record<string, any[]>,
      );
      const response = await fetch(
        "http://10.0.2.2:8000/api/v1/ai/submit-question",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prediction_result: {
              original_text: textToProcess,
              prediction: formattedPrediction,
            },
            question: question.question,
            value: answer,
            to_label: question.label,
          }),
        },
      );
      const data = await response.json();
      const newFormattedPrediction = Object.entries(
        data.result.prediction,
      ).reduce(
        (acc, [key, value]) => {
          acc[key] = Array.isArray(value) ? value : [value];
          return acc;
        },
        {} as Record<string, any[]>,
      );
      setPredictionRes({
        originalText: textToProcess,
        prediction: newFormattedPrediction,
      });
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------
  // Generate a goal based on updated prediction
  // ---------------------------
  const generateGoal = async () => {
    try {
      setLoading(true);
      const formattedPrediction = Object.entries(
        predictionRes?.prediction || {},
      ).reduce(
        (acc, [key, value]) => {
          acc[key] = Array.isArray(value) ? value : [value];
          return acc;
        },
        {} as Record<string, any[]>,
      );
      const response = await fetch(
        "http://10.0.2.2:8000/api/v1/ai/generate-goal",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            original_text: textToProcess,
            prediction: formattedPrediction,
          }),
        },
      );
      const data = await response.json();
      setGoal(data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------
  // Create the goal in the backend
  // ---------------------------
  const handleCreateGoal = async () => {
    if (!goal || !user) return;
    try {
      setLoading(true);
      const response = await fetch("http://10.0.2.2:8000/api/v1/ai/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, goal }),
      });
      const data = await response.json();
      if (response.ok) {
        console.log("Goal created successfully");
        router.push("/(tabs)/schedule");
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
      setStep(ProcessStep.COMPLETED);
    }
  };

  // ---------------------------
  // useEffects to manage the flow
  // ---------------------------
  useEffect(() => {
    validateSentence(textToProcess);
  }, [textToProcess]);

  useEffect(() => {
    if (predictionRes && step === ProcessStep.VALIDATING) {
      handlePrediction();
      setStep(ProcessStep.ANIMATING);
    }
  }, [predictionRes]);

  const [animationCompleteCount, setAnimationCompleteCount] = useState(0);
  const totalKeys = Object.keys(predictionStatus).length;

  const handleKeyAnimationComplete = () => {
    setAnimationCompleteCount((prev) => prev + 1);
  };

  useEffect(() => {
    if (animationCompleteCount === totalKeys && totalKeys > 0) {
      const missing = Object.values(predictionStatus).some((v) => v === false);
      if (missing) {
        fetchQuestionsForMissingKeys().then(() =>
          setStep(ProcessStep.ASKING_QUESTIONS),
        );
      } else {
        setStep(ProcessStep.GENERATING_GOAL);
      }
    }
  }, [animationCompleteCount, totalKeys, predictionStatus]);

  useEffect(() => {
    if (
      step === ProcessStep.ASKING_QUESTIONS &&
      currentQuestionIndex >= questions.length &&
      questions.length > 0
    ) {
      setStep(ProcessStep.GENERATING_GOAL);
    }
  }, [currentQuestionIndex, questions, step]);

  useEffect(() => {
    if (step === ProcessStep.GENERATING_GOAL) {
      generateGoal().then(() => setStep(ProcessStep.CREATING_GOAL));
    }
  }, [step]);

  useEffect(() => {
    if (step === ProcessStep.CREATING_GOAL) {
      handleCreateGoal();
    }
  }, [step]);

  // For debugging
  useEffect(() => {
    console.log("Prediction:", predictionRes);
    console.log("Current step:", step);
  }, [step]);

  // ---------------------------
  // Handler for question answer submission
  // ---------------------------
  const onSubmitAnswer = async () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;

    // For yes-no questions, use the predefined answer
    const answerToSubmit =
      currentQuestion.type === "yes-no"
        ? currentAnswer
        : currentAnswer.trim() === ""
          ? null
          : currentAnswer;

    if (answerToSubmit === null) return;

    await handleSubmitQuestion(currentQuestion, answerToSubmit);
    setCurrentAnswer("");
    setCurrentQuestionIndex((prev) => prev + 1);
  };

  // ---------------------------
  // Render UI based on current process step
  // ---------------------------
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <LinearGradient
        colors={["#6A11CB", "#2575FC"]}
        style={styles.gradientBackground}
      />
      <View style={styles.progressContainer}>
        {[
          ProcessStep.VALIDATING,
          ProcessStep.ANIMATING,
          ProcessStep.ASKING_QUESTIONS,
          ProcessStep.GENERATING_GOAL,
          ProcessStep.CREATING_GOAL,
          ProcessStep.COMPLETED,
        ].map((processStep, index) => (
          <View
            key={processStep}
            style={[
              styles.progressDot,
              step === processStep && styles.progressDotActive,
            ]}
          />
        ))}
      </View>
      <View style={styles.centerContainer}>
        {loading && <ActivityIndicator size="large" color="#fff" />}
        {step === ProcessStep.VALIDATING && (
          <Text style={styles.titleText}>Analyzing your input...</Text>
        )}
        {step === ProcessStep.ANIMATING && (
          <View style={styles.centerContainer}>
            <View style={styles.keyRow}>
              {Object.entries(predictionStatus).map(([key, value], index) => (
                <AnimatedKey
                  key={key}
                  index={index}
                  active={value}
                  onComplete={handleKeyAnimationComplete}
                >
                  <Text style={styles.animatedKeyText}>
                    {key.charAt(0).toUpperCase()}
                  </Text>
                </AnimatedKey>
              ))}
            </View>
            <Text style={styles.subtitleText}>
              "{predictionRes?.originalText}"
            </Text>
          </View>
        )}
        {step === ProcessStep.ASKING_QUESTIONS && questions.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.questionText}>
              {questions[currentQuestionIndex]?.question}
            </Text>
            <QuestionInput
              question={questions[currentQuestionIndex]}
              answer={currentAnswer}
              setAnswer={setCurrentAnswer}
              onSubmit={onSubmitAnswer}
            />
          </View>
        )}
        {(step === ProcessStep.GENERATING_GOAL ||
          step === ProcessStep.CREATING_GOAL) && (
          <View style={styles.centerContainer}>
            <Text style={styles.titleText}>
              {step === ProcessStep.GENERATING_GOAL
                ? "Crafting your personalized goal..."
                : "Setting up your journey..."}
            </Text>
          </View>
        )}
        {step === ProcessStep.COMPLETED && (
          <View style={styles.centerContainer}>
            <Text style={styles.successText}>Your goal is ready!</Text>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6FA", // Soft, light background
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  gradientBackground: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 250,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    backgroundColor: "transparent",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  keyRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 30,
  },
  inputContainer: {
    marginVertical: 15,
    width: "100%",
    alignSelf: "center",
  },
  input: {
    backgroundColor: "white",
    color: "#333",
    padding: 15,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    fontSize: 16,
  },
  multiLineInput: {
    backgroundColor: "white",
    color: "#333",
    padding: 15,
    borderRadius: 15,
    minHeight: 120,
    textAlignVertical: "top",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 15,
    width: "100%",
  },
  buttonWrapper: {
    flex: 1,
    marginHorizontal: 10,
    borderRadius: 15,
    overflow: "hidden",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 25,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  titleText: {
    color: "#2C3E50",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },
  subtitleText: {
    color: "#7F8C8D",
    marginTop: 20,
    fontSize: 16,
    textAlign: "center",
    fontStyle: "italic",
  },
  questionText: {
    color: "#2C3E50",
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },
  successText: {
    color: "#27AE60",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  animatedKey: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 50,
    margin: 6,
    backgroundColor: "#BDC3C7",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  animatedKeyText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#BDC3C7",
    marginHorizontal: 5,
  },
  progressDotActive: {
    backgroundColor: "#3498DB",
    width: 14,
    height: 14,
    borderRadius: 7,
  },
});
