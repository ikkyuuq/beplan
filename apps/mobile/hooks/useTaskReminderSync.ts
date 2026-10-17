import { useAuth } from "@clerk/expo";
import { useEffect } from "react";
import { AppState } from "react-native";
import { useApiFetch } from "@/hooks/useApiFetch";
import {
  cancelTaskReminders,
  configureNotifications,
  remindersSupported,
  syncTaskReminders,
} from "@/utils/taskReminder";

/**
 * Keeps the task reminders current: syncs on sign-in and whenever the app
 * comes to the foreground, and clears them on sign-out so the next user on
 * this device doesn't get them.
 */
export function useTaskReminderSync() {
  const { isSignedIn } = useAuth();
  const apiFetch = useApiFetch();

  useEffect(() => {
    if (!remindersSupported) return;
    configureNotifications();
  }, []);

  useEffect(() => {
    if (!remindersSupported) return;
    if (!isSignedIn) {
      void cancelTaskReminders();
      return;
    }
    void syncTaskReminders(apiFetch);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void syncTaskReminders(apiFetch);
    });
    return () => sub.remove();
  }, [isSignedIn, apiFetch]);
}
