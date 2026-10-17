import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { parseISO, setHours, setMinutes } from "date-fns";
import { API_BASE_URL } from "@/constants/api";
import type { ApiFetch } from "@/hooks/useApiFetch";

/**
 * Evening reminder for tasks that are still unmarked (iOS/Android only).
 *
 * Notifications are local: each sync asks the backend for the pending task
 * count of the next DAYS days and schedules one notification per day that has
 * tasks left, at the user's chosen time. Future days can't be marked early, so
 * their counts stay right until the day comes; today's is refreshed whenever
 * the app syncs (opening the app, marking tasks).
 */

export type ReminderSettings = {
  enabled: boolean;
  hour: number;
  minute: number;
};

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: false,
  hour: 20,
  minute: 0,
};

const SETTINGS_KEY = "taskReminderSettings";
const ID_PREFIX = "task-reminder-";
const CHANNEL_ID = "task-reminders";
const DAYS = 7;

export const remindersSupported = Platform.OS !== "web";

export async function loadReminderSettings(): Promise<ReminderSettings> {
  if (!remindersSupported) return DEFAULT_REMINDER_SETTINGS;
  try {
    const raw = await SecureStore.getItemAsync(SETTINGS_KEY);
    return raw
      ? { ...DEFAULT_REMINDER_SETTINGS, ...JSON.parse(raw) }
      : DEFAULT_REMINDER_SETTINGS;
  } catch (error) {
    console.warn("Couldn't read reminder settings:", error);
    return DEFAULT_REMINDER_SETTINGS;
  }
}

export async function saveReminderSettings(settings: ReminderSettings) {
  await SecureStore.setItemAsync(SETTINGS_KEY, JSON.stringify(settings));
}

/** Show reminders as a banner even when the app is open. Call once. */
export function configureNotifications() {
  if (!remindersSupported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === "android") {
    void Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Task reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

/** Asks for permission if it hasn't been decided yet. */
export async function requestReminderPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const result = await Notifications.requestPermissionsAsync();
  return result.granted;
}

export async function cancelTaskReminders() {
  if (!remindersSupported) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(ID_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

async function doSync(apiFetch: ApiFetch) {
  const settings = await loadReminderSettings();
  const permission = await Notifications.getPermissionsAsync();
  if (!settings.enabled || !permission.granted) {
    await cancelTaskReminders();
    return;
  }

  const resp = await apiFetch(
    `${API_BASE_URL}/api/v1/goal/pending_counts?days=${DAYS}`
  );
  // Offline or server error: keep the reminders that are already scheduled.
  if (!resp.ok) throw new Error(`pending_counts failed (HTTP ${resp.status})`);
  const days: { date: string; pending_tasks: number }[] = await resp.json();

  await cancelTaskReminders();
  const now = new Date();
  for (const day of days) {
    const at = setMinutes(
      setHours(parseISO(day.date), settings.hour),
      settings.minute
    );
    if (at <= now || day.pending_tasks <= 0) continue;
    const n = day.pending_tasks;
    await Notifications.scheduleNotificationAsync({
      identifier: `${ID_PREFIX}${day.date}`,
      content: {
        title: "Don't forget your tasks",
        body: `You have ${n} ${n === 1 ? "task" : "tasks"} left to mark today.`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: at,
        channelId: CHANNEL_ID,
      },
    });
  }
}

let queue: Promise<void> = Promise.resolve();

/**
 * Reschedules the reminders from the current pending counts. Syncs run one
 * at a time so overlapping calls can't cancel each other's notifications.
 */
export function syncTaskReminders(apiFetch: ApiFetch): Promise<void> {
  if (!remindersSupported) return Promise.resolve();
  queue = queue
    .then(() => doSync(apiFetch))
    .catch((error) => console.warn("Couldn't sync task reminders:", error));
  return queue;
}
