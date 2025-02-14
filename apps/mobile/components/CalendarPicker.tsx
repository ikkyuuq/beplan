import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Calendar } from "react-native-calendars";
import Modal from "react-native-modal";
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from "react-native-reanimated";

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
  mode?: "startGoal" | "pickTask";
};

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
}: CalendarPickerProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayString = today.toISOString().split("T")[0];

  const finalMinDate = mode === "startGoal" ? todayString : minDate;
  const finalMaxDate = mode === "startGoal" ? undefined : maxDate;

  const [selectedDates, setSelectedDates] = useState<string[]>(initialDates);
  const [totalDays, setTotalDays] = useState<number>(selectedDates.length);

  useEffect(() => {
    if (visible) {
      setSelectedDates(initialDates || []);
    }
  }, [visible]);

  useEffect(() => {
    setTotalDays(selectedDates.length);
  }, [selectedDates]);

  const modalTranslateY = useSharedValue(300);
  useEffect(() => {
    modalTranslateY.value = visible ? withSpring(0) : withSpring(300);
  }, [visible]);

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: modalTranslateY.value }],
  }));

  const toggleDateSelection = (date: string) => {
    if (date === otherSelectedDate) {
      console.log("⛔ ห้ามเลือกวันเดียวกับอีกอัน:", date);
      return;
    }

    setSelectedDates((prevSelected) =>
      singleSelect
        ? [date]
        : prevSelected.includes(date)
        ? prevSelected.filter((d) => d !== date)
        : [...prevSelected, date]
    );
  };

  const markedDates = {
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
    [todayString]: {
      disabled: true,
      disableTouchEvent: true,
      textColor: "gray",
    },
  };

  return (
    <Modal isVisible={visible} onBackdropPress={onClose}>
      <Animated.View style={[styles.modalContent, modalAnimatedStyle]}>
        <View style={styles.calendarContainer}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Calendar
            minDate={finalMinDate}
            maxDate={finalMaxDate}
            onDayPress={(day: { dateString: string }) =>
              toggleDateSelection(day.dateString)
            }
            markedDates={markedDates}
            disableAllTouchEventsForDisabledDays={true}
          />
        </View>

        {!singleSelect && (
          <Animated.Text style={styles.selectedDatesText}>
            Total: {totalDays} days
          </Animated.Text>
        )}

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

const styles = StyleSheet.create({
  modalContent: {
    width: "90%",
    alignSelf: "center",
    backgroundColor: "transparent",
  },
  calendarContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
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
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
});
