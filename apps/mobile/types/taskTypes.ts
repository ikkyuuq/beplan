export type Task = {
  id: string;
  title: string;
  description?: string;
  type: "normal" | "daily" | "weekly" | "monthly";
  selectedDates?: string[];
  selectedDaysOfWeek?: number[];
  monthlyMode?: "start" | "mid" | "end";
  goalId: string;
};
