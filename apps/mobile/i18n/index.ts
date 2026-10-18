import i18n from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";
import { getLocales } from "expo-localization";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { enUS, th as thLocale, type Locale } from "date-fns/locale";
import { LocaleConfig } from "react-native-calendars";
import en from "./locales/en";
import th from "./locales/th";

export type Language = "en" | "th";
export type LanguagePreference = Language | "system";

const PREFERENCE_KEY = "beplan.language";

export function deviceLanguage(): Language {
  return getLocales()[0]?.languageCode === "th" ? "th" : "en";
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, th: { translation: th } },
  lng: deviceLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false }, // React already escapes
});

// Month and day names in react-native-calendars follow the app language.
LocaleConfig.locales.th = {
  monthNames: [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
  ],
  monthNamesShort: [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
  ],
  dayNames: ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"],
  dayNamesShort: ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."],
  today: "วันนี้",
};
LocaleConfig.locales.en = LocaleConfig.locales[""];
const applyCalendarLocale = (language: string) => {
  LocaleConfig.defaultLocale = language === "th" ? "th" : "en";
};
applyCalendarLocale(i18n.language);
i18n.on("languageChanged", applyCalendarLocale);

// SecureStore has no web implementation; the browser keeps it in localStorage.
async function readPreference(): Promise<string | null> {
  try {
    if (Platform.OS === "web") return globalThis.localStorage?.getItem(PREFERENCE_KEY) ?? null;
    return await SecureStore.getItemAsync(PREFERENCE_KEY);
  } catch {
    return null;
  }
}

async function writePreference(value: LanguagePreference) {
  try {
    if (Platform.OS === "web") globalThis.localStorage?.setItem(PREFERENCE_KEY, value);
    else await SecureStore.setItemAsync(PREFERENCE_KEY, value);
  } catch {
    // Not saved; the choice still applies until the app restarts.
  }
}

function resolve(preference: LanguagePreference): Language {
  return preference === "system" ? deviceLanguage() : preference;
}

let currentPreference: LanguagePreference = "system";

/** Apply the saved choice; call once before the first screen renders. */
export async function loadLanguagePreference() {
  const saved = await readPreference();
  currentPreference = saved === "en" || saved === "th" ? saved : "system";
  await i18n.changeLanguage(resolve(currentPreference));
}

export function getLanguagePreference(): LanguagePreference {
  return currentPreference;
}

export async function setLanguagePreference(preference: LanguagePreference) {
  currentPreference = preference;
  await writePreference(preference);
  await i18n.changeLanguage(resolve(preference));
}

export function currentLanguage(): Language {
  return i18n.language === "th" ? "th" : "en";
}

/** date-fns locale for the current language: format(date, "PP", { locale: dateLocale() }). */
export function dateLocale(): Locale {
  return currentLanguage() === "th" ? thLocale : enUS;
}

export { useTranslation };
export default i18n;
