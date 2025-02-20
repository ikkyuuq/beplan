import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import Modal from "react-native-modal";
import { Template } from "@/types/templateTypes";
import { Ionicons } from "@expo/vector-icons";

type TemplateModalProps = {
  visible: boolean;
  template: Template | null;
  onClose: () => void;
  onSelect: () => void;
};

export default function TemplateModal({
  visible,
  template,
  onClose,
  onSelect,
}: TemplateModalProps) {
  const [isClosing, setIsClosing] = useState(false); // State ควบคุม Animation ปิด

  if (!template) return null;

  const handleClose = () => {
    setIsClosing(true); 
    setTimeout(() => {
      setIsClosing(false);
      onClose(); // 
    }, 300); 
  };

  return (
    <Modal
      isVisible={visible && !isClosing} // ซ่อน Modal ชั่วคราวตอนปิด
      animationIn="zoomIn"
      animationOut="zoomOut"
      useNativeDriver={true}
      style={{ margin: 0 }}
    >
      <View style={styles.container}>
        {/* รูป Role Model */}
        <Image source={{ uri: template.image }} style={styles.image} />

        {/* ข้อมูล Role Model */}
        <Text style={styles.title}>{template.title}</Text>
        <Text style={styles.category}>{template.category}</Text>

        {/* Description */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionTitle}>Description</Text>
          <ScrollView>
            <Text style={styles.description}>{template.description}</Text>
          </ScrollView>
        </View>

        {/* ปุ่มเลือกและปิด */}
        <View style={styles.buttonContainer}>
          {/* ปุ่ม Close (อยู่ซ้าย) */}
          <Pressable style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close-circle" size={40} color="red" />
            <Text style={styles.closeText}>Close</Text>
          </Pressable>

          {/* ปุ่ม Select (อยู่ขวา) */}
          <Pressable style={styles.selectButton} onPress={onSelect}>
            <Ionicons name="checkmark-circle" size={40} color="green" />
            <Text style={styles.selectText}>Select</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 50,
  },

  // Header Section (Close Button & Image)
  header: {
    width: "100%",
  },
  image: {
    width: "90%",
    height: 200,
    borderRadius: 15,
    marginTop: 20,
    marginBottom: 20,
    alignSelf: "center",
  },

  // Title & Category Section
  titleContainer: {
    width: "90%",
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "left",
  },
  category: {
    fontSize: 18,
    color: "#777",
    marginBottom: 10,
    textAlign: "left",
  },

  // Description Section
  descriptionContainer: {
    width: "90%",
    maxHeight: 330,
  },
  descriptionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "left",
  },
  description: {
    fontSize: 16,
    textAlign: "left",
    paddingHorizontal: 10,
  },

  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "90%",
    marginTop: 20,
  },

  // ✅ ปุ่ม Select
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#32CD324D",
    padding: 15,
    borderRadius: 10,
    flex: 1,
    marginLeft: 10,
  },
  selectText: {
    marginLeft: 10,
    fontSize: 18,
    color: "green",
  },
  // ✅ ปุ่ม Close (สีแดงจางๆ)
  closeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF63474D",
    padding: 15,
    borderRadius: 10,
    flex: 1,
    marginRight: 10,
  },
  closeText: {
    marginLeft: 10,
    fontSize: 18,
    color: "red",
  },
});
