import React, { useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
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
import Header from "@/components/Header";

// ====================== Mock Data ======================
const mockData = {
  goals: {
    total: 15,
    success: 8,
    fail: 2,
    pending: 5,
    successRate: 80,
    weeklyProgress: [3, 4, 2, 5, 6, 7, 8],
  },
  tasks: {
    total: 48,
    success: 32,
    fail: 6,
    pending: 10,
    successRate: 84,
    weeklyDistribution: [12, 8, 6, 10, 12],
  },
  templates: {
    total: 7,
    success: 5,
    fail: 2,
    successRate: 71,
    categories: ["Workout", "Finance", "Education", "Health", "Travel"],
    categoryUsage: [3, 2, 1, 1, 0],
  },
  weekLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  categoryColors: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"],
};

// ====================== Main Component ======================
export default function Analysis() {
  // ====================== Animation Values ======================
  const headerOpacity = useSharedValue(0);
  const cardsOpacity1 = useSharedValue(0);
  const cardsOpacity2 = useSharedValue(0);
  const cardsOpacity3 = useSharedValue(0);
  const chartOpacity = useSharedValue(0);

  // ====================== Animation Setup ======================
  useEffect(() => {
    // Header animation
    headerOpacity.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });

    // Cards animation with sequential timing
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

  // ====================== Chart Configurations ======================
  const chartConfig = {
    backgroundGradientFrom: "#fff",
    backgroundGradientTo: "#fff",
    color: (opacity = 1) => `rgba(78, 90, 148, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
  };

  const lineChartData = {
    labels: mockData.weekLabels,
    datasets: [
      {
        data: mockData.goals.weeklyProgress,
        color: (opacity = 1) => `rgba(78, 90, 148, ${opacity})`,
        strokeWidth: 2,
      },
    ],
    legend: ["Weekly Goals Progress"],
  };

  // Removed barChartData

  const pieChartData = mockData.templates.categories.map((category, index) => ({
    name: category,
    count: mockData.templates.categoryUsage[index],
    color: mockData.categoryColors[index],
    legendFontColor: "#7F7F7F",
    legendFontSize: 12,
  }));

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
      >
        {/* Goals Section */}
        <Animated.View
          entering={FadeInDown.delay(300).duration(500)}
          style={[styles.card, cardsAnimatedStyle1]}
        >
          <View style={styles.cardHeader}>
            <Ionicons name="flag" size={24} color="#4E5A94" />
            <Text style={styles.cardTitle}>Goals</Text>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {mockData.goals.success + mockData.goals.fail}
              </Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{mockData.goals.pending}</Text>
              <Text style={styles.statLabel}>In Progress</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{mockData.goals.total}</Text>
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
                <Text style={styles.detailValue}>{mockData.goals.success}</Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <View style={[styles.badge, styles.failBadge]}>
                <Ionicons name="close" size={16} color="#fff" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Failed</Text>
                <Text style={styles.detailValue}>{mockData.goals.fail}</Text>
              </View>
            </View>
          </View>

          <View style={styles.rateContainer}>
            <Text style={styles.rateLabel}>Success Rate</Text>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${mockData.goals.successRate}%` },
                ]}
              />
            </View>
            <Text style={styles.rateValue}>{mockData.goals.successRate}%</Text>
          </View>
        </Animated.View>

        {/* Tasks Section */}
        <Animated.View
          entering={FadeInDown.delay(500).duration(500)}
          style={[styles.card, cardsAnimatedStyle2]}
        >
          <View style={styles.cardHeader}>
            <Ionicons name="list" size={24} color="#4E5A94" />
            <Text style={styles.cardTitle}>Tasks</Text>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {mockData.tasks.success + mockData.tasks.fail}
              </Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{mockData.tasks.pending}</Text>
              <Text style={styles.statLabel}>In Progress</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{mockData.tasks.total}</Text>
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
                <Text style={styles.detailValue}>{mockData.tasks.success}</Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <View style={[styles.badge, styles.failBadge]}>
                <Ionicons name="close" size={16} color="#fff" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Failed</Text>
                <Text style={styles.detailValue}>{mockData.tasks.fail}</Text>
              </View>
            </View>
          </View>

          <View style={styles.rateContainer}>
            <Text style={styles.rateLabel}>Success Rate</Text>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${mockData.tasks.successRate}%` },
                ]}
              />
            </View>
            <Text style={styles.rateValue}>{mockData.tasks.successRate}%</Text>
          </View>
        </Animated.View>

        {/* Templates Section */}
        <Animated.View
          entering={FadeInDown.delay(700).duration(500)}
          style={[styles.card, cardsAnimatedStyle3]}
        >
          <View style={styles.cardHeader}>
            <Ionicons name="document-text" size={24} color="#4E5A94" />
            <Text style={styles.cardTitle}>Templates</Text>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{mockData.templates.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{mockData.templates.success}</Text>
              <Text style={styles.statLabel}>Success</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{mockData.templates.fail}</Text>
              <Text style={styles.statLabel}>Failed</Text>
            </View>
          </View>

          <View style={styles.rateContainer}>
            <Text style={styles.rateLabel}>Success Rate</Text>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${mockData.templates.successRate}%` },
                ]}
              />
            </View>
            <Text style={styles.rateValue}>
              {mockData.templates.successRate}%
            </Text>
          </View>
        </Animated.View>

        {/* Charts Section */}
        <Animated.View style={[styles.chartsContainer, chartAnimatedStyle]}>
          <Text style={styles.sectionTitle}>Detailed Analytics</Text>

          {/* Weekly Goals Progress Chart */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Weekly Goals Progress</Text>
            <LineChart
              data={lineChartData}
              width={350}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          </View>

          {/* Tasks Distribution - Custom View (Replaced BarChart) */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Tasks Distribution</Text>
            <View style={styles.tasksDistributionContainer}>
              {mockData.weekLabels.slice(0, 5).map((day, index) => (
                <View key={index} style={styles.taskDistributionItem}>
                  <View style={styles.taskBar}>
                    <View
                      style={[
                        styles.taskBarFill,
                        {
                          height: `${
                            (mockData.tasks.weeklyDistribution[index] /
                              Math.max(...mockData.tasks.weeklyDistribution)) *
                            100
                          }%`,
                          backgroundColor:
                            index % 2 === 0 ? "#4E5A94" : "#8B98D5",
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.taskBarLabel}>{day}</Text>
                  <Text style={styles.taskBarValue}>
                    {mockData.tasks.weeklyDistribution[index]}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Template Categories Chart */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Template Categories</Text>
            <PieChart
              data={pieChartData}
              width={350}
              height={200}
              chartConfig={chartConfig}
              accessor="count"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
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
    width: 50,
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
