import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { API_BASE_URL } from "@/constants/api";
import { useApiFetch } from "@/hooks/useApiFetch";
import { Alert } from "@/utils/alert";
import { useScreenTopPadding } from "@/constants/layout";

// ====================== Types ======================
// One row of GET /api/v1/goal/all
type GoalSummary = {
  id: number;
  title: string;
  type: string;
  status: "pending" | "success" | "failed";
  start_date: string; // yyyy-MM-dd
  due_date: string;
  total_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  pending_tasks: number;
};

type Section = { key: string; title: string; goals: GoalSummary[] };

// One row of GET /api/v1/drafts (the editor's own format).
type Draft = {
  id: number;
  title: string;
  start_date: string | null;
  due_date: string | null;
  tasks: unknown[];
};

const STATUS_STYLE: Record<GoalSummary["status"], { label: string; color: string }> = {
  pending: { label: "In progress", color: "#4E5A94" },
  success: { label: "Completed", color: "#2E9E5B" },
  failed: { label: "Failed", color: "#D64545" },
};

// Group goals for display: what's running now first, then what's next,
// then finished ones.
const groupGoals = (goals: GoalSummary[], today: string): Section[] => {
  const inProgress = goals.filter((g) => g.status === "pending" && g.start_date <= today);
  const upcoming = goals
    .filter((g) => g.status === "pending" && g.start_date > today)
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
  const completed = goals.filter((g) => g.status === "success");
  const failed = goals.filter((g) => g.status === "failed");
  return [
    { key: "progress", title: "In progress", goals: inProgress },
    { key: "upcoming", title: "Upcoming", goals: upcoming },
    { key: "completed", title: "Completed", goals: completed },
    { key: "failed", title: "Failed", goals: failed },
  ].filter((section) => section.goals.length > 0);
};

const formatRange = (start: string, due: string) => {
  const s = parseISO(start);
  const d = parseISO(due);
  return s.getFullYear() === d.getFullYear()
    ? `${format(s, "MMM d")} – ${format(d, "MMM d, yyyy")}`
    : `${format(s, "MMM d, yyyy")} – ${format(d, "MMM d, yyyy")}`;
};

// ====================== Goal card ======================
function GoalCard({ goal, onPress }: { goal: GoalSummary; onPress: () => void }) {
  const status = STATUS_STYLE[goal.status] ?? STATUS_STYLE.pending;
  const progress = goal.total_tasks > 0 ? goal.completed_tasks / goal.total_tasks : 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${goal.title}, ${status.label}, ${goal.completed_tasks} of ${goal.total_tasks} tasks done`}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.goalTitle} numberOfLines={2}>
          {goal.title}
        </Text>
        <View style={[styles.badge, { borderColor: status.color }]}>
          <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <Text style={styles.meta}>
        {goal.type} · {formatRange(goal.start_date, goal.due_date)}
      </Text>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.round(progress * 100)}%`, backgroundColor: status.color },
          ]}
        />
      </View>

      <Text style={styles.counts}>
        {goal.completed_tasks} of {goal.total_tasks} done · {goal.failed_tasks} missed ·{" "}
        {goal.pending_tasks} left
      </Text>
    </Pressable>
  );
}

// ====================== Draft card ======================
function DraftCard({
  draft,
  onOpen,
  onStart,
  onDelete,
}: {
  draft: Draft;
  onOpen: () => void;
  onStart: () => void;
  onDelete: () => void;
}) {
  const planned =
    draft.start_date && draft.due_date
      ? formatRange(draft.start_date, draft.due_date)
      : "No dates yet";
  const taskCount = `${draft.tasks.length} task${draft.tasks.length === 1 ? "" : "s"}`;

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`Draft ${draft.title || "Untitled"}, ${planned}, ${taskCount}`}
      style={({ pressed }) => [styles.card, styles.draftCard, pressed && styles.cardPressed]}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.goalTitle} numberOfLines={2}>
          {draft.title.trim() || "Untitled draft"}
        </Text>
        <View style={[styles.badge, { borderColor: "#8D8D99" }]}>
          <Text style={[styles.badgeText, { color: "#8D8D99" }]}>Draft</Text>
        </View>
      </View>
      <Text style={styles.meta}>
        Planned {planned} · {taskCount}
      </Text>
      <View style={styles.draftActions}>
        <Pressable onPress={onDelete} hitSlop={8} accessibilityRole="button" style={styles.draftDelete}>
          <Text style={styles.draftDeleteText}>Delete</Text>
        </Pressable>
        <Pressable onPress={onStart} hitSlop={8} accessibilityRole="button" style={styles.draftStart}>
          <Text style={styles.draftStartText}>Start</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

// ====================== Screen ======================
export default function AllGoalAllTask() {
  // Keep the Back button clear of the notch / Dynamic Island.
  const topPadding = useScreenTopPadding(8);
  const apiFetch = useApiFetch();
  const router = useRouter();
  const [goals, setGoals] = useState<GoalSummary[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGoals = useCallback(async () => {
    setError(null);
    try {
      const [response, draftsResponse] = await Promise.all([
        apiFetch(`${API_BASE_URL}/api/v1/goal/all`),
        apiFetch(`${API_BASE_URL}/api/v1/drafts`).catch(() => null),
      ]);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setGoals(await response.json());
      // Drafts are optional: if they can't load, still show the goals.
      if (draftsResponse?.ok) {
        setDrafts(await draftsResponse.json());
      } else {
        console.warn("Couldn't load drafts:", draftsResponse?.status);
        setDrafts([]);
      }
    } catch (err) {
      console.error("Failed to load goals:", err);
      setError("Couldn't load your goals. Pull down to try again.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [apiFetch]);

  // Reload whenever the screen is shown (e.g. after editing a goal).
  useFocusEffect(
    useCallback(() => {
      void loadGoals();
    }, [loadGoals])
  );

  // Open a goal in the editor, the same way the schedule's "Customize" does.
  const openGoal = async (goal: GoalSummary) => {
    if (isOpening) return;
    setIsOpening(true);
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/v1/goal/${goal.id}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const { goal: goalData } = await response.json();
      router.push({
        pathname: "/(other)/customGoal",
        params: { initialGoalData: JSON.stringify(goalData), assignedGoalId: goal.id },
      });
    } catch (err) {
      console.error("Failed to open goal:", err);
      setError("Couldn't open that goal. Please try again.");
    } finally {
      setIsOpening(false);
    }
  };

  const openDraft = (draft: Draft) => {
    router.push({
      pathname: "/(other)/customGoal",
      params: { draftId: draft.id, initialDraft: JSON.stringify(draft) },
    });
  };

  const startDraft = (draft: Draft) => {
    Alert.alert(
      "Start this goal?",
      "It goes on your schedule and becomes limited to title and description edits. If its planned start has passed, it starts today and keeps the same length.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start",
          onPress: async () => {
            try {
              const response = await apiFetch(
                `${API_BASE_URL}/api/v1/drafts/${draft.id}/start`,
                { method: "POST" }
              );
              if (!response.ok) {
                const body = await response.json().catch(() => null);
                throw new Error(body?.detail || `HTTP ${response.status}`);
              }
              void loadGoals();
            } catch (err: any) {
              // e.g. "Add at least one task before starting." -> open it to finish
              Alert.alert("Can't start yet", err?.message || "Please try again.");
            }
          },
        },
      ]
    );
  };

  const deleteDraft = (draft: Draft) => {
    Alert.alert("Delete this draft?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const response = await apiFetch(`${API_BASE_URL}/api/v1/drafts/${draft.id}`, {
            method: "DELETE",
          });
          if (!response.ok) Alert.alert("Couldn't delete the draft", "Please try again.");
          void loadGoals();
        },
      },
    ]);
  };

  const sections = groupGoals(goals, format(new Date(), "yyyy-MM-dd"));

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#4E5A94" />
        <Text style={styles.backButtonText}>Back to Schedule</Text>
      </TouchableOpacity>

      <Text style={styles.title}>All goals</Text>

      {isLoading ? (
        <ActivityIndicator size="large" color="#4E5A94" style={styles.loader} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                setIsRefreshing(true);
                void loadGoals();
              }}
            />
          }
        >
          {!!error && <Text style={styles.errorText}>{error}</Text>}

          {drafts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Drafts ({drafts.length})</Text>
              {drafts.map((draft) => (
                <DraftCard
                  key={`draft-${draft.id}`}
                  draft={draft}
                  onOpen={() => openDraft(draft)}
                  onStart={() => startDraft(draft)}
                  onDelete={() => deleteDraft(draft)}
                />
              ))}
            </View>
          )}

          {!error && sections.length === 0 && drafts.length === 0 && (
            <Text style={styles.emptyText}>
              No goals yet. Create one from the Create tab.
            </Text>
          )}

          {sections.map((section) => (
            <View key={section.key} style={styles.section}>
              <Text style={styles.sectionTitle}>
                {section.title} ({section.goals.length})
              </Text>
              {section.goals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} onPress={() => openGoal(goal)} />
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      {isOpening && (
        <View style={styles.openingOverlay}>
          <ActivityIndicator size="large" color="#4E5A94" />
        </View>
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
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: "#4E5A94",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#16171F",
    marginBottom: 8,
  },
  loader: {
    marginTop: 40,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    marginTop: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  card: {
    padding: 16,
    backgroundColor: "#F5F5F7",
    borderRadius: 12,
    gap: 8,
  },
  cardPressed: {
    opacity: 0.7,
  },
  draftCard: {
    backgroundColor: "#FAFAFC",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#C9CAD6",
  },
  draftActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 4,
  },
  draftDelete: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  draftDeleteText: {
    color: "#D64545",
    fontSize: 14,
    fontWeight: "600",
  },
  draftStart: {
    backgroundColor: "#4E5A94",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  draftStartText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  goalTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    color: "#16171F",
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  meta: {
    fontSize: 13,
    color: "#666",
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E2E3EA",
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  counts: {
    fontSize: 13,
    color: "#444",
  },
  errorText: {
    color: "#D64545",
    textAlign: "center",
    marginTop: 20,
  },
  emptyText: {
    color: "#666",
    textAlign: "center",
    marginTop: 40,
  },
  openingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
  },
});
