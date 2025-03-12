import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  FadeInDown,
} from "react-native-reanimated";
import { LineChart, PieChart } from "react-native-chart-kit";
import { useUser } from "@clerk/clerk-expo";
import Header from "@/components/Header";

// ====================== Type Definitions ======================
type AnalyticsData = {
  goals: {
    total: number;
    completed: number;
    success: {
      count: number;
      list: any[];
    };
    failed: {
      count: number;
      list: any[];
    };
    pending: number;
    success_rate: number;
    weekly_progress_overview: Record<string, number>;
    last_7_days: Record<string, number>;
    last_14_days: Record<string, number>;
    this_month: Record<string, number>;
    last_month: Record<string, number>;
  };
  tasks: {
    total: number;
    completed: number;
    success: {
      count: number;
      list: any[];
    };
    failed: {
      count: number;
      list: any[];
    };
    pending: number;
    success_rate: number;
    weekly_distribution: Record<string, number>;
  };
  templates: {
    total: number;
    category_usage: Record<string, number>;
  };
};

// ====================== Main Component ======================
export default function Analysis() {
  // ====================== Animation Values ======================
  const headerOpacity = useSharedValue(0);
  const cardsOpacity1 = useSharedValue(0);
  const cardsOpacity2 = useSharedValue(0);
  const cardsOpacity3 = useSharedValue(0);
  const chartOpacity = useSharedValue(0);

  // ====================== Hooks & State ======================
  const { user, isLoaded } = useUser();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ====================== Data Fetching ======================
  const fetchAnalyticsData = async () => {
    if (!isLoaded || !user) return;

    try {
      setIsLoading(true);
      setError(null);

      const baseUrl =
        Platform.OS === "android"
          ? "http://10.0.2.2:8000"
          : "http://192.168.1.43:8000"; // iPhone

      const response = await fetch(
        `${baseUrl}/api/v1/analysis/?user_id=${user.id}`
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setAnalyticsData(data);
    } catch (err) {
      console.error("Failed to fetch analytics data:", err);
      setError("Failed to load analytics data. Please try again later.");

      setAnalyticsData(null);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // ====================== Initial Load & Refresh ======================
  useEffect(() => {
    if (isLoaded && user) {
      fetchAnalyticsData();
    }
  }, [isLoaded, user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalyticsData();
  };

  // ====================== Animation Setup ======================
  useEffect(() => {
    // Header animation
    headerOpacity.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });

    // Cards animation
    cardsOpacity1.value = withDelay(300, withTiming(1, { duration: 500 }));
    cardsOpacity2.value = withDelay(500, withTiming(1, { duration: 500 }));
    cardsOpacity3.value = withDelay(700, withTiming(1, { duration: 500 }));

    // Chart animation
    chartOpacity.value = withDelay(900, withTiming(1, { duration: 600 }));
  }, []);

  // ====================== Animated Styles ======================
  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));

  const cardsAnimatedStyle1 = useAnimatedStyle(() => ({
    opacity: cardsOpacity1.value,
    transform: [
      {
        translateY: withTiming(cardsOpacity1.value * 1 === 1 ? 0 : 20, {
          duration: 500,
        }),
      },
    ],
  }));

  const cardsAnimatedStyle2 = useAnimatedStyle(() => ({
    opacity: cardsOpacity2.value,
    transform: [
      {
        translateY: withTiming(cardsOpacity2.value * 1 === 1 ? 0 : 20, {
          duration: 500,
        }),
      },
    ],
  }));

  const cardsAnimatedStyle3 = useAnimatedStyle(() => ({
    opacity: cardsOpacity3.value,
    transform: [
      {
        translateY: withTiming(cardsOpacity3.value * 1 === 1 ? 0 : 20, {
          duration: 500,
        }),
      },
    ],
  }));

  const chartAnimatedStyle = useAnimatedStyle(() => ({
    opacity: chartOpacity.value,
  }));

  // ====================== Chart Data Processing ======================
  const chartConfig = {
    backgroundGradient: {
      colors: ["#ffffff", "#ffffff"],
      positions: [0, 1],
    },
    backgroundColor: "#fff",
    backgroundGradientFrom: "#fff",
    backgroundGradientTo: "#fff",
    color: (opacity = 1) => `rgba(78, 90, 148, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
  };

  // ====================== Data Processing Functions ======================
  // weekly progress data for line chart
  const prepareWeeklyProgressData = () => {
    if (!analyticsData) return { labels: [], data: [] };

    const dayLabels = Object.keys(analyticsData.goals.weekly_progress_overview);
    const dayValues = Object.values(
      analyticsData.goals.weekly_progress_overview
    );

    return {
      labels: dayLabels.map((day) => day.substring(0, 3)),
      data: dayValues,
    };
  };

  // category usage data for pie chart
  const prepareCategoryData = () => {
    if (!analyticsData) return [];

    const categories = Object.entries(analyticsData.templates.category_usage);

    // Color palette for categories
    const categoryColors = {
      fitness: "#FF6384",
      health: "#36A2EB",
      education: "#FFCE56",
      work: "#4BC0C0",
      travel: "#9966FF",
      personal_development: "#FF9F40",
      other: "#C9CBCF",
    };

    return categories.map(([category, count]) => ({
      name:
        category.charAt(0).toUpperCase() + category.slice(1).replace("_", " "),
      count,
      color:
        categoryColors[category as keyof typeof categoryColors] || "#C9CBCF",
      legendFontColor: "#7F7F7F",
      legendFontSize: 12,
    }));
  };

  // task distribution data for custom bar chart
  const prepareTaskDistributionData = () => {
    if (!analyticsData) return { labels: [], data: [] };

    const dates = Object.keys(analyticsData.tasks.weekly_distribution);
    const counts = Object.values(analyticsData.tasks.weekly_distribution);

    const dayLabels = dates.map((date) => {
      const day = new Date(date).getDay();
      return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day];
    });

    return {
      labels: dayLabels,
      data: counts,
    };
  };

  // line chart data from processed weekly progress
  const getLineChartData = () => {
    const { labels, data } = prepareWeeklyProgressData();

    return {
      labels,
      datasets: [
        {
          data,
          color: (opacity = 1) => `rgba(78, 90, 148, ${opacity})`,
          strokeWidth: 2,
        },
      ],
      legend: ["Weekly Goals Progress"],
    };
  };

  // ====================== Loading & Error States ======================
  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4E5A94" />
        <Text style={styles.loadingText}>Loading your analytics...</Text>
      </View>
    );
  }

  if (error && !analyticsData) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={50} color="#FF5733" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchAnalyticsData}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ====================== Render UI ======================
  return (
    <View style={styles.container}>
      {/* Header */}
      <Header containerStyle={{ height: 220, gap: 0 }}>
        <Animated.View style={[headerAnimatedStyle, styles.titleContainer]}>
          <Text style={styles.title}>Analysis</Text>
          <Text style={styles.subtitle}>
            Track your progress and achievement
          </Text>
        </Animated.View>
      </Header>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Goals Section */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <Animated.View style={[styles.card, cardsAnimatedStyle1]}>
            <View style={styles.cardHeader}>
              <Ionicons name="flag" size={24} color="#4E5A94" />
              <Text style={styles.cardTitle}>Goals</Text>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {analyticsData?.goals.completed || 0}
                </Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {analyticsData?.goals.pending || 0}
                </Text>
                <Text style={styles.statLabel}>In Progress</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {analyticsData?.goals.total || 0}
                </Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <View style={[styles.badge, styles.successBadge]}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Success</Text>
                  <Text style={styles.detailValue}>
                    {analyticsData?.goals.success.count || 0}
                  </Text>
                </View>
              </View>
              <View style={styles.detailItem}>
                <View style={[styles.badge, styles.failBadge]}>
                  <Ionicons name="close" size={16} color="#fff" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Failed</Text>
                  <Text style={styles.detailValue}>
                    {analyticsData?.goals.failed.count || 0}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.rateContainer}>
              <Text style={styles.rateLabel}>Success Rate</Text>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { width: `${analyticsData?.goals.success_rate || 0}%` },
                  ]}
                />
              </View>
              <Text style={styles.rateValue}>
                {analyticsData?.goals.success_rate || 0}%
              </Text>
            </View>
          </Animated.View>
        </Animated.View>

        {/* Tasks Section */}
        <Animated.View entering={FadeInDown.delay(500).duration(500)}>
          <Animated.View style={[styles.card, cardsAnimatedStyle2]}>
            <View style={styles.cardHeader}>
              <Ionicons name="list" size={24} color="#4E5A94" />
              <Text style={styles.cardTitle}>Tasks</Text>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {analyticsData?.tasks.completed || 0}
                </Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {analyticsData?.tasks.pending || 0}
                </Text>
                <Text style={styles.statLabel}>In Progress</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {analyticsData?.tasks.total || 0}
                </Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <View style={[styles.badge, styles.successBadge]}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Success</Text>
                  <Text style={styles.detailValue}>
                    {analyticsData?.tasks.success.count || 0}
                  </Text>
                </View>
              </View>
              <View style={styles.detailItem}>
                <View style={[styles.badge, styles.failBadge]}>
                  <Ionicons name="close" size={16} color="#fff" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Failed</Text>
                  <Text style={styles.detailValue}>
                    {analyticsData?.tasks.failed.count || 0}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.rateContainer}>
              <Text style={styles.rateLabel}>Success Rate</Text>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { width: `${analyticsData?.tasks.success_rate || 0}%` },
                  ]}
                />
              </View>
              <Text style={styles.rateValue}>
                {analyticsData?.tasks.success_rate || 0}%
              </Text>
            </View>
          </Animated.View>
        </Animated.View>

        {/* Templates Section */}
        <Animated.View entering={FadeInDown.delay(700).duration(500)}>
          <Animated.View style={[styles.card, cardsAnimatedStyle3]}>
            <View style={styles.cardHeader}>
              <Ionicons name="document-text" size={24} color="#4E5A94" />
              <Text style={styles.cardTitle}>Templates</Text>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {analyticsData?.templates.total || 0}
                </Text>
                <Text style={styles.statLabel}>Total Templates</Text>
              </View>
              {analyticsData && analyticsData.templates.total > 0 ? (
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {Object.keys(analyticsData.templates.category_usage).length}
                  </Text>
                  <Text style={styles.statLabel}>Categories</Text>
                </View>
              ) : (
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>0</Text>
                  <Text style={styles.statLabel}>Categories</Text>
                </View>
              )}
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {analyticsData && analyticsData.templates.total > 0
                    ? Math.max(
                        ...Object.values(analyticsData.templates.category_usage)
                      )
                    : 0}
                </Text>
                <Text style={styles.statLabel}>Most Used</Text>
              </View>
            </View>

            {/* Popular Categories Section */}
            {analyticsData && analyticsData.templates.total > 0 && (
              <View style={styles.categoriesContainer}>
                <Text style={styles.categoriesTitle}>Popular Categories</Text>
                <View style={styles.categoriesList}>
                  {Object.entries(analyticsData.templates.category_usage)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([category, count], index) => (
                      <View key={index} style={styles.categoryItem}>
                        <Text style={styles.categoryName}>
                          {category.charAt(0).toUpperCase() +
                            category.slice(1).replace("_", " ")}
                        </Text>
                        <View style={styles.categoryBar}>
                          <View
                            style={[
                              styles.categoryBarFill,
                              {
                                width: `${
                                  (count / analyticsData.templates.total) * 100
                                }%`,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.categoryCount}>{count}</Text>
                      </View>
                    ))}
                </View>
              </View>
            )}
          </Animated.View>
        </Animated.View>

        {/* Charts Section */}
        <Animated.View style={[styles.chartsContainer, chartAnimatedStyle]}>
          <Text style={styles.sectionTitle}>Detailed Analytics</Text>

          {/* Weekly Goals Progress Chart */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Weekly Goals Progress</Text>
            {analyticsData && analyticsData.goals.total > 0 ? (
              <LineChart
                data={getLineChartData()}
                width={350}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
              />
            ) : (
              <View style={styles.emptyChartContainer}>
                <Ionicons name="bar-chart-outline" size={50} color="#DDD" />
                <Text style={styles.emptyChartText}>
                  No goal data available
                </Text>
              </View>
            )}
          </View>

          {/* Tasks Weekly Distribution - Custom View */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>
              Tasks Distribution (Last 7 Days)
            </Text>
            {analyticsData && analyticsData.tasks.total > 0 ? (
              <View style={styles.tasksDistributionContainer}>
                {(() => {
                  const { labels, data } = prepareTaskDistributionData();
                  return labels.map((dayLabel, index) => {
                    const count = data[index];
                    const maxCount = Math.max(...data);
                    const heightPercentage =
                      maxCount > 0 ? (count / maxCount) * 100 : 0;

                    return (
                      <View key={index} style={styles.taskDistributionItem}>
                        <View style={styles.taskBar}>
                          <View
                            style={[
                              styles.taskBarFill,
                              {
                                height: `${heightPercentage}%`,
                                backgroundColor:
                                  index % 2 === 0 ? "#4E5A94" : "#8B98D5",
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.taskBarLabel}>{dayLabel}</Text>
                        <Text style={styles.taskBarValue}>{count}</Text>
                      </View>
                    );
                  });
                })()}
              </View>
            ) : (
              <View style={styles.emptyChartContainer}>
                <Ionicons name="calendar-outline" size={50} color="#DDD" />
                <Text style={styles.emptyChartText}>
                  No task data available
                </Text>
              </View>
            )}
          </View>

          {/* Template Categories Chart */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Template Categories</Text>
            {analyticsData && analyticsData.templates.total > 0 ? (
              <PieChart
                data={prepareCategoryData()}
                width={350}
                height={200}
                chartConfig={chartConfig}
                accessor="count"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
            ) : (
              <View style={styles.emptyChartContainer}>
                <Ionicons name="pie-chart-outline" size={50} color="#DDD" />
                <Text style={styles.emptyChartText}>
                  No template data available
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
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
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // Loading & Error Styles
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#4E5A94",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    padding: 20,
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

  // Header Styles
  titleContainer: {
    alignItems: "flex-start",
    marginTop: 20,
  },
  title: {
    color: "#fff",
    fontSize: 40,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    color: "#CCCCCC",
    fontSize: 16,
  },

  // Card Styles
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 8,
    color: "#333",
  },

  // Stats Styles
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#16171F",
  },
  statLabel: {
    fontSize: 14,
    color: "#777",
    marginTop: 4,
  },

  // Detail Styles
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  badge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  successBadge: {
    backgroundColor: "#4CAF50",
  },
  failBadge: {
    backgroundColor: "#F44336",
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: "#777",
  },
  detailValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },

  // Progress Bar Styles
  rateContainer: {
    marginTop: 8,
  },
  rateLabel: {
    fontSize: 14,
    color: "#777",
    marginBottom: 6,
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: "#F0F0F0",
    borderRadius: 5,
    marginBottom: 6,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#4E5A94",
    borderRadius: 5,
  },
  rateValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    textAlign: "right",
  },

  // Categories Styles
  categoriesContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 16,
  },
  categoriesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#444",
    marginBottom: 12,
  },
  categoriesList: {
    gap: 8,
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryName: {
    fontSize: 14,
    color: "#444",
    width: 100,
  },
  categoryBar: {
    flex: 1,
    height: 8,
    backgroundColor: "#F0F0F0",
    borderRadius: 4,
    marginHorizontal: 10,
    overflow: "hidden",
  },
  categoryBarFill: {
    height: "100%",
    backgroundColor: "#4E5A94",
    borderRadius: 4,
  },
  categoryCount: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    width: 30,
    textAlign: "right",
  },

  // Charts Styles
  chartsContainer: {
    marginTop: 24,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  chartCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignItems: "center",
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
  },
  emptyChartContainer: {
    height: 200,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    borderRadius: 8,
  },
  emptyChartText: {
    marginTop: 10,
    fontSize: 14,
    color: "#888",
  },

  // Custom Task Distribution Chart Styles
  tasksDistributionContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    width: "100%",
    height: 200,
    marginTop: 10,
    marginBottom: 20,
  },
  taskDistributionItem: {
    alignItems: "center",
    width: 40,
  },
  taskBar: {
    width: 30,
    height: 150,
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  taskBarFill: {
    width: "100%",
    borderRadius: 8,
  },
  taskBarLabel: {
    marginTop: 8,
    color: "#555",
    fontSize: 12,
  },
  taskBarValue: {
    color: "#333",
    fontWeight: "bold",
    fontSize: 12,
    marginTop: 4,
  },
});
