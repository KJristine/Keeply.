import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import CryptoJS from 'crypto-js';
import React from "react";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import sanitizeHtml from 'sanitize-html';
import { getUserEncryptionKey } from '../schedules/AddScheduleModal';
const { width, height } = Dimensions.get("window");

// Encryption utilities
const IV_LENGTH = 16;

// Generate a random IV for each encryption
const generateIV = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < IV_LENGTH; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Encrypt sensitive data using the user's unique key
const encryptData = async (data: string): Promise<string> => {
  try {
    const userKey = await getUserEncryptionKey();
    const iv = generateIV();
    
    // Use CryptoJS for encryption instead of react-native-aes-crypto
    const encrypted = CryptoJS.AES.encrypt(data, userKey + iv).toString();

    // Prepend IV to encrypted data (separated by :)
    return `${iv}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw error;
  }
};

// Decrypt sensitive data using the user's unique key
const decryptData = async (encryptedData: string): Promise<string> => {
  try {
    const userKey = await getUserEncryptionKey();
    const [iv, encrypted] = encryptedData.split(':');
    if (!iv || !encrypted) {
      throw new Error('Invalid encrypted data format');
    }

    // Use CryptoJS for decryption
    const bytes = CryptoJS.AES.decrypt(encrypted, userKey + iv);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw error;
  }
};

// Function to sanitize input text
const sanitizeInput = (text: string) => {
  return sanitizeHtml(text, {
    allowedTags: [], // No HTML tags allowed
    allowedAttributes: {}, // No attributes allowed
  });
};

interface Category {
  id: string;
  name: string;
  color: string;
  budget: number;
  icon: string;
}

interface AddExpenseFormProps {
  expenseType: "expense" | "income";
  setExpenseType: (type: "expense" | "income") => void;
  amount: string;
  setAmount: (amount: string) => void;
  selectedCategory: Category | null;
  setSelectedCategory: (category: Category) => void;
  categories: Category[];
  description: string;
  setDescription: (description: string) => void;
  expenseDate: Date;
  setExpenseDate: (date: Date) => void;
  showDatePicker: boolean;
  setShowDatePicker: (show: boolean) => void;
  onAddExpense: (encryptedData?: any) => void;
  onOpenCategoryModal: () => void;
  loading: boolean;
  isEditing?: boolean;
  buttonText?: string;
}

export const AddExpenseForm: React.FC<AddExpenseFormProps> = ({
  expenseType,
  setExpenseType,
  amount,
  setAmount,
  selectedCategory,
  setSelectedCategory,
  categories,
  description,
  setDescription,
  expenseDate,
  setExpenseDate,
  showDatePicker,
  setShowDatePicker,
  onAddExpense,
  onOpenCategoryModal,
  loading,
  isEditing = false,
  buttonText,
}) => {
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setExpenseDate(selectedDate);
    }
  };

  // Enhanced submit handler with selective encryption (only description and type)
const handleEncryptedSubmit = async () => {
  try {
    // Only encrypt description and expenseType
    const encryptedDescription = await encryptData(description.trim());
    
    // Convert amount to number and ensure it's valid
    const numericAmount = parseFloat(amount) || 0;
    
    // Create object with selectively encrypted values
    const encryptedData = {
      expenseType,
      amount: numericAmount, // Convert to number and ensure it's not NaN
      selectedCategory, // Not encrypted - kept as plain object
      description: encryptedDescription, // Encrypted
      date: expenseDate // Not encrypted - kept as Date object
    };
    
    // Pass the data with selective encryption to parent component
    onAddExpense(encryptedData);
    
  } catch (error) {
    console.error('Failed to encrypt expense data:', error);
    // Handle encryption error
    onAddExpense(); // Fall back to original behavior
  }
};

  return (
    <View style={styles.container}>
      {/* Header Gradient */}
      <View
        style={[styles.headerGradient, { backgroundColor: expenseType === "expense" ? "#FF6B6B" : "#4CAF50" }]}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {isEditing ? "Edit Transaction" : "New Transaction"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {expenseType === "expense" ? "Track your spending" : "Record your income"}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Type Selector - Ultra Modern */}
        <View style={styles.typeCard}>
          <Text style={styles.cardTitle}>Transaction Type</Text>
          <View style={styles.typeContainer}>
            <TouchableOpacity
              style={[styles.typePill, expenseType === "expense" && styles.expensePill]}
              onPress={() => setExpenseType("expense")}
            >
              <View
                style={[styles.typeIcon, { backgroundColor: expenseType === "expense" ? "rgba(255,255,255,0.2)" : "#FFF5F5" }]}
              >
                <Ionicons name="trending-down" size={20} color={expenseType === "expense" ? "#fff" : "#FF6B6B"} />
              </View>
              <Text style={[styles.typePillText, expenseType === "expense" && styles.typePillTextActive]}>
                Expense
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typePill, expenseType === "income" && styles.incomePill]}
              onPress={() => setExpenseType("income")}
            >
              <View
                style={[styles.typeIcon, { backgroundColor: expenseType === "income" ? "rgba(255,255,255,0.2)" : "#F1F8E9" }]}
              >
                <Ionicons name="trending-up" size={20} color={expenseType === "income" ? "#fff" : "#4CAF50"} />
              </View>
              <Text style={[styles.typePillText, expenseType === "income" && styles.typePillTextActive]}>
                Income
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Amount - Ultra Beautiful */}
        <View style={styles.amountCard}>
          <Text style={styles.cardTitle}>Amount</Text>
          <View style={styles.amountSection}>
            <View style={styles.amountRow}>
              <Text style={styles.peso}>₱</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={(text) => setAmount(sanitizeInput(text))}  // Apply sanitization
                placeholder="0.00"
                keyboardType="decimal-pad"
                placeholderTextColor="#E0E0E0"
              />
            </View>
            <View style={styles.amountUnderline} />
          </View>
        </View>

        {/* Category - Premium Selection */}
        <View style={styles.categoryCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.cardTitle}>Category</Text>
            <TouchableOpacity style={styles.addBtn} onPress={onOpenCategoryModal}>
              <Ionicons name="add" size={16} color="#F76A86" />
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.categories}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.categoryChip, selectedCategory?.id === category.id && styles.categoryChipSelected]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <View style={[styles.categoryDot, { backgroundColor: category.color }]}>
                    <Ionicons name={category.icon as any} size={16} color="white" />
                  </View>
                  <Text
                    style={[styles.categoryLabel, selectedCategory?.id === category.id && styles.categoryLabelSelected]}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Description - Elegant Input */}
        <View style={styles.inputCard}>
          <Text style={styles.cardTitle}>Description</Text>
          <TextInput
            style={styles.textInput}
            value={description}
            onChangeText={(text) => setDescription(sanitizeInput(text))}  // Apply sanitization
            placeholder="What's this transaction for?"
            placeholderTextColor="#B0BEC5"
            multiline
          />
        </View>

        {/* Date - Beautiful Selector */}
        <View style={styles.inputCard}>
          <Text style={styles.cardTitle}>Date</Text>
          <TouchableOpacity
            style={styles.dateSelector}
            onPress={() => setShowDatePicker(!showDatePicker)}
          >
            <View style={styles.dateContent}>
              <Ionicons name="calendar" size={20} color="#F76A86" />
              <Text style={styles.dateText}>
                {expenseDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#B0BEC5" />
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <View style={styles.datePickerCard}>
            <DateTimePicker
              value={expenseDate}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "calendar"}
              onChange={handleDateChange}
              textColor="#2C3E50"
              accentColor="#F76A86"
              themeVariant="light"
              style={styles.datePickerStyle}
            />
          </View>
        )}

        <View style={styles.spacer} />
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: expenseType === "expense" ? "#F76A86" : "#4CAF50", opacity: loading ? 0.8 : 1 }]}
          onPress={handleEncryptedSubmit}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="white" size="small" />
              <Text style={styles.loadingText}>Processing...</Text>
            </View>
          ) : (
            <View style={styles.submitContent}>
              <Ionicons name={isEditing ? "checkmark-circle" : "add-circle"} size={20} color="white" />
              <Text style={styles.submitText}>
                {buttonText || (isEditing ? "Update Transaction" : "Add Transaction")}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default AddExpenseForm;

export { decryptData, encryptData };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },

  // Header
  headerGradient: {
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "400",
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: -20,
  },

  // Cards
  typeCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  amountCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  categoryCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  inputCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2C3E50",
    marginBottom: 16,
  },

  // Type Selector
  typeContainer: {
    flexDirection: "row",
    gap: 12,
  },
  typePill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#F8F9FA",
    gap: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  expensePill: {
    backgroundColor: "#FF6B6B",
    borderColor: "#FF5252",
  },
  incomePill: {
    backgroundColor: "#4CAF50",
    borderColor: "#43A047",
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  typePillText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  typePillTextActive: {
    color: "#fff",
    fontWeight: "700",
  },

  // Amount Section
  amountSection: {
    alignItems: "center",
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  peso: {
    fontSize: 42,
    fontWeight: "300",
    color: "#34495E",
    marginRight: 8,
  },
  amountInput: {
    fontSize: 56,
    fontWeight: "200",
    color: "#2C3E50",
    textAlign: "center",
    minWidth: 140,
  },
  amountUnderline: {
    width: 200,
    height: 3,
    backgroundColor: "#F76A86",
    marginTop: 12,
    borderRadius: 2,
  },

  // Sections
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFE8EC",
    borderRadius: 16,
    gap: 4,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F76A86",
  },

  // Categories
  categories: {
    flexDirection: "row",
    gap: 12,
  },
  categoryChip: {
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: "#F8F9FA",
    borderWidth: 2,
    borderColor: "transparent",
    minWidth: 90,
  },
  categoryChipSelected: {
    backgroundColor: "#FFE8EC",
    borderColor: "#F76A86",
  },
  categoryDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
    textAlign: "center",
  },
  categoryLabelSelected: {
    color: "#F76A86",
    fontWeight: "700",
  },

  // Inputs
  textInput: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: "#2C3E50",
    borderWidth: 1,
    borderColor: "#E9ECEF",
    minHeight: 60,
    textAlignVertical: "top",
  },
  dateSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  dateContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1, // Add this line to make it take available space
  },
  dateText: {
    fontSize: 16,
    color: "#2C3E50",
    fontWeight: "500",
  },
  datePickerCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    alignItems: "center",
  },
  datePickerStyle: {
    width: "100%",
    backgroundColor: "transparent",
  },
  spacer: {
    height: 20,
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
    backgroundColor: "#fff",
  },
  submitBtn: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  submitContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});