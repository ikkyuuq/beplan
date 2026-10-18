import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useFocusEffect } from "expo-router";
import Header, { HEADER_RADIUS } from "@/components/Header";
import { useTabBarSpace } from "@/constants/layout";
import { MOTION } from "@/constants/motion";
import { API_BASE_URL } from "@/constants/api";
import { useApiFetch } from "@/hooks/useApiFetch";
import { useTranslation } from "@/i18n";

// ====================== Type Definitions ======================
type Period = "7d" | "14d" | "month";

type StatusCounts = {
  success: number;
  failed: number;
  pending: number;
};

type AnalyticsData = {
  period: Period;
  start: string;
  end: string;
  summary: {
    success: number;
    failed: number;
    pending_today: number;
    // null when no task in the period is finished yet.
    success_rate: number | null;
    previous_success_rate: number | null;
  };
  streak: number;
  daily: (StatusCounts & { date: string })[];
  goals: (StatusCounts & {
    id: number;
    title: string;
    success_rate: number | null;
  })[];
};

const PERIODS: { value: Period; labelKey: "analysis.period7d" | "analysis.period14d" | "analysis.periodMonth" }[] = [
  { value: "7d", labelKey: "analysis.period7d" },
  { value: "14d", labelKey: "analysis.period14d" },
  { value: "month", labelKey: "analysis.periodMonth" },
];

const COLORS = {
  primary: "#4E5A94",
  success: "#4CAF50",
  failed: "#F44336",
  pending: "#E3E5EE",
};

const DAILY_CHART_HEIGHT = 120;

// API dates are calendar dates ("2026-10-18"); build them from local parts so
// the weekday doesn't shift in UTC-offset time zones.
function parseCalendarDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatRate(rate: number | null): string {
  return rate === null ? "–" : `${Math.round(rate)}%`;
}

// ====================== Main Component ======================
export default function Analysis() {
  const tabBarSpace = useTabBarSpace();
  const apiFetch = useApiFetch();
  const { t } = useTranslation();
  const weekdays = t("common.weekdaysShort").split(",");

  const [period, setPeriod] = useState<Period>("7d");
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Only the latest request may update the screen (fast period switching).
  const requestId = useRef(0);

  // ====================== Data Fetching ======================
  const fetchAnalyticsData = useCallback(
    async (selected: Period) => {
      const id = ++requestId.current;
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiFetch(
          `${API_BASE_URL}/api/v1/analysis/?period=${selected}`
        );
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const data: AnalyticsData = await response.json();
        if (id === requestId.current) setAnalyticsData(data);
      } catch (err) {
        console.error("Failed to fetch analytics data:", err);
        if (id === requestId.current) setError(t("analysis.loadFailed"));
      } finally {
        if (id === requestId.current) {
          setIsLoading(false);
          setRefreshing(false);
        }
      }
    },
    [apiFetch, t]
  );

  // Reload on focus too, so tasks marked on Home show up here.
  useFocusEffect(
    useCallback(() => {
      void fetchAnalyticsData(period);
    }, [fetchAnalyticsData, period])
  );

  const onRefresh = () => {
    setRefreshing(true);
    void fetchAnalyticsData(period);
  };

  // ====================== Derived Values ======================
  const summary = analyticsData?.summary;
  const finished = summary ? summary.success + summary.failed : 0;

  const deltaText = (() => {
    if (summary?.success_rate == null || summary.previous_success_rate == null) {
      return null;
    }
    const delta = Math.round(summary.success_rate - summary.previous_success_rate);
    if (delta > 0) return { text: t("analysis.deltaUp", { delta }), color: COLORS.success };
    if (delta < 0) return { text: t("analysis.deltaDown", { delta: -delta }), color: COLORS.failed };
    return { text: t("analysis.deltaSame"), color: "#777" };
  })();

  const dailyMax = Math.max(
    1,
    ...(analyticsData?.daily ?? []).map((d) => d.success + d.failed + d.pending)
  );
  const hasDailyTasks = (analyticsData?.daily ?? []).some(
    (d) => d.success + d.failed + d.pending > 0
  );

  const dayLabel = (value: string, index: number) => {
    const day = parseCalendarDate(value);
    if (analyticsData?.period === "7d") return weekdays[day.getDay()];
    if (analyticsData?.period === "14d") return String(day.getDate());
    // Month: label the 1st and every 5th day so ~31 bars stay readable.
    const date = day.getDate();
    return index === 0 || date % 5 === 0 ? String(date) : "";
  };

  // ====================== Render Helpers ======================
  const renderBody = () => {
    if (!analyticsData) {
      if (error) {
        return (
          <View style={styles.centerState}>
            <Ionicons name="alert-circle-outline" size={50} color={COLORS.failed} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => fetchAnalyticsData(period)}
            >
              <Text style={styles.retryButtonText}>{t("analysis.retry")}</Text>
            </Pressable>
          </View>
        );
      }
      return (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t("analysis.loading")}</Text>
        </View>
      );
    }

    return (
      <>
        {/* Success rate */}
        <Animated.View
          entering={FadeInDown.duration(MOTION.base.duration)}
          style={styles.card}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroRate}>
              <Text style={styles.cardLabel}>{t("analysis.successRate")}</Text>
              <Text style={styles.heroValue}>{formatRate(summary!.success_rate)}</Text>
            </View>
            {analyticsData.streak > 0 ? (
              <View style={styles.streakChip}>
                <Ionicons name="flame" size={16} color="#FF8A00" />
                <Text style={styles.streakText}>
                  {t("analysis.streak", { count: analyticsData.streak })}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.rateTrack}>
            <View
              style={[
                styles.rateFill,
                { width: `${summary!.success_rate ?? 0}%` },
              ]}
            />
          </View>
          <Text style={styles.heroDetail}>
            {finished > 0
              ? t("analysis.rateDetail", { success: summary!.success, finished })
              : t("analysis.noFinished")}
          </Text>
          {deltaText ? (
            <Text style={[styles.deltaText, { color: deltaText.color }]}>
              {deltaText.text}
            </Text>
          ) : null}
        </Animated.View>

        {/* Counts */}
        <Animated.View
          entering={FadeInDown.duration(MOTION.base.duration).delay(60)}
          style={styles.statRow}
        >
          {[
            { label: t("analysis.success"), value: summary!.success, icon: "checkmark" as const, color: COLORS.success },
            { label: t("analysis.failed"), value: summary!.failed, icon: "close" as const, color: COLORS.failed },
            { label: t("analysis.leftToday"), value: summary!.pending_today, icon: "time-outline" as const, color: COLORS.primary },
          ].map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: stat.color }]}>
                <Ionicons name={stat.icon} size={14} color="#fff" />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel} numberOfLines={1}>
                {stat.label}
              </Text>
            </View>
          ))}
        </Animated.View>

        {/* Daily results */}
        <Animated.View
          entering={FadeInDown.duration(MOTION.base.duration).delay(120)}
          style={styles.card}
        >
          <Text style={styles.cardTitle}>{t("analysis.daily")}</Text>
          {hasDailyTasks ? (
            <>
              <View style={styles.dailyChart}>
                {analyticsData.daily.map((day, index) => {
                  const scale = DAILY_CHART_HEIGHT / dailyMax;
                  return (
                    <View key={day.date} style={styles.dailyColumn}>
                      <View style={styles.dailyBarArea}>
                        {day.success + day.failed + day.pending > 0 ? (
                          <View style={styles.dailyBar}>
                            <View style={{ height: day.pending * scale, backgroundColor: COLORS.pending }} />
                            <View style={{ height: day.failed * scale, backgroundColor: COLORS.failed }} />
                            <View style={{ height: day.success * scale, backgroundColor: COLORS.success }} />
                          </View>
                        ) : (
                          // Keeps empty days visible on the axis.
                          <View style={[styles.dailyBar, styles.dailyBarEmpty]} />
                        )}
                      </View>
                      <Text style={styles.dailyLabel} numberOfLines={1}>
                        {dayLabel(day.date, index)}
                      </Text>
                    </View>
                  );
                })}
              </View>
              <View style={styles.legend}>
                {[
                  { label: t("analysis.success"), color: COLORS.success },
                  { label: t("analysis.failed"), color: COLORS.failed },
                  { label: t("analysis.leftToday"), color: COLORS.pending },
                ].map((item) => (
                  <View key={item.label} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={styles.legendText}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={36} color="#CCC" />
              <Text style={styles.emptyText}>{t("analysis.noTasks")}</Text>
            </View>
          )}
        </Animated.View>

        {/* Per-goal breakdown */}
        <Animated.View
          entering={FadeInDown.duration(MOTION.base.duration).delay(180)}
          style={styles.card}
        >
          <Text style={styles.cardTitle}>{t("analysis.goals")}</Text>
          {analyticsData.goals.length > 0 ? (
            <View style={styles.goalList}>
              {analyticsData.goals.map((goal) => {
                const goalFinished = goal.success + goal.failed;
                return (
                  <View key={goal.id} style={styles.goalItem}>
                    <View style={styles.goalHeader}>
                      <Text style={styles.goalTitle} numberOfLines={1}>
                        {goal.title}
                      </Text>
                      <Text style={styles.goalRate}>{formatRate(goal.success_rate)}</Text>
                    </View>
                    <View style={styles.rateTrack}>
                      <View
                        style={[
                          styles.rateFill,
                          { width: `${goal.success_rate ?? 0}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.goalDetail}>
                      {`${goal.success}/${goalFinished}`}
                      {goal.pending > 0
                        ? ` · ${t("analysis.left", { count: goal.pending })}`
                        : ""}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="flag-outline" size={36} color="#CCC" />
              <Text style={styles.emptyText}>{t("analysis.noGoals")}</Text>
            </View>
          )}
        </Animated.View>
      </>
    );
  };

  // ====================== Render UI ======================
  return (
    <View style={styles.container}>
      <Header title={t("analysis.title")}>
        <Animated.View
          entering={FadeIn.duration(MOTION.base.duration)}
          style={styles.titleContainer}
        >
          <Text style={styles.subtitle}>{t("analysis.subtitle")}</Text>
        </Animated.View>

        {/* Period switch */}
        <View style={styles.periodRow}>
          <View style={styles.periodSwitch}>
            {PERIODS.map((option) => {
              const selected = option.value === period;
              return (
                <Pressable
                  key={option.value}
                  style={[styles.periodOption, selected && styles.periodOptionSelected]}
                  onPress={() => setPeriod(option.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.periodText, selected && styles.periodTextSelected]}>
                    {t(option.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.periodSpinner}>
            {isLoading && !!analyticsData && !refreshing ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : null}
          </View>
        </View>
      </Header>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarSpace }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderBody()}
      </ScrollView>
    </View>
  );
}

// ====================== Styles ======================
const styles = StyleSheet.create({
  // Main Layout
  container: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },
  scrollView: {
    flex: 1,
    marginTop: -HEADER_RADIUS,
  },
  scrollContent: {
    paddingTop: HEADER_RADIUS + 16,
    paddingHorizontal: 16,
  },

  // Header Styles
  titleContainer: {
    alignItems: "center",
  },
  subtitle: {
    color: "#CCCCCC",
    fontSize: 16,
    textAlign: "center",
  },

  // Period Switch
  // Centered in the header; the spinner sits to its right without shifting it.
  periodRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  periodSwitch: {
    width: "100%",
    maxWidth: 300,
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 4,
  },
  periodOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: "center",
  },
  periodOptionSelected: {
    backgroundColor: "#4E5A94",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  periodText: {
    fontSize: 14,
    color: "#B7B7B7",
    fontWeight: "500",
  },
  periodTextSelected: {
    color: "#FFF",
    fontWeight: "700",
  },
  periodSpinner: {
    position: "absolute",
    right: 0,
  },

  // Loading & Error States
  centerState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#4E5A94",
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: "#FF5733",
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#4E5A94",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },

  // Card Styles
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginTop: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 14,
    color: "#777",
  },

  // Success Rate Card
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  heroRate: {
    flex: 1,
  },
  heroValue: {
    fontSize: 44,
    fontWeight: "bold",
    color: "#16171F",
    marginTop: 2,
  },
  heroDetail: {
    fontSize: 14,
    color: "#555",
    marginTop: 10,
  },
  deltaText: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  streakChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF3E0",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  streakText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#B45F00",
  },
  rateTrack: {
    height: 10,
    backgroundColor: "#F0F0F0",
    borderRadius: 5,
    overflow: "hidden",
  },
  rateFill: {
    height: "100%",
    backgroundColor: "#4E5A94",
    borderRadius: 5,
  },

  // Count Cards
  statRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#16171F",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 13,
    color: "#777",
    marginTop: 2,
  },

  // Daily Chart
  dailyChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
  },
  dailyColumn: {
    flex: 1,
    alignItems: "center",
  },
  dailyBarArea: {
    height: DAILY_CHART_HEIGHT,
    width: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  dailyBar: {
    width: "100%",
    maxWidth: 28,
    borderRadius: 4,
    overflow: "hidden",
  },
  dailyBarEmpty: {
    height: 3,
    backgroundColor: "#ECEDF3",
  },
  dailyLabel: {
    marginTop: 6,
    fontSize: 11,
    color: "#777",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 14,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: "#555",
  },

  // Goal Breakdown
  goalList: {
    gap: 16,
  },
  goalItem: {
    gap: 6,
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  goalTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  goalRate: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#16171F",
  },
  goalDetail: {
    fontSize: 12,
    color: "#777",
  },

  // Empty States
  emptyState: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: "#F8F8F8",
    borderRadius: 8,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: "#888",
  },
});
