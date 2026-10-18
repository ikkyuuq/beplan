import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
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
  ScrollView,
} from "react-native";
import { addDays, format, parseISO } from "date-fns";
import { useUser } from "@clerk/expo";
import { API_BASE_URL } from "@/constants/api";
import { useApiFetch } from "@/hooks/useApiFetch";
import { useScreenTopPadding } from "@/constants/layout";
import Animated, {
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import DateTimePicker from "@react-native-community/datetimepicker";
import i18n, { currentLanguage, dateLocale, useTranslation } from "@/i18n";
import type en from "@/i18n/locales/en";

// Component: Date Picker for date-type questions
const DatePickerComponent = ({
  answer,
  setAnswer,
  onSubmit,
}: {
  answer: string;
  setAnswer: (text: string) => void;
  onSubmit: (answer?: string) => void;
}) => {
  const { t } = useTranslation();
  const tomorrow = addDays(new Date(), 1);
  const [showPicker, setShowPicker] = useState(false);
  const [date, setDate] = useState(tomorrow);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowPicker(false);
    if (selectedDate) {
      setDate(selectedDate);
      // Local calendar day; toISOString() would shift it to UTC.
      setAnswer(format(selectedDate, "yyyy-MM-dd"));
    }
  };

  return (
    <View style={styles.inputContainer}>
      <TextInput
        value={answer}
        placeholder={t("ai.datePlaceholder")}
        placeholderTextColor="#aaa"
        style={styles.input}
        onFocus={() => setShowPicker(true)}
      />
      {showPicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          minimumDate={tomorrow}
          onChange={handleDateChange}
        />
      )}
      <Button title={t("ai.submitAnswer")} onPress={() => onSubmit()} />
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
  onSubmit: (answer?: string) => void;
}) => {
  const { t } = useTranslation();
  if (question?.type === "open-ended") {
    return (
      <View style={styles.inputContainer}>
        <TextInput
          value={answer}
          onChangeText={setAnswer}
          placeholder={t("ai.answerPlaceholder")}
          placeholderTextColor="#aaa"
          style={styles.multiLineInput}
          multiline
          numberOfLines={3}
        />
        <Button title={t("ai.submitAnswer")} onPress={() => onSubmit()} />
      </View>
    );
  } else if (question?.type === "yes-no") {
    return (
      <View style={styles.buttonRow}>
        <View style={styles.buttonWrapper}>
          <Button
            title={t("common.yes")}
            onPress={() => onSubmit(t("common.yes"))}
            color="#34d399"
          />
        </View>
        <View style={styles.buttonWrapper}>
          <Button
            title={t("common.no")}
            onPress={() => onSubmit(t("common.no"))}
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
  REVIEWING = "reviewing",
  CREATING_GOAL = "creating_goal",
  COMPLETED = "completed",
  FAILED = "failed",
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

function formatDay(isoDate: string) {
  return format(parseISO(String(isoDate)), "d MMM yyyy", { locale: dateLocale() });
}

function describeRepeat(task: Task) {
  switch (task.repeat_type) {
    case "daily":
      return i18n.t("ai.everyDay");
    case "weekly": {
      const weekdays = i18n.t("common.weekdaysShort").split(",");
      const days = (task.week_interval ?? []).map((d) => weekdays[d]).join(", ");
      return i18n.t("ai.everyWeekdays", { days });
    }
    default: {
      const dates = (task.date_interval ?? []).map((d) => formatDay(String(d)));
      return dates.length > 3
        ? i18n.t("ai.moreDates", { dates: dates.slice(0, 3).join(", "), count: dates.length - 3 })
        : dates.join(", ");
    }
  }
}

// Prefer the server's own message (e.g. "AI service is busy...") over a bare
// status. AI errors carry an X-Error-Code the app translates.
async function requestError(response: Response): Promise<Error> {
  const code = response.headers.get("X-Error-Code");
  if (code && i18n.exists(`ai.errors.${code}`)) {
    return new Error(i18n.t(`ai.errors.${code}` as "ai.errors.generic"));
  }
  try {
    const body = await response.json();
    if (typeof body?.detail === "string" && body.detail) {
      // Untranslated server text: only shown as-is to English readers.
      return new Error(currentLanguage() === "en" ? body.detail : i18n.t("ai.errors.generic"));
    }
  } catch {
    // Not JSON; fall through to the status code.
  }
  return new Error(i18n.t("ai.requestFailed", { status: response.status }));
}

type FailedStep = keyof typeof en.ai.steps;

export default function AiProcess() {
  const { t } = useTranslation();
  const topPadding = useScreenTopPadding(16);
  const params = useLocalSearchParams();
  const initialText =
    typeof params.textToProcess === "string"
      ? params.textToProcess.replaceAll('"', "").trim()
      : "";
  const [textInput, setTextInput] = useState(initialText);
  const [textToProcess, setTextToProcess] = useState(initialText);

  const [predictionRes, setPredictionRes] = useState<PredictionResult>();
  const [predictionStatus, setPredictionStatus] = useState<
    Record<string, boolean>
  >({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { user } = useUser();
  const apiFetch = useApiFetch();

  // Process step state
  const [step, setStep] = useState<ProcessStep>(ProcessStep.VALIDATING);

  // States for the question step
  type Question = {
    question: string;
    type: "yes-no" | "open-ended" | "date";
    label: string; // prediction criterion to update
  };
  type Questions = Question[];
  const [questions, setQuestions] = useState<Questions>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");

  const [goal, setGoal] = useState<Goal | null>(null);

  const markFailed = (action: FailedStep, error: unknown) => {
    console.error(`${action} failed:`, error);
    const message = error instanceof Error ? error.message : t("ai.tryAgain");
    setErrorMessage(t("ai.stepFailed", { step: t(`ai.steps.${action}`), message }));
    setStep(ProcessStep.FAILED);
  };

  // ---------------------------
  // Step 1: Validate the sentence
  // ---------------------------
  const validateSentence = async (sentence: string): Promise<boolean> => {
    try {
      setLoading(true);
      const response = await apiFetch(`${API_BASE_URL}/api/v1/ai/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sentence }),
      });
      if (!response.ok) throw await requestError(response);
      const data = await response.json();
      setPredictionRes({
        originalText: textToProcess,
        prediction: data.prediction,
      });
      return true;
    } catch (error) {
      markFailed("validation", error);
      return false;
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
  const fetchQuestionsForMissingKeys = async (): Promise<number | null> => {
    if (!predictionRes) return null;

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

      const response = await apiFetch(
        `${API_BASE_URL}/api/v1/ai/generate-questions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            original_text: textToProcess,
            prediction: formattedPrediction,
          }),
        },
      );
      if (!response.ok) throw await requestError(response);
      const data = await response.json();
      const result: Questions = Array.isArray(data.result) ? data.result : [];
      setQuestions(result);
      return result.length;
    } catch (error) {
      markFailed("questions", error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------
  // Submit a single question answer
  // ---------------------------
  const handleSubmitQuestion = async (
    question: Question,
    answer: string,
  ): Promise<boolean> => {
    if (!predictionRes) return false;
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
      const response = await apiFetch(
        `${API_BASE_URL}/api/v1/ai/submit-question`,
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
      if (!response.ok) throw await requestError(response);
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
      return true;
    } catch (error) {
      markFailed("answer", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------
  // Generate a goal based on updated prediction
  // ---------------------------
  const generateGoal = async (): Promise<boolean> => {
    if (!predictionRes) return false;

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
      const response = await apiFetch(
        `${API_BASE_URL}/api/v1/ai/generate-goal`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            original_text: textToProcess,
            prediction: formattedPrediction,
          }),
        },
      );
      if (!response.ok) throw await requestError(response);
      const data = await response.json();
      setGoal(data);
      return true;
    } catch (error) {
      markFailed("goal", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------
  // Create the goal in the backend
  // ---------------------------
  const handleCreateGoal = async (): Promise<boolean> => {
    if (!goal || !user) {
      markFailed("create", new Error(t("ai.goalOrUserMissing")));
      return false;
    }
    try {
      setLoading(true);
      const response = await apiFetch(`${API_BASE_URL}/api/v1/ai/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, goal }),
      });
      if (!response.ok) throw await requestError(response);
      const data = await response.json();
      console.log("Response:", data);
      console.log("Goal created successfully");
      // dismissTo closes the AI flow; push would stack a second copy of the tabs.
      router.dismissTo("/(tabs)/schedule");
      return true;
    } catch (error) {
      markFailed("create", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------
  // useEffects to manage the flow
  // ---------------------------
  useEffect(() => {
    if (!textToProcess) return;
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
        fetchQuestionsForMissingKeys().then((count) => {
          if (count === null) return;
          // Nothing to ask (shouldn't happen, the server fills gaps): don't stall here.
          setStep(count > 0 ? ProcessStep.ASKING_QUESTIONS : ProcessStep.GENERATING_GOAL);
        });
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
      generateGoal().then((succeeded) => {
        if (succeeded) setStep(ProcessStep.REVIEWING);
      });
    }
  }, [step]);

  useEffect(() => {
    if (step === ProcessStep.CREATING_GOAL) {
      // You can add an animation indicator here before creating the goal
      handleCreateGoal().then((succeeded) => {
        if (succeeded) setStep(ProcessStep.COMPLETED);
      });
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
  const onSubmitAnswer = async (answerOverride?: string) => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion || loading) return;

    // Yes/No buttons pass their answer directly.
    const answerToSubmit = (answerOverride ?? currentAnswer).trim();
    if (answerToSubmit === "") return;

    const succeeded = await handleSubmitQuestion(
      currentQuestion,
      answerToSubmit,
    );
    if (!succeeded) return;
    setCurrentAnswer("");
    setCurrentQuestionIndex((prev) => prev + 1);
  };

  // ---------------------------
  // Render UI based on current process step
  // ---------------------------
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { paddingTop: topPadding }]}
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
          ProcessStep.REVIEWING,
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
        {step === ProcessStep.VALIDATING &&
          (textToProcess ? (
            <Text style={styles.titleText}>{t("ai.analyzing")}</Text>
          ) : (
            <View style={styles.inputCard}>
              <Text style={styles.titleText}>{t("ai.whatToAchieve")}</Text>
              <Text style={styles.inputHint}>
                {t("ai.inputHint")}
              </Text>
              <TextInput
                value={textInput}
                onChangeText={setTextInput}
                placeholder={t("ai.inputPlaceholder")}
                placeholderTextColor="#98A2B3"
                style={styles.goalInput}
                multiline
                maxLength={240}
              />
              <Button
                title={t("ai.buildPlan")}
                onPress={() => {
                  const trimmedText = textInput.trim();
                  if (trimmedText) setTextToProcess(trimmedText);
                }}
                disabled={!textInput.trim()}
                color="#5B43D6"
              />
            </View>
          ))}
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
                ? t("ai.crafting")
                : t("ai.settingUp")}
            </Text>
          </View>
        )}
        {step === ProcessStep.REVIEWING && !!goal && (
          <View style={[styles.card, styles.reviewCard]}>
            <Text style={styles.reviewTitle}>{goal.title}</Text>
            <Text style={styles.reviewDates}>
              {formatDay(goal.start_date)} – {formatDay(goal.due_date)}
            </Text>
            <ScrollView style={styles.reviewTasks}>
              {goal.tasks.map((task, index) => (
                <View key={`${task.title}-${index}`} style={styles.reviewTask}>
                  <Text style={styles.reviewTaskTitle}>{task.title}</Text>
                  {!!task.description && (
                    <Text style={styles.reviewTaskDescription}>{task.description}</Text>
                  )}
                  <Text style={styles.reviewTaskRepeat}>{describeRepeat(task)}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.reviewActions}>
              <Button
                title={t("ai.createGoal")}
                color="#5B43D6"
                onPress={() => setStep(ProcessStep.CREATING_GOAL)}
              />
              <View style={styles.buttonRow}>
                <View style={styles.buttonWrapper}>
                  <Button
                    title={t("ai.tryAnotherPlan")}
                    onPress={() => setStep(ProcessStep.GENERATING_GOAL)}
                  />
                </View>
                <View style={styles.buttonWrapper}>
                  <Button title={t("common.cancel")} color="#667085" onPress={() => router.back()} />
                </View>
              </View>
            </View>
          </View>
        )}
        {step === ProcessStep.COMPLETED && (
          <View style={styles.centerContainer}>
            <Text style={styles.successText}>{t("ai.ready")}</Text>
          </View>
        )}
        {step === ProcessStep.FAILED && (
          <View style={{ alignItems: "center" }}>
            <Text
              accessibilityRole="alert"
              style={{
                color: "#f87171",
                fontSize: 18,
                textAlign: "center",
              }}
            >
              {errorMessage || t("ai.processFailed")}
            </Text>
            <View style={{ marginTop: 16 }}>
              <Button title={t("ai.goBack")} onPress={() => router.back()} />
            </View>
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
  inputCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  inputHint: {
    color: "#667085",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 18,
  },
  goalInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 12,
    padding: 14,
    color: "#101828",
    fontSize: 16,
    textAlignVertical: "top",
    marginBottom: 16,
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
  reviewCard: {
    flex: 1,
    maxHeight: "92%",
    padding: 20,
  },
  reviewTitle: {
    color: "#2C3E50",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  reviewDates: {
    color: "#667085",
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 14,
  },
  reviewTasks: {
    flex: 1,
  },
  reviewTask: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#D0D5DD",
  },
  reviewTaskTitle: {
    color: "#101828",
    fontSize: 16,
    fontWeight: "600",
  },
  reviewTaskDescription: {
    color: "#475467",
    fontSize: 14,
    marginTop: 2,
  },
  reviewTaskRepeat: {
    color: "#5B43D6",
    fontSize: 13,
    marginTop: 4,
  },
  reviewActions: {
    marginTop: 14,
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
