import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";

// Import the decryption function from your AddExpenseForm
import { decryptData } from './AddExpenseForm'; // Adjust the path as needed

const { width, height } = Dimensions.get("window");

interface Category {
  id: string;
  name: string;
  color: string;
  budget: number;
  icon: string;
}

interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string; // This will be encrypted when fetched from database
  date: Date;
  type: "expense" | "income";
}

interface DecryptedExpense extends Omit<Expense, 'description'> {
  description: string; // This will be the decrypted description
  decryptionError?: boolean; // Flag to handle decryption errors
}

interface ExpenseListProps {
  expenses: Expense[];
  categories: Category[];
  title: string;
  showDate?: boolean;
  limit?: number;
  onEditExpense?: (expense: Expense) => void;
  onDeleteExpense?: (expenseId: string) => void;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  categories,
  title,
  showDate = false,
  limit,
  onEditExpense,
  onDeleteExpense,
}) => {
  const [decryptedExpenses, setDecryptedExpenses] = useState<DecryptedExpense[]>([]);
  const [isDecrypting, setIsDecrypting] = useState(false);

  // Function to check if data appears to be encrypted
  const isEncryptedFormat = (data: string): boolean => {
    if (!data || typeof data !== 'string') return false;
    
    // Check if it contains the IV:encrypted format
    const parts = data.split(':');
    if (parts.length !== 2) return false;
    
    // Check if IV part is 16 characters (as per your IV_LENGTH)
    const [iv, encrypted] = parts;
    return iv.length === 16 && encrypted.length > 0;
  };

  // Function to decrypt all expenses
  const decryptExpenses = async (expensesToDecrypt: Expense[]) => {
    setIsDecrypting(true);
    
    const decrypted = await Promise.all(
      expensesToDecrypt.map(async (expense) => {
        try {
          // Check if the description appears to be encrypted
          if (isEncryptedFormat(expense.description)) {
            // Try to decrypt the description
            const decryptedDescription = await decryptData(expense.description);
            
            return {
              ...expense,
              description: decryptedDescription,
              decryptionError: false,
            };
          } else {
            // Data is likely plain text (legacy data or unencrypted)
            return {
              ...expense,
              description: expense.description,
              decryptionError: false,
            };
          }
        } catch (error) {
          console.warn(`Failed to decrypt description for expense ${expense.id}:`, error);
          
          // If decryption fails, try to determine if it was supposed to be encrypted
          if (isEncryptedFormat(expense.description)) {
            // This was supposed to be encrypted but failed to decrypt
            return {
              ...expense,
              description: '[Decryption Failed]',
              decryptionError: true,
            };
          } else {
            // This is likely plain text data, so use it as-is
            return {
              ...expense,
              description: expense.description || '[No Description]',
              decryptionError: false,
            };
          }
        }
      })
    );
    
    setDecryptedExpenses(decrypted);
    setIsDecrypting(false);
  };

  // Decrypt expenses when the expenses prop changes
  useEffect(() => {
    if (expenses.length > 0) {
      decryptExpenses(expenses);
    } else {
      setDecryptedExpenses([]);
    }
  }, [expenses]);

  const displayedExpenses = limit ? decryptedExpenses.slice(0, limit) : decryptedExpenses;

  const renderRightActions = (
    expense: DecryptedExpense,
    progress: Animated.AnimatedAddition<number>,
    dragX: Animated.AnimatedAddition<number>
  ) => {
    const trans = dragX.interpolate({
      inputRange: [-200, -100, -50, 0],
      outputRange: [0, 50, 75, 100],
      extrapolate: "clamp",
    });

    const editScale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    const deleteScale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    return (
      <View style={styles.rightActions}>
        <Animated.View
          style={[
            styles.actionButton,
            styles.editButton,
            { transform: [{ translateX: trans }, { scale: editScale }] },
          ]}
        >
          <TouchableOpacity
            style={styles.actionButtonInner}
            onPress={() => onEditExpense?.(expense as Expense)}
          >
            <Ionicons name="pencil" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          style={[
            styles.actionButton,
            styles.deleteButton,
            { transform: [{ translateX: trans }, { scale: deleteScale }] },
          ]}
        >
          <TouchableOpacity
            style={styles.actionButtonInner}
            onPress={() => onDeleteExpense?.(expense.id)}
          >
            <Ionicons name="trash" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  const renderExpenseItem = (expense: DecryptedExpense) => {
    const ExpenseContent = () => (
      <View style={styles.expenseItem}>
        <View style={styles.expenseLeft}>
          <View
            style={[
              styles.categoryIcon,
              {
                backgroundColor:
                  categories.find((c) => c.name === expense.category)?.color ||
                  "#ccc",
              },
            ]}
          >
            <Ionicons
              name={
                (categories.find((c) => c.name === expense.category)
                  ?.icon as any) || "folder"
              }
              size={20}
              color="white"
            />
          </View>
          <View style={styles.expenseDetails}>
            <View style={styles.descriptionContainer}>
              <Text 
                style={[
                  styles.expenseDescription,
                  expense.decryptionError && styles.encryptedText
                ]}
              >
                {expense.description}
              </Text>
              {expense.decryptionError && (
                <Ionicons 
                  name="warning" 
                  size={12} 
                  color="#FF6B6B" 
                  style={styles.lockIcon}
                />
              )}
            </View>
            <Text style={styles.expenseCategory}>{expense.category}</Text>
            {showDate && (
              <Text style={styles.expenseDate}>
                {new Date(expense.date).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>
        <Text
          style={[
            styles.expenseAmount,
            {
              color: expense.type === "expense" ? "#FF6B6B" : "#4ECDC4",
            },
          ]}
        >
          {expense.type === "expense" ? "-" : "+"}₱{expense.amount.toFixed(2)}
        </Text>
      </View>
    );

    // Only wrap with Swipeable if edit/delete handlers are provided
    if (onEditExpense || onDeleteExpense) {
      return (
        <Swipeable
          key={expense.id}
          renderRightActions={(progress, dragX) =>
            renderRightActions(expense, progress, dragX)
          }
          rightThreshold={40}
        >
          <ExpenseContent />
        </Swipeable>
      );
    }

    return <ExpenseContent key={expense.id} />;
  };

  // Show loading state while decrypting
  if (isDecrypting && expenses.length > 0) {
    return (
      <View style={styles.recentExpenses}>
        {title && <Text style={styles.cardTitle}>{title}</Text>}
        <View style={styles.loadingState}>
          <Ionicons name="lock-open-outline" size={48} color="#ccc" />
          <Text style={styles.loadingStateText}>Decrypting data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.recentExpenses}>
      {title && <Text style={styles.cardTitle}>{title}</Text>}
      {displayedExpenses.length > 0 ? (
        displayedExpenses.map(renderExpenseItem)
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={48} color="#ccc" />
          <Text style={styles.emptyStateText}>
            {title === "Recent Expenses"
              ? "No expenses yet"
              : "No transactions found"}
          </Text>
          <Text style={styles.emptyStateSubtext}>
            {title === "Recent Expenses"
              ? "Add your first expense to get started"
              : "Try adjusting your filters or add new transactions"}
          </Text>
        </View>
      )}
    </View>
  );
};

export default ExpenseList;

const styles = StyleSheet.create({
  recentExpenses: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
  },
  expenseItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    minHeight: 64,
  },
  expenseLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  expenseDetails: {
    flex: 1,
  },
  descriptionContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  encryptedText: {
    color: "#FF6B6B",
    fontStyle: "italic",
  },
  lockIcon: {
    marginLeft: 4,
  },
  expenseCategory: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  expenseDate: {
    fontSize: 11,
    color: "#999",
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingLeft: 20,
  },
  actionButton: {
    justifyContent: "center",
    alignItems: "center",
    width: 75,
    height: "100%",
    marginLeft: 2,
  },
  actionButtonInner: {
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  editButton: {
    backgroundColor: "#4CAF50",
  },
  deleteButton: {
    backgroundColor: "#F44336",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: height * 0.08,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
    marginTop: 12,
    textAlign: "center",
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    maxWidth: width * 0.8,
    lineHeight: 20,
  },
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: height * 0.08,
  },
  loadingStateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginTop: 12,
    textAlign: "center",
  },
});