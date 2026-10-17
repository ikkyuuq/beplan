import { useEffect, useState } from "react";
import {
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Alert } from "@/utils/alert";
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

const STEP_MINUTES = 15;

function formatTime(hour: number, minute: number) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Settings section: turn the evening task reminder on/off and pick its time. */
export default function ReminderSettings() {
  const apiFetch = useApiFetch();
  const [settings, setSettings] = useState<Settings>(DEFAULT_REMINDER_SETTINGS);

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
      Alert.alert(
        "Notifications are off",
        "Allow notifications for this app in your phone's Settings to get task reminders."
      );
      return;
    }
    await apply({ ...settings, enabled });
  };

  const shiftTime = (delta: number) => {
    const total =
      (settings.hour * 60 + settings.minute + delta + 24 * 60) % (24 * 60);
    void apply({
      ...settings,
      hour: Math.floor(total / 60),
      minute: total % 60,
    });
  };

  return (
    <View style={styles.section}>
      <View style={styles.titleRow}>
        <Feather name="bell" size={20} color="#4E5A94" />
        <Text style={styles.title}>Reminders</Text>
      </View>

      {remindersSupported ? (
        <>
          <View style={styles.row}>
            <Text style={styles.label}>Remind me about unmarked tasks</Text>
            <Switch
              value={settings.enabled}
              onValueChange={(value) => void toggle(value)}
              trackColor={{ true: "#4E5A94" }}
            />
          </View>

          {settings.enabled && (
            <View style={styles.row}>
              <Text style={styles.label}>Time</Text>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepButton}
                  onPress={() => shiftTime(-STEP_MINUTES)}
                  accessibilityLabel="Earlier"
                >
                  <Feather name="minus" size={18} color="#4E5A94" />
                </TouchableOpacity>
                <Text style={styles.time}>
                  {formatTime(settings.hour, settings.minute)}
                </Text>
                <TouchableOpacity
                  style={styles.stepButton}
                  onPress={() => shiftTime(STEP_MINUTES)}
                  accessibilityLabel="Later"
                >
                  <Feather name="plus" size={18} color="#4E5A94" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <Text style={styles.note}>
            Only sent on days when some of that day's tasks are still unmarked.
          </Text>
        </>
      ) : (
        <Text style={styles.note}>
          Task reminders are available in the iOS and Android app.
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
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EEF0F8",
    alignItems: "center",
    justifyContent: "center",
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
