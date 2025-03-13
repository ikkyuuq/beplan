import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useUser } from "@clerk/clerk-expo";
import Animated, {
  interpolateColor,
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

const hasKey = "#34d399";
const noKey = "#f4335e";

// Define the steps in the process
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
    <Animated.View
      style={[
        {
          backgroundColor: "#a1a1aa",
          paddingHorizontal: 24,
          paddingVertical: 8,
          borderRadius: 999,
          margin: 4,
        },
        animatedStyle,
      ]}
    >
      {children}
    </Animated.View>
  );
};

export default function AiProcess() {
  const params = useLocalSearchParams();
  const textToProcess = params.textToProcess.toString().replaceAll('"', "");

  type Prediction = Record<string, any[]>;
  type PredictionResult = {
    originalText: string;
    prediction: Prediction;
  };
  const [predictionRes, setPredictionRes] = useState<PredictionResult>();
  const [predictionStatus, setPredictionStatus] = useState<
    Record<string, boolean>
  >({});

  const [loading, setLoading] = useState(false);
  const { user } = useUser();

  // New state to track the multi-step process
  const [step, setStep] = useState<ProcessStep>(ProcessStep.VALIDATING);

  // States for the question step
  type Question = {
    question: string;
    type: "yes-no" | "open-ended" | "date";
    key: string; // key to update the prediction result
  };
  type Questions = Question[];
  const [questions, setQuestions] = useState<Questions>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");

  // State for the generated goal
  type Task = {
    title: string;
    description: string;
    repeatType: "daily" | "weekly" | "monthly" | "date";
    weekInterval: number[];
    dateInterval: Date[];
  };

  type Goal = {
    title: string;
    type: string;
    start_date: Date;
    due_date: Date;
    tasks: Task[];
  };

  const [goal, setGoal] = useState<Goal>();

  // ---------------------------
  // Step 1: Validate the sentence
  // ---------------------------
  const validateSentence = async (sentence: string) => {
    try {
      setLoading(true);
      const response = await fetch("http://10.0.2.2:8000/api/v1/ai/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            original_text: textToProcess,
            prediction: formattedPrediction,
          }),
        },
      );
      const data = await response.json();
      console.log("Questions:", data);
      // assuming data is an array of questions with a "key" property for each missing key
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
      console.log("question:", question);
      console.log("answer:", answer);
      const response = await fetch(
        "http://10.0.2.2:8000/api/v1/ai/submit-question",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
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
      console.log("Question response:", data);
      const newFormattedPrediction = Object.entries(
        data.result.prediction,
      ).reduce(
        (acc, [key, value]) => {
          acc[key] = Array.isArray(value) ? value : [value];
          return acc;
        },
        {} as Record<string, any[]>,
      );
      // Update the prediction result with new data from the backend
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
        predictionRes?.prediction,
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
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            original_text: textToProcess,
            prediction: formattedPrediction,
          }),
        },
      );
      const data = await response.json();
      console.log("Goal:", data);
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          goal,
        }),
      });
      const data = await response.json();
      console.log("Response:", data);

      if (response.ok) {
        console.log("Goal created successfully");
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
    // initial validation
    validateSentence(textToProcess);
  }, [textToProcess]);

  useEffect(() => {
    // after validation, set prediction status and start animation step
    if (predictionRes) {
      handlePrediction();
      setStep(ProcessStep.ANIMATING);
    }
  }, [predictionRes]);

  // When key animations are complete, move to questions if there are missing keys
  // (Here we assume that onComplete callback from AnimatedKey will trigger this check.)
  const [animationCompleteCount, setAnimationCompleteCount] = useState(0);
  const totalKeys = Object.keys(predictionStatus).length;

  const handleKeyAnimationComplete = () => {
    setAnimationCompleteCount((prev) => prev + 1);
  };

  useEffect(() => {
    if (animationCompleteCount === totalKeys && totalKeys > 0) {
      // if there are missing keys then fetch questions; otherwise, move on
      const missing = Object.values(predictionStatus).some((v) => v === false);
      if (missing) {
        fetchQuestionsForMissingKeys().then(() => {
          setStep(ProcessStep.ASKING_QUESTIONS);
        });
      } else {
        // if no missing keys, go directly to goal generation
        setStep(ProcessStep.GENERATING_GOAL);
      }
    }
  }, [animationCompleteCount, totalKeys, predictionStatus]);

  // When questions are answered, generate a goal
  useEffect(() => {
    if (
      step === ProcessStep.ASKING_QUESTIONS &&
      currentQuestionIndex >= questions.length &&
      questions.length > 0
    ) {
      setStep(ProcessStep.GENERATING_GOAL);
    }
  }, [currentQuestionIndex, questions, step]);

  // When in generating goal step, fetch the goal and move to creation step
  useEffect(() => {
    if (step === ProcessStep.GENERATING_GOAL) {
      generateGoal().then(() => {
        setStep(ProcessStep.CREATING_GOAL);
      });
    }
  }, [step]);

  // When in creating goal step, call handleCreateGoal
  useEffect(() => {
    if (step === ProcessStep.CREATING_GOAL) {
      // You can add an animation indicator here before creating the goal
      handleCreateGoal();
    }
  }, [step]);

  useEffect(() => {
    console.log("Prediction:", predictionRes);
    console.log("Current step:", step);
  }, [step]);

  // ---------------------------
  // Handlers for question answer submission
  // ---------------------------
  const onSubmitAnswer = async () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion || currentAnswer.trim() === "") return;
    await handleSubmitQuestion(currentQuestion, currentAnswer);
    setCurrentAnswer(""); // clear the answer
    setCurrentQuestionIndex((prev) => prev + 1);
  };

  // ---------------------------
  // Render different UI based on current step
  // ---------------------------
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#16171F", padding: 16 }}
    >
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        {loading && <ActivityIndicator size="large" color="#fff" />}
        {step === ProcessStep.VALIDATING && (
          <Text style={{ color: "white", fontSize: 18, marginBottom: 16 }}>
            Validating...
          </Text>
        )}
        {step === ProcessStep.ANIMATING && (
          <View style={{ alignItems: "center" }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {Object.entries(predictionStatus).map(([key, value], index) => (
                <AnimatedKey
                  key={key}
                  index={index}
                  active={value}
                  onComplete={handleKeyAnimationComplete}
                >
                  <Text
                    style={{ color: "white", fontSize: 12, fontWeight: "bold" }}
                  >
                    {key.charAt(0).toUpperCase()}
                  </Text>
                </AnimatedKey>
              ))}
            </View>
            <Text style={{ color: "white", marginTop: 16, fontSize: 16 }}>
              {predictionRes?.originalText}
            </Text>
          </View>
        )}
        {step === ProcessStep.ASKING_QUESTIONS && questions.length > 0 && (
          <View style={{ width: "100%", marginTop: 24 }}>
            <Text style={{ color: "white", fontSize: 18, marginBottom: 12 }}>
              {questions[currentQuestionIndex]?.question}
            </Text>
            <TextInput
              value={currentAnswer}
              onChangeText={setCurrentAnswer}
              placeholder="Type your answer here..."
              placeholderTextColor="#aaa"
              style={{
                borderWidth: 1,
                borderColor: "#fff",
                color: "white",
                padding: 8,
                marginBottom: 12,
                borderRadius: 4,
              }}
            />
            <Button title="Submit Answer" onPress={onSubmitAnswer} />
          </View>
        )}
        {(step === ProcessStep.GENERATING_GOAL ||
          step === ProcessStep.CREATING_GOAL) && (
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: "white", fontSize: 18, marginBottom: 12 }}>
              {step === ProcessStep.GENERATING_GOAL
                ? "Generating goal..."
                : "Creating goal..."}
            </Text>
            {/* You can add additional animations/indicators here */}
          </View>
        )}
        {step === ProcessStep.COMPLETED && (
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: "white", fontSize: 20, fontWeight: "bold" }}>
              Goal created successfully!
            </Text>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
