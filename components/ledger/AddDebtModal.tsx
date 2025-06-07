import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Dimensions,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import sanitizeHtml from 'sanitize-html';

const { width, height } = Dimensions.get("window");

// Function to sanitize input text
const sanitizeInput = (text: string) => {
  return sanitizeHtml(text, {
    allowedTags: [], // No HTML tags allowed
    allowedAttributes: {}, // No attributes allowed
  });
};


interface AddDebtModalProps {
  visible: boolean;
  onClose: () => void;
  personName: string;
  setPersonName: (name: string) => void;
  amount: string;
  setAmount: (amount: string) => void;
  description: string;
  setDescription: (description: string) => void;
  debtType: "owed_to_me" | "i_owe";
  setDebtType: (type: "owed_to_me" | "i_owe") => void;
  onAddDebt: () => void;
}

export const AddDebtModal: React.FC<AddDebtModalProps> = ({
  visible,
  onClose,
  personName,
  setPersonName,
  amount,
  setAmount,
  description,
  setDescription,
  debtType,
  setDebtType,
  onAddDebt,
}) => {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Add Debt Record</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.modalScrollContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContentContainer}
        >
          {/* Debt Type Selection */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Debt Type</Text>
            <View style={styles.debtTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.debtTypeButton,
                  debtType === "owed_to_me" && styles.debtTypeButtonActive,
                ]}
                onPress={() => setDebtType("owed_to_me")}
              >
                <Ionicons
                  name="arrow-down-circle"
                  size={20}
                  color={debtType === "owed_to_me" ? "#4CAF50" : "#999"}
                />
                <Text
                  style={[
                    styles.debtTypeText,
                    debtType === "owed_to_me" && styles.debtTypeTextActive,
                  ]}
                >
                  Someone owes me
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.debtTypeButton,
                  debtType === "i_owe" && styles.debtTypeButtonActive,
                ]}
                onPress={() => setDebtType("i_owe")}
              >
                <Ionicons
                  name="arrow-up-circle"
                  size={20}
                  color={debtType === "i_owe" ? "#F44336" : "#999"}
                />
                <Text
                  style={[
                    styles.debtTypeText,
                    debtType === "i_owe" && styles.debtTypeTextActive,
                  ]}
                >
                  I owe someone
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* For personName input */}
          <TextInput
            style={styles.input}
            value={personName}
            onChangeText={(text) => setPersonName(sanitizeInput(text))}  // Apply sanitization
            placeholder="Enter person's name"
            placeholderTextColor="#999"
          />

          {/* For amount input */}
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={(text) => setAmount(sanitizeInput(text))}  // Apply sanitization
            placeholder="0.00"
            placeholderTextColor="#999"
            keyboardType="decimal-pad"
          />

          {/* For description input */}
          <TextInput
            style={[styles.input, styles.descriptionInput]}
            value={description}
            onChangeText={(text) => setDescription(sanitizeInput(text))}  // Apply sanitization
            placeholder="What is this debt for?"
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* Preview */}
          <View style={styles.previewSection}>
            <Text style={styles.sectionTitle}>Preview</Text>
            <View style={styles.previewCard}>
              <View style={styles.previewLeft}>
                <View
                  style={[
                    styles.previewIcon,
                    {
                      backgroundColor:
                        debtType === "owed_to_me" ? "#E8F5E8" : "#FFE8E8",
                    },
                  ]}
                >
                  <Ionicons
                    name={debtType === "owed_to_me" ? "arrow-down" : "arrow-up"}
                    size={16}
                    color={debtType === "owed_to_me" ? "#4CAF50" : "#F44336"}
                  />
                </View>
                <View>
                  <Text style={styles.previewPersonName}>
                    {personName || "Person's Name"}
                  </Text>
                  <Text style={styles.previewDescription}>
                    {description || "Description"}
                  </Text>
                </View>
              </View>
              <Text style={styles.previewAmount}>
                {debtType === "owed_to_me" ? "+" : "-"}₱{amount || "0.00"}  {/* Wrapped in <Text> */}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[
              styles.addButton,
              {
                backgroundColor:
                  debtType === "owed_to_me" ? "#4CAF50" : "#F44336",
              },
              (!personName || !amount || !description) &&
              styles.addButtonDisabled,
            ]}
            onPress={onAddDebt}
            disabled={!personName || !amount || !description}
          >
            <Ionicons name="add-circle" size={20} color="white" />
            <Text style={styles.addButtonText}>Add Debt Record</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default AddDebtModal;

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: StatusBar.currentHeight || 44,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: width * 0.06,
    paddingTop: height * 0.025,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  closeButton: {
    padding: 4,
    width: 32,
  },
  modalTitle: {
    fontSize: width * 0.06,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
    flex: 1,
  },
  headerSpacer: {
    width: 32,
  },
  modalScrollContent: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollContentContainer: {
    paddingBottom: 100,
    paddingTop: 20,
  },
  inputSection: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  debtTypeContainer: {
    flexDirection: "row",
    gap: 12,
  },
  debtTypeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#e9ecef",
    backgroundColor: "#f8f9fa",
  },
  debtTypeButtonActive: {
    borderColor: "#4CAF50",
    backgroundColor: "#E8F5E8",
  },
  debtTypeText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
    fontWeight: "500",
  },
  debtTypeTextActive: {
    color: "#333",
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#333",
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 10,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: "#333",
  },
  descriptionInput: {
    height: 100,
    textAlignVertical: "top",
  },
  previewSection: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  previewCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#e9ecef",
    borderStyle: "dashed",
  },
  previewLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  previewIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  previewPersonName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  previewDescription: {
    fontSize: 14,
    color: "#666",
    maxWidth: width * 0.5,
  },
  previewAmount: {
    fontSize: 18,
    fontWeight: "700",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  addButtonDisabled: {
    backgroundColor: "#ccc",
    elevation: 0,
    shadowOpacity: 0,
  },
  addButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
});
