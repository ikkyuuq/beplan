import type { Ionicons } from "@expo/vector-icons";

type IconName = keyof typeof Ionicons.glyphMap;

type CategoryStyle = {
  icon: IconName;
  /** Main color: chips and accents. */
  color: string;
  /** Default template cover when there's no photo (top-left -> bottom-right). */
  gradient: readonly [string, string];
};

// The backend's five template categories (routers/template.py normalize_category).
const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  workout: { icon: "barbell-outline", color: "#F07B2B", gradient: ["#FFB36B", "#E8590C"] },
  health: { icon: "fitness-outline", color: "#2FA36B", gradient: ["#7FD8A6", "#1E8A57"] },
  education: { icon: "book-outline", color: "#3B82F6", gradient: ["#8EC5FF", "#2563EB"] },
  productivity: { icon: "checkbox-outline", color: "#8B5CF6", gradient: ["#C4B1FF", "#6D3FE0"] },
  finance: { icon: "cash-outline", color: "#14A3A3", gradient: ["#7EDFD8", "#0E7C7B"] },
};

// "All" and unknown categories.
const DEFAULT_STYLE: CategoryStyle = {
  icon: "pricetag-outline",
  color: "#4E5A94",
  gradient: ["#8B98D5", "#4E5A94"],
};

export function categoryStyle(category?: string | null): CategoryStyle {
  return CATEGORY_STYLES[(category ?? "").trim().toLowerCase()] ?? DEFAULT_STYLE;
}
