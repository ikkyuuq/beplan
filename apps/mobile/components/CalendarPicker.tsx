import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Calendar } from "react-native-calendars";
import Modal from "react-native-modal";
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from "react-native-reanimated";

// ====================== Type Definitions ======================
type CalendarPickerProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (dates: string[]) => void;
  title: string;
  initialDates?: string[];
  highlightColor?: string;
  singleSelect?: boolean;
  otherSelectedDate?: string;
  otherHighlightColor?: string;
  minDate?: string;
  maxDate?: string;
  mode?: "startDate" | "dueDate" | "pickTask";
  startDate?: string;
  dueDate?: string;
};

// ====================== Main Component ======================
export default function CalendarPicker({
  visible,
  onClose,
  onConfirm,
  title,
  initialDates = [],
  highlightColor = "#4CAF50",
  singleSelect = false,
  otherSelectedDate,
  otherHighlightColor = "#FF5733",
  minDate,
  maxDate,
  mode = "pickTask",
  startDate,
  dueDate,
}: CalendarPickerProps) {
  // ====================== Constants ======================
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayString = today.toISOString().split("T")[0];

  // ====================== State Management ======================
  const [selectedDates, setSelectedDates] = useState<string[]>(initialDates);
  const [totalDays, setTotalDays] = useState<number>(initialDates.length);

  // ====================== Animation Hooks ======================
  const modalTranslateY = useSharedValue(300);
  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: modalTranslateY.value }],
  }));

  // ====================== Effects ======================
  useEffect(() => {
    modalTranslateY.value = withSpring(visible ? 0 : 300, {
      damping: 300,
      stiffness: 110,
    });
  }, [visible]);

  useEffect(() => {
    if (visible) setSelectedDates(initialDates);
  }, [visible]);

  useEffect(() => {
    setTotalDays(selectedDates.length);
  }, [selectedDates]);

  // ====================== Date Restrictions Logic ======================
  const getDateRestrictions = () => {
    switch (mode) {
      case "startDate":
        return { minDate: todayString, maxDate: dueDate };
      case "dueDate":
        return { minDate: startDate || todayString, maxDate: undefined };
      default:
        return { minDate, maxDate };
    }
  };

  const { minDate: finalMinDate, maxDate: finalMaxDate } =
    getDateRestrictions();

  // ====================== Date Selection Handlers ======================
  const toggleDateSelection = (date: string) => {
    if (date === otherSelectedDate) {
      return;
    }

    setSelectedDates((prev) => {
      if (singleSelect) {
        return [date];
      }

      if (prev.includes(date)) {
        return prev.filter((d) => d !== date);
      }

      return [...prev, date];
    });
  };

  // ====================== Disabled Dates Generation ======================
  const createDisabledDates = () => {
    const disabledDates: Record<string, any> = {};
    const currentDate = new Date(finalMinDate || todayString);
    const endDate = new Date(finalMaxDate || "2099-12-31");

    if (finalMinDate) {
      const tempDate = new Date(currentDate);
      while (tempDate >= new Date(todayString)) {
        const dateString = tempDate.toISOString().split("T")[0];
        if (tempDate < today) {
          disabledDates[dateString] = {
            disabled: true,
            disableTouchEvent: true,
          };
        }
        tempDate.setDate(tempDate.getDate() - 1);
      }
    }

    if (finalMaxDate) {
      const tempDate = new Date(endDate);
      tempDate.setDate(tempDate.getDate() + 1);
      while (tempDate <= new Date("2099-12-31")) {
        const dateString = tempDate.toISOString().split("T")[0];
        disabledDates[dateString] = { disabled: true, disableTouchEvent: true };
        tempDate.setDate(tempDate.getDate() + 1);
      }
    }

    return disabledDates;
  };

  // ====================== Calendar Markings ======================
  const markedDates = {
    ...createDisabledDates(),
    ...selectedDates.reduce(
      (acc, date) => ({
        ...acc,
        [date]: { selected: true, selectedColor: highlightColor },
      }),
      {}
    ),
    ...(otherSelectedDate && {
      [otherSelectedDate]: {
        selected: true,
        selectedColor: otherHighlightColor,
      },
    }),
  };

  // ====================== Render UI ======================
  return (
    <Modal isVisible={visible}>
      <Animated.View style={[styles.modalContent, modalAnimatedStyle]}>
        {/* Calendar Section */}
        <View style={styles.calendarContainer}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Calendar
            minDate={finalMinDate}
            maxDate={finalMaxDate}
            onDayPress={(day: { dateString: string }) =>
              toggleDateSelection(day.dateString)
            }
            markedDates={markedDates}
            disableAllTouchEventsForDisabledDays={false}
            enableSwipeMonths={true}
          />
        </View>

        {/* Total Days Display */}
        {!singleSelect && (
          <Animated.Text style={styles.selectedDatesText}>
            Total: {totalDays} days
          </Animated.Text>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Pressable style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.buttonText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={styles.confirmButton}
            onPress={() => {
              onConfirm(selectedDates);
              onClose();
            }}
          >
            <Text style={styles.buttonText}>Confirm</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

// ====================== Styles ======================
const styles = StyleSheet.create({
  // Modal Container
  modalContent: {
    width: "90%",
    alignSelf: "center",
    backgroundColor: "transparent",
  },

  // Calendar Styles
  calendarContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },

  // Typography
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  selectedDatesText: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },

  // Button Styles
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  cancelButton: {
    backgroundColor: "#FF4444",
    padding: 12,
    borderRadius: 10,
    flex: 1,
    marginRight: 8,
    alignItems: "center",
  },
  confirmButton: {
    backgroundColor: "#4CAF50",
    padding: 12,
    borderRadius: 10,
    flex: 1,
    marginLeft: 8,
    alignItems: "center",
  },
});
