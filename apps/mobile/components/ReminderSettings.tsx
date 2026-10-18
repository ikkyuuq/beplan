import { useEffect, useState } from "react";
import {
  Platform,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Constants, { ExecutionEnvironment } from "expo-constants";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Alert } from "@/utils/alert";
import { useTranslation } from "@/i18n";
import { useApiFetch } from "@/hooks/useApiFetch";
import {
  DEFAULT_REMINDER_SETTINGS,
  loadReminderSettings,
  ReminderSettings as Settings,
  remindersSupported,
  requestReminderPermission,
  saveReminderSettings,
  syncTaskReminders,
} from "@/utils/taskReminder";

function formatTime(hour: number, minute: number) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Settings section: turn the evening task reminder on/off and pick its time. */
export default function ReminderSettings() {
  const { t } = useTranslation();
  // Expo Go for Android ships without expo-notifications' native modules.
  const unavailableText =
    Platform.OS === "web"
      ? t("reminders.webOnly")
      : Constants.executionEnvironment === ExecutionEnvironment.StoreClient
        ? t("reminders.expoGo")
        : t("reminders.unavailable");
  const apiFetch = useApiFetch();
  const [settings, setSettings] = useState<Settings>(DEFAULT_REMINDER_SETTINGS);
  // Android shows the picker as a dialog, opened from the time button.
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);

  useEffect(() => {
    void loadReminderSettings().then(setSettings);
  }, []);

  const apply = async (next: Settings) => {
    setSettings(next);
    try {
      await saveReminderSettings(next);
    } catch (error) {
      console.warn("Couldn't save reminder settings:", error);
    }
    await syncTaskReminders(apiFetch);
  };

  const toggle = async (enabled: boolean) => {
    if (enabled && !(await requestReminderPermission())) {
      Alert.alert(t("reminders.permissionTitle"), t("reminders.permissionMessage"));
      return;
    }
    await apply({ ...settings, enabled });
  };

  const pickerValue = new Date();
  pickerValue.setHours(settings.hour, settings.minute, 0, 0);

  const onPickTime = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") setShowAndroidPicker(false);
    if (event.type !== "set" || !date) return;
    if (date.getHours() === settings.hour && date.getMinutes() === settings.minute) {
      return;
    }
    void apply({ ...settings, hour: date.getHours(), minute: date.getMinutes() });
  };

  return (
    <View style={styles.section}>
      <View style={styles.titleRow}>
        <Feather name="bell" size={20} color="#4E5A94" />
        <Text style={styles.title}>{t("reminders.title")}</Text>
      </View>

      {remindersSupported() ? (
        <>
          <View style={styles.row}>
            <Text style={styles.label}>{t("reminders.toggle")}</Text>
            <Switch
              value={settings.enabled}
              onValueChange={(value) => void toggle(value)}
              trackColor={{ true: "#4E5A94" }}
            />
          </View>

          {settings.enabled && (
            <View style={styles.row}>
              <Text style={styles.label}>{t("reminders.time")}</Text>
              {Platform.OS === "ios" ? (
                <DateTimePicker
                  value={pickerValue}
                  mode="time"
                  display="compact"
                  onChange={onPickTime}
                />
              ) : (
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setShowAndroidPicker(true)}
                  accessibilityLabel={t("reminders.changeTime")}
                >
                  <Text style={styles.time}>
                    {formatTime(settings.hour, settings.minute)}
                  </Text>
                </TouchableOpacity>
              )}
              {showAndroidPicker && (
                <DateTimePicker
                  value={pickerValue}
                  mode="time"
                  display="clock"
                  onChange={onPickTime}
                />
              )}
            </View>
          )}

          <Text style={styles.note}>{t("reminders.note")}</Text>
        </>
      ) : (
        <Text style={styles.note}>
          {unavailableText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Same card look as the other sections in userSettings.
  section: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  label: {
    flex: 1,
    fontSize: 16,
    color: "#444",
  },
  timeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#EEF0F8",
  },
  time: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    minWidth: 56,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  note: {
    fontSize: 12,
    color: "#888",
    fontStyle: "italic",
  },
});
