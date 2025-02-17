export type Task = {
  title: string;
  description?: string;
  type: "normal" | "daily" | "weekly" | "monthly";
  selectedDates?: string[];
  selectedDaysOfWeek?: number[];
  monthlyMode?: "start" | "mid" | "end";
};
