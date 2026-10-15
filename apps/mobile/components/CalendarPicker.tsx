import { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Calendar } from "react-native-calendars";
import { endOfMonth, format, parseISO } from "date-fns";
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
  // Local calendar date. (toISOString() would convert to UTC and give
  // yesterday's date in timezones ahead of UTC, e.g. Thailand.)
  const todayString = format(new Date(), "yyyy-MM-dd");

  // ====================== State Management ======================
  const [selectedDates, setSelectedDates] = useState<string[]>(initialDates);
  const [totalDays, setTotalDays] = useState<number>(initialDates.length);

  // Month shown by the calendar, and the month/year jump grid. `jumpKey`
  // remounts the calendar so it opens on a month chosen from the grid.
  const [displayMonth, setDisplayMonth] = useState<string>(
    initialDates[0] || todayString
  );
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState<number>(
    parseISO(initialDates[0] || todayString).getFullYear()
  );
  const [jumpKey, setJumpKey] = useState(0);

  // ====================== Animation Values ======================
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

  // ====================== Month/Year Jump ======================
  // A month is selectable if any of its days falls inside [min, max].
  const isMonthSelectable = (year: number, monthIndex: number) => {
    const first = format(new Date(year, monthIndex, 1), "yyyy-MM-dd");
    const last = format(endOfMonth(new Date(year, monthIndex, 1)), "yyyy-MM-dd");
    if (finalMinDate && last < finalMinDate) return false;
    if (finalMaxDate && first > finalMaxDate) return false;
    return true;
  };

  // Each time the picker opens, start on the selected (or earliest) month.
  const resetDisplayedMonth = () => {
    const start = initialDates[0] || todayString;
    setDisplayMonth(start);
    setPickerYear(parseISO(start).getFullYear());
    setShowMonthPicker(false);
    setJumpKey((k) => k + 1);
  };

  const openMonthPicker = () => {
    setPickerYear(parseISO(displayMonth).getFullYear());
    setShowMonthPicker(true);
  };

  const jumpToMonth = (year: number, monthIndex: number) => {
    setDisplayMonth(format(new Date(year, monthIndex, 1), "yyyy-MM-dd"));
    setShowMonthPicker(false);
    setJumpKey((k) => k + 1);
  };

  const renderMonthPicker = () => {
    const shownMonth = parseISO(displayMonth);
    return (
      <View>
        <View style={styles.yearRow}>
          <Pressable
            onPress={() => setPickerYear((y) => y - 1)}
            hitSlop={10}
            accessibilityLabel="Previous year"
          >
            <Text style={styles.yearArrow}>‹</Text>
          </Pressable>
          <Text style={styles.calendarHeader}>{pickerYear}</Text>
          <Pressable
            onPress={() => setPickerYear((y) => y + 1)}
            hitSlop={10}
            accessibilityLabel="Next year"
          >
            <Text style={styles.yearArrow}>›</Text>
          </Pressable>
        </View>
        <View style={styles.monthGrid}>
          {Array.from({ length: 12 }, (_, monthIndex) => {
            const selectable = isMonthSelectable(pickerYear, monthIndex);
            const isShown =
              shownMonth.getFullYear() === pickerYear &&
              shownMonth.getMonth() === monthIndex;
            return (
              <Pressable
                key={monthIndex}
                disabled={!selectable}
                onPress={() => jumpToMonth(pickerYear, monthIndex)}
                style={[styles.monthCell, isShown && styles.monthCellShown]}
              >
                <Text
                  style={[
                    styles.monthCellText,
                    isShown && styles.monthCellTextShown,
                    !selectable && styles.monthCellTextDisabled,
                  ]}
                >
                  {format(new Date(pickerYear, monthIndex, 1), "MMM")}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable onPress={() => setShowMonthPicker(false)} style={styles.backToCalendar}>
          <Text style={styles.backToCalendarText}>Back to calendar</Text>
        </Pressable>
      </View>
    );
  };

  // ====================== Calendar Markings ======================
  // Only selected dates are marked; minDate/maxDate already grey out and
  // block everything outside the allowed range.
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
  };

  // ====================== Render UI ======================
  return (
    <View>
      {/* A custom backdrop keeps react-native-modal from wrapping it in
          TouchableWithoutFeedback, which logs a React 19 element.ref error on web. */}
      <Modal
        isVisible={visible}
        customBackdrop={<View style={styles.backdrop} />}
        onModalWillShow={resetDisplayedMonth}
      >
        <Animated.View style={[styles.modalContent, modalAnimatedStyle]}>
          {/* Calendar Section */}
          <View style={styles.calendarContainer}>
            <Text style={styles.modalTitle}>{title}</Text>
            {showMonthPicker ? (
              renderMonthPicker()
            ) : (
            <Calendar
              key={jumpKey}
              current={displayMonth}
              onMonthChange={(month: { dateString: string }) =>
                setDisplayMonth(month.dateString)
              }
              minDate={finalMinDate}
              maxDate={finalMaxDate}
              onDayPress={(day: { dateString: string }) =>
                toggleDateSelection(day.dateString)
              }
              markedDates={markedDates}
              disableAllTouchEventsForDisabledDays={true}
              enableSwipeMonths={true}
              theme={calendarTheme}
              renderHeader={(month: Date) => (
                // The library's default title calls month.toString("MMMM yyyy"),
                // which a plain Date ignores, printing "Fri Oct 16 2026 01:44:39 GMT+0700".
                // Tapping it opens the month/year jump grid.
                <Pressable
                  onPress={openMonthPicker}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Choose month and year"
                >
                  <Text style={styles.calendarHeader}>
                    {format(new Date(+month), "EEE MMM d")} ▾
                  </Text>
                </Pressable>
              )}
            />
            )}
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
    </View>
  );
}

// ====================== Calendar Theme ======================
// High-contrast days: available dates dark and slightly bold, unavailable
// dates a readable grey (the library default #d9e1e8 is nearly invisible).
const calendarTheme = {
  dayTextColor: "#1f2933",
  textDisabledColor: "#9aa5b1",
  todayTextColor: "#2563eb",
  monthTextColor: "#1f2933",
  arrowColor: "#1f2933",
  textSectionTitleColor: "#52606d",
  textDayFontWeight: "500" as const,
  textMonthFontWeight: "bold" as const,
  textDayFontSize: 16,
};

// ====================== Styles ======================
const styles = StyleSheet.create({
  // Modal backdrop (react-native-modal fades it to backdropOpacity)
  backdrop: {
    flex: 1,
    backgroundColor: "#000",
  },

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
  calendarHeader: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2933",
  },

  // Month/year jump grid
  yearRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  yearArrow: {
    fontSize: 28,
    color: "#1f2933",
    paddingHorizontal: 8,
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  monthCell: {
    width: "31%",
    paddingVertical: 14,
    marginVertical: 4,
    borderRadius: 8,
    alignItems: "center",
  },
  monthCellShown: {
    backgroundColor: "#2563eb",
  },
  monthCellText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1f2933",
  },
  monthCellTextShown: {
    color: "#fff",
  },
  monthCellTextDisabled: {
    color: "#9aa5b1",
  },
  backToCalendar: {
    alignItems: "center",
    paddingVertical: 10,
  },
  backToCalendarText: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "500",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  selectedDatesText: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 10,
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
