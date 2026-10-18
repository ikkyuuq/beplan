import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "@/i18n";
import { categoryLabel } from "@/i18n/format";
import { categoryStyle } from "@/constants/categories";

// ====================== Type Definitions ======================
type CategoryPickerProps = {
  value: string;
  onChange: (value: string) => void;
  categories: string[];
};

type IoniconsName = keyof typeof Ionicons.glyphMap;

// ====================== Main Component ======================
export default function CategoryPicker({
  value,
  onChange,
  categories,
}: CategoryPickerProps) {
  const { t } = useTranslation();

  // ====================== State Management ======================
  const [modalVisible, setModalVisible] = useState(false);


  // ====================== Handlers ======================
  const handleOpenModal = () => {
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
  };

  const handleSelectCategory = (category: string) => {
    onChange(category);
    setModalVisible(false);
  };

  // ====================== Render UI ======================
  return (
    <View>
      {/* Custom Dropdown Trigger */}
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={handleOpenModal}
        activeOpacity={0.7}
      >
        <View style={styles.selectedCategory}>
          <View
            style={[
              styles.categoryIcon,
              { backgroundColor: categoryStyle(value).color },
            ]}
          >
            <Ionicons name={categoryStyle(value).icon} size={18} color="#fff" />
          </View>
          <Text style={styles.selectedCategoryText}>{categoryLabel(value)}</Text>
        </View>
        <Ionicons
          name={"chevron-down" as IoniconsName}
          size={22}
          color="#8B98D5"
        />
      </TouchableOpacity>

      {/* Custom Dropdown Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <Pressable style={styles.modalOverlay} onPress={handleCloseModal}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("template.selectCategory")}</Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Ionicons
                  name={"close" as IoniconsName}
                  size={24}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>

            {/* Categories List */}
            <FlatList
              data={categories}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.categoryItem,
                    value === item && styles.selectedItem,
                  ]}
                  onPress={() => handleSelectCategory(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.categoryContent}>
                    <View
                      style={[
                        styles.categoryIconLarge,
                        { backgroundColor: categoryStyle(item).color },
                      ]}
                    >
                      <Ionicons
                        name={categoryStyle(item).icon}
                        size={22}
                        color="#fff"
                      />
                    </View>
                    <Text style={styles.categoryText}>{categoryLabel(item)}</Text>
                  </View>
                  {value === item && (
                    <Ionicons
                      name={"checkmark" as IoniconsName}
                      size={22}
                      color="#4F46E5"
                    />
                  )}
                </TouchableOpacity>
              )}
              style={styles.categoryList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ====================== Styles ======================
const styles = StyleSheet.create({
  // Picker Button Styles
  pickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#2A2C3A",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3A3F55",
  },
  selectedCategory: {
    flexDirection: "row",
    alignItems: "center",
  },
  selectedCategoryText: {
    fontSize: 16,
    color: "#fff",
    marginLeft: 10,
  },
  categoryIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "85%",
    maxHeight: "70%",
    backgroundColor: "#1E1F29",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#3A3F55",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#3A3F55",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },

  // Category List Styles
  categoryList: {
    padding: 8,
  },
  categoryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginVertical: 4,
  },
  selectedItem: {
    backgroundColor: "rgba(79, 70, 229, 0.15)",
  },
  categoryContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryIconLarge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  categoryText: {
    fontSize: 16,
    color: "#fff",
  },
});
