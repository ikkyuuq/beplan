import i18n from "./index";

/** "1 Year", "3 Months", "12 Days" in the current language. */
export function formatDuration(days?: number): string {
  if (!days) return "";
  if (days >= 365) return i18n.t("duration.year");
  if (days >= 30) return i18n.t("duration.months", { count: Math.floor(days / 30) });
  return i18n.t("duration.days", { count: days });
}

/** Translated name for a template category ("workout", "Health", ...); unknown ones as given. */
export function categoryLabel(category: string): string {
  const key = (category ?? "").toLowerCase();
  const fallback = category ? category.charAt(0).toUpperCase() + category.slice(1).replace("_", " ") : "";
  return i18n.t(`categories.${key}` as "categories.all", { defaultValue: fallback });
}
