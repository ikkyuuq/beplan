import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "@/i18n";

// ====================== Constants ======================
const POPULAR_OCCUPATIONS = [
  "None",
  "Software Developer",
  "Teacher",
  "Doctor",
  "Engineer",
  "Designer",
  "Marketing",
  "Sales",
  "Student",
  "Business Owner",
  "Accountant",
  "Artist",
  "Freelancer",
  "Manager",
  "Healthcare Professional",
  "Other",
];

// ====================== Type Definitions ======================
type OccupationSelectorProps = {
  value: string;
  onValueChange: (value: string) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  onCancel: () => void;
};

type OccupationItemProps = {
  item: string;
};

// ====================== Main Component ======================
export default function OccupationSelector({
  value,
  onValueChange,
  onSave,
  isSaving,
  onCancel,
}: OccupationSelectorProps) {
  const { t } = useTranslation();
  // Presets are saved in English; only the label is translated.
  const label = (occupation: string) =>
    t(`occupation.options.${occupation}` as "occupation.options.None", { defaultValue: occupation });

  // ====================== State Management ======================
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOccupation, setSelectedOccupation] = useState(value);
  const [customOccupation, setCustomOccupation] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  // ====================== Effects ======================
  useEffect(() => {
    if (value && !POPULAR_OCCUPATIONS.includes(value)) {
      setCustomOccupation(value);
      setShowCustomInput(true);
    }
  }, [value]);

  // ====================== Handlers ======================
  const handleSelect = (occupation: string) => {
    if (occupation === "Other") {
      setShowCustomInput(true);
      setSelectedOccupation("Other");
    } else if (occupation === "None") {
      setShowCustomInput(false);
      setSelectedOccupation("");
      onValueChange("");
      setModalVisible(false);
    } else {
      setShowCustomInput(false);
      setSelectedOccupation(occupation);
      onValueChange(occupation);
      setModalVisible(false);
    }
  };

  const handleConfirm = () => {
    if (showCustomInput && customOccupation.trim()) {
      onValueChange(customOccupation.trim());
    } else if (selectedOccupation) {
      onValueChange(selectedOccupation);
    }
    setModalVisible(false);
  };

  const handleOpenSelector = () => {
    setSelectedOccupation(value);

    if (value && !POPULAR_OCCUPATIONS.includes(value)) {
      setCustomOccupation(value);
      setShowCustomInput(true);
    } else {
      setShowCustomInput(value === "Other");
    }

    setModalVisible(true);
  };

  // ====================== Render Helper Functions ======================
  const renderOccupationItem = ({ item }: OccupationItemProps) => (
    <TouchableOpacity
      style={[
        styles.occupationItem,
        selectedOccupation === item && styles.selectedItem,
        item === "None" && { backgroundColor: "#F0F0F0" },
      ]}
      onPress={() => handleSelect(item)}
    >
      <Text style={styles.occupationText}>{label(item)}</Text>
      {selectedOccupation === item && (
        <Feather name="check" size={18} color="#4E5A94" />
      )}
    </TouchableOpacity>
  );

  // ====================== Render UI ======================
  return (
    <View>
      {/* Current Selection Display */}
      <TouchableOpacity style={styles.selector} onPress={handleOpenSelector}>
        <Text style={styles.selectorText}>
          {value ? label(value) : t("occupation.placeholder")}
        </Text>
        <Feather name="chevron-down" size={18} color="#555" />
      </TouchableOpacity>

      {/* Occupation Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Keeps Confirm above the keyboard while typing a custom
              occupation; otherwise it's hidden and the text is lost. */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardAvoider}
          >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("occupation.title")}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Feather name="x" size={24} color="#555" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={POPULAR_OCCUPATIONS}
              renderItem={renderOccupationItem}
              keyExtractor={(item) => item}
              style={styles.occupationList}
              showsVerticalScrollIndicator={false}
            />

            {showCustomInput && (
              <View style={styles.customInputContainer}>
                <Text style={styles.customInputLabel}>{t("occupation.customLabel")}</Text>
                <TextInput
                  style={styles.customInput}
                  value={customOccupation}
                  onChangeText={setCustomOccupation}
                  placeholder={t("occupation.customPlaceholder")}
                  placeholderTextColor="#999"
                  maxLength={100}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleConfirm}
                />
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>{t("common.cancel")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirm}
                disabled={showCustomInput && !customOccupation.trim()}
              >
                <Text style={styles.confirmButtonText}>{t("common.confirm")}</Text>
              </TouchableOpacity>
            </View>
          </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Action Buttons for Editing Mode */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={onSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>{t("common.save")}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelActionButton}
          onPress={onCancel}
          disabled={isSaving}
        >
          <Text style={styles.cancelActionButtonText}>{t("common.cancel")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ====================== Styles ======================
const styles = StyleSheet.create({
  // Selector Styles
  selector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FAFAFA",
  },
  selectorText: {
    fontSize: 14,
    color: "#333",
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  keyboardAvoider: {
    width: "100%",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 5,
  },

  // Occupation List Styles
  occupationList: {
    marginBottom: 16,
  },
  occupationItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  selectedItem: {
    backgroundColor: "rgba(78, 90, 148, 0.1)",
  },
  occupationText: {
    fontSize: 16,
    color: "#333",
  },

  // Custom Input Styles
  customInputContainer: {
    marginBottom: 16,
  },
  customInputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#555",
    marginBottom: 8,
  },
  customInput: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#F5F5F5",
  },

  // Modal Action Styles
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  confirmButton: {
    backgroundColor: "#4E5A94",
    borderRadius: 8,
    padding: 12,
    flex: 1,
    alignItems: "center",
    marginLeft: 8,
  },
  confirmButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "500",
  },
  cancelButton: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DDD",
    padding: 12,
    flex: 1,
    alignItems: "center",
    marginRight: 8,
  },
  cancelButtonText: {
    color: "#555",
    fontSize: 16,
    fontWeight: "500",
  },

  // Action Button Styles
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  saveButton: {
    backgroundColor: "#4E5A94",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  saveButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "500",
  },
  cancelActionButton: {
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#DDD",
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
    marginLeft: 8,
  },
  cancelActionButtonText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "500",
  },
});
