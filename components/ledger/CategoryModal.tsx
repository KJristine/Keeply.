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

interface CategoryModalProps {
  visible: boolean;
  onClose: () => void;
  newCategoryName: string;
  setNewCategoryName: (name: string) => void;
  newCategoryBudget: string;
  setNewCategoryBudget: (budget: string) => void;
  newCategoryIcon: string;
  setNewCategoryIcon: (icon: string) => void;
  newCategoryColor: string;
  setNewCategoryColor: (color: string) => void;
  onAddCategory: () => void;
  availableIcons: string[];
  availableColors: string[];
  isEditing?: boolean;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  visible,
  onClose,
  newCategoryName,
  setNewCategoryName,
  newCategoryBudget,
  setNewCategoryBudget,
  newCategoryIcon,
  setNewCategoryIcon,
  newCategoryColor,
  setNewCategoryColor,
  onAddCategory,
  availableIcons,
  availableColors,
  isEditing = false,
}) => {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {isEditing ? "Edit Category" : "New Category"}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.modalScrollContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContentContainer}
        >
          {/* Preview Section */}
          <View style={styles.previewSection}>
            <Text style={styles.sectionTitle}>Preview</Text>
            <View style={styles.categoryPreview}>
              <View
                style={[styles.categoryIcon, { backgroundColor: newCategoryColor }]}
              >
                <Ionicons
                  name={newCategoryIcon as any}
                  size={20}
                  color="white"
                />
              </View>
              <View style={styles.previewTextContainer}>
                <Text style={styles.categoryPreviewText}>
                  {newCategoryName || "Category Name"}
                </Text>
                <Text style={styles.categoryPreviewBudget}>
                  Budget: ₱{newCategoryBudget || "0"}
                </Text>
              </View>
            </View>
          </View>

          {/* Category Name */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Category Name</Text>
            <TextInput
              style={styles.input}
              value={newCategoryName}
              onChangeText={(text) => setNewCategoryName(sanitizeInput(text))}  // Apply sanitization
              placeholder="e.g., Groceries, Entertainment"
              placeholderTextColor="#999"
            />
          </View>

          {/* Category Budget */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Monthly Budget</Text>
            <View style={styles.budgetInputContainer}>
              <Text style={styles.currencySymbol}>₱</Text>
              <TextInput
                style={styles.budgetInput}
                value={newCategoryBudget}
                onChangeText={(text) => setNewCategoryBudget(sanitizeInput(text))}  // Apply sanitization
                placeholder="0.00"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Color Selection */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Choose Color</Text>
            <View style={styles.colorGrid}>
              {availableColors.map((color, index) => (
                <TouchableOpacity
                  key={`${color}-${index}`}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    newCategoryColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setNewCategoryColor(color)}
                  activeOpacity={0.7}
                />
              ))}
            </View>
          </View>

          {/* Icon Selection */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Choose Icon</Text>
            <View style={styles.iconGrid}>
              {availableIcons.map((icon, index) => (
                <TouchableOpacity
                  key={`${icon}-${index}`}
                  style={[
                    styles.iconOption,
                    { backgroundColor: newCategoryColor },
                    newCategoryIcon === icon && styles.iconOptionSelected,
                  ]}
                  onPress={() => setNewCategoryIcon(icon)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={icon as any} size={16} color="white" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Bottom Button Container */}
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity
            style={[
              styles.createButton,
              { backgroundColor: newCategoryColor },
              (!newCategoryName || !newCategoryBudget) && styles.createButtonDisabled,
            ]}
            onPress={onAddCategory}
            disabled={!newCategoryName || !newCategoryBudget}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isEditing ? "checkmark-circle" : "add-circle"}
              size={20}
              color="white"
            />
            <Text style={styles.createButtonText}>
              {isEditing ? "Update Category" : "Create Category"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default CategoryModal;

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
    fontSize: width * 0.08,
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
    paddingBottom: 100, // Space for bottom button
  },
  previewSection: {
    backgroundColor: "#fff",
    margin: 12,
    borderRadius: 12,
    padding: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  categoryPreview: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderStyle: "dashed",
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  previewTextContainer: {
    flex: 1,
  },
  categoryPreviewText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  categoryPreviewBudget: {
    fontSize: 12,
    color: "#666",
  },
  inputSection: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    padding: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#f8f9fa",
    color: "#333",
  },
  budgetInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 8,
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginRight: 6,
  },
  budgetInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: "#333",
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    paddingHorizontal: 2,
  },
  colorOption: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorOptionSelected: {
    borderColor: "#333",
    borderWidth: 3,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    paddingHorizontal: 2,
  },
  iconOption: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  iconOptionSelected: {
    borderColor: "#333",
    borderWidth: 3,
  },
  bottomButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  createButtonDisabled: {
    backgroundColor: "#ccc",
    elevation: 0,
    shadowOpacity: 0,
  },
  createButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
});
