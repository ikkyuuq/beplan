import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useApiFetch } from "@/hooks/useApiFetch";
import { syncTaskReminders } from "@/utils/taskReminder";
import {
  getLanguagePreference,
  LanguagePreference,
  setLanguagePreference,
  useTranslation,
} from "@/i18n";

/** Settings section: follow the phone's language, or always English / Thai. */
export default function LanguageSettings() {
  const { t } = useTranslation();
  const apiFetch = useApiFetch();
  const [preference, setPreference] = useState<LanguagePreference>(getLanguagePreference());

  // Each language is named in itself, so it can be found from either one.
  const options: { value: LanguagePreference; label: string }[] = [
    { value: "system", label: t("language.system") },
    { value: "en", label: "English" },
    { value: "th", label: "ไทย" },
  ];

  const choose = async (value: LanguagePreference) => {
    if (value === preference) return;
    setPreference(value);
    await setLanguagePreference(value);
    // Scheduled reminders were written in the old language.
    await syncTaskReminders(apiFetch);
  };

  return (
    <View style={styles.section}>
      <View style={styles.titleRow}>
        <Feather name="globe" size={20} color="#4E5A94" />
        <Text style={styles.title}>{t("language.title")}</Text>
      </View>
      <View style={styles.options} accessibilityRole="radiogroup">
        {options.map((option) => {
          const selected = option.value === preference;
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => void choose(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
  options: {
    flexDirection: "row",
    gap: 8,
  },
  option: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DDD",
    backgroundColor: "#FAFAFA",
    alignItems: "center",
  },
  optionSelected: {
    backgroundColor: "#4E5A94",
    borderColor: "#4E5A94",
  },
  optionText: {
    fontSize: 14,
    color: "#444",
    fontWeight: "500",
  },
  optionTextSelected: {
    color: "#FFF",
  },
});
