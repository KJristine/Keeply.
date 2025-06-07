import { db } from "@/config/firebase";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import React, { useRef } from "react";
import {
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import sanitizeHtml from 'sanitize-html';

const { width } = Dimensions.get("window");

interface Budget {
  totalBudget: number;
  totalSpent: number;
  monthlyBudget: number;
}

interface Category {
  id: string;
  name: string;
  color: string;
  budget: number;
  icon: string;
}

interface SettingsProps {
  budget: Budget;
  categories: Category[];
  monthlyBudgetInput: string;
  setMonthlyBudgetInput: (value: string) => void;
  onUpdateBudget: () => void;
  onOpenCategoryModal: () => void;
  onEditCategory: (category: Category) => void;
  userId: string;
  expenses: any[];
  debts: any[];
}

export const Settings: React.FC<SettingsProps> = ({
  budget,
  categories,
  monthlyBudgetInput,
  setMonthlyBudgetInput,
  onUpdateBudget,
  onOpenCategoryModal,
  onEditCategory,
  userId,
  expenses,
  debts,
}) => {
  // Add refs to store swipeable references
  const swipeableRefs = useRef<{ [key: string]: Swipeable | null }>({});

  // Function to close all swipeables
  const closeAllSwipeables = () => {
    Object.values(swipeableRefs.current).forEach((swipeable) => {
      if (swipeable) {
        swipeable.close();
      }
    });
  };

  // --- Sanitize the input before updating state ---
  const handleMonthlyBudgetChange = (text: string) => {
    const sanitizedText = sanitizeHtml(text, {
      allowedTags: [], // No HTML tags allowed
      allowedAttributes: {}, // No attributes allowed
    });

    setMonthlyBudgetInput(sanitizedText); // Update the state with sanitized input
  };

  // Modified Delete Category Function
  const handleDeleteCategory = async (category: Category) => {
    Alert.alert(
      "Delete Category",
      `Are you sure you want to delete "${category.name}"? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            // Close the swipeable when cancelled
            if (swipeableRefs.current[category.id]) {
              swipeableRefs.current[category.id]?.close();
            }
          },
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "categories", category.id));
              Alert.alert("Success", "Category deleted successfully!");
              // Close all swipeables after successful deletion
              closeAllSwipeables();
            } catch (error) {
              console.error("Error deleting category:", error);
              Alert.alert("Error", "Failed to delete category");
            }
          },
        },
      ]
    );
  };

  // Modified Edit Category Function
  const handleEditCategory = (category: Category) => {
    // Close the swipeable first
    if (swipeableRefs.current[category.id]) {
      swipeableRefs.current[category.id]?.close();
    }
    // Close all other swipeables as well
    closeAllSwipeables();
    // Then call the edit function
    onEditCategory(category);
  };

  // Convert data to CSV format
  const convertToCSV = (data: any[], headers: string[]) => {
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header] || "";
            // Escape commas and quotes in CSV
            if (
              typeof value === "string" &&
              (value.includes(",") || value.includes('"'))
            ) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(",")
      ),
    ].join("\n");

    return csvContent;
  };

  // Export Data Function with Real Implementation
  const handleExportData = async () => {
    try {
      Alert.alert(
        "Export Data",
        "Choose export format for your financial data:",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "CSV Format",
            onPress: () => exportToCSV(),
          },
          {
            text: "JSON Format",
            onPress: () => exportToJSON(),
          },
        ]
      );
    } catch (error) {
      console.error("Error in export menu:", error);
      Alert.alert("Error", "Failed to show export options");
    }
  };

  const exportToCSV = async () => {
    try {
      const timestamp = new Date().toISOString().split("T")[0];

      // Prepare expenses data with PHP currency
      const expensesData = expenses.map((expense) => ({
        Date:
          expense.date instanceof Date
            ? expense.date.toISOString().split("T")[0]
            : new Date(expense.date).toISOString().split("T")[0],
        Type: expense.type,
        Amount: `₱${expense.amount}`,
        Category: expense.category,
        Description: expense.description,
      }));

      // Prepare categories data with PHP currency
      const categoriesData = categories.map((category) => ({
        Name: category.name,
        Budget: `₱${category.budget}`,
        Color: category.color,
        Icon: category.icon,
      }));

      // Prepare debts data with PHP currency
      const debtsData = debts.map((debt) => ({
        Date:
          debt.date instanceof Date
            ? debt.date.toISOString().split("T")[0]
            : new Date(debt.date).toISOString().split("T")[0],
        Person: debt.personName,
        Amount: `₱${debt.amount}`,
        Type: debt.type,
        Status: debt.status,
        Description: debt.description,
      }));

      // Prepare budget data with PHP currency
      const budgetData = [
        {
          MonthlyBudget: `₱${budget.monthlyBudget}`,
          TotalBudget: `₱${budget.totalBudget}`,
          TotalSpent: `₱${budget.totalSpent}`,
          ExportDate: timestamp,
        },
      ];

      // Create CSV content
      let csvContent = "KEEPLY FINANCIAL DATA EXPORT\n";
      csvContent += `Export Date: ${timestamp}\n\n`;

      csvContent += "=== EXPENSES ===\n";
      csvContent += convertToCSV(expensesData, [
        "Date",
        "Type",
        "Amount",
        "Category",
        "Description",
      ]);

      csvContent += "\n\n=== CATEGORIES ===\n";
      csvContent += convertToCSV(categoriesData, [
        "Name",
        "Budget",
        "Color",
        "Icon",
      ]);

      csvContent += "\n\n=== DEBTS ===\n";
      csvContent += convertToCSV(debtsData, [
        "Date",
        "Person",
        "Amount",
        "Type",
        "Status",
        "Description",
      ]);

      csvContent += "\n\n=== BUDGET ===\n";
      csvContent += convertToCSV(budgetData, [
        "MonthlyBudget",
        "TotalBudget",
        "TotalSpent",
        "ExportDate",
      ]);

      // Save and share file
      const fileName = `Keeply_Export_${timestamp}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/csv",
          dialogTitle: "Export Keeply Data",
        });
      } else {
        Alert.alert("Export Completed", `Data exported to: ${fileName}`, [
          { text: "OK" },
        ]);
      }

      Alert.alert("Success", "Data exported successfully!");
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      Alert.alert("Error", "Failed to export data to CSV");
    }
  };

  const exportToJSON = async () => {
    try {
      const timestamp = new Date().toISOString().split("T")[0];

      const exportData = {
        exportInfo: {
          app: "Keeply",
          version: "1.0.0",
          exportDate: timestamp,
          userId: userId,
          currency: "PHP",
        },
        expenses: expenses.map((expense) => ({
          ...expense,
          date:
            expense.date instanceof Date
              ? expense.date.toISOString()
              : expense.date,
        })),
        categories: categories,
        debts: debts.map((debt) => ({
          ...debt,
          date: debt.date instanceof Date ? debt.date.toISOString() : debt.date,
        })),
        budget: budget,
      };

      const jsonContent = JSON.stringify(exportData, null, 2);
      const fileName = `Keeply_Export_${timestamp}.json`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, jsonContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/json",
          dialogTitle: "Export Keeply Data",
        });
      } else {
        Alert.alert("Export Completed", `Data exported to: ${fileName}`, [
          { text: "OK" },
        ]);
      }

      Alert.alert("Success", "Data exported successfully!");
    } catch (error) {
      console.error("Error exporting to JSON:", error);
      Alert.alert("Error", "Failed to export data to JSON");
    }
  };

  // Clear All Data Function with Real Implementation
  const handleClearAllData = () => {
    Alert.alert(
      "⚠️ Clear All Data",
      "This will permanently delete ALL your expenses, categories, debts, and budget settings. This action cannot be undone!",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Final Confirmation",
              "Are you absolutely sure? This will delete everything!",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete Everything",
                  style: "destructive",
                  onPress: clearAllUserData,
                },
              ]
            );
          },
        },
      ]
    );
  };

  const clearAllUserData = async () => {
    try {
      if (!userId) {
        Alert.alert("Error", "User not authenticated");
        return;
      }

      // Create a batch for efficient deletion
      const batch = writeBatch(db);

      // Delete all expenses
      const expensesQuery = query(
        collection(db, "expenses"),
        where("userId", "==", userId)
      );
      const expensesSnapshot = await getDocs(expensesQuery);
      expensesSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Delete all categories
      const categoriesQuery = query(
        collection(db, "categories"),
        where("userId", "==", userId)
      );
      const categoriesSnapshot = await getDocs(categoriesQuery);
      categoriesSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Delete all debts
      const debtsQuery = query(
        collection(db, "debts"),
        where("userId", "==", userId)
      );
      const debtsSnapshot = await getDocs(debtsQuery);
      debtsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Reset budget
      const budgetRef = doc(db, "budgets", userId);
      batch.set(budgetRef, {
        totalBudget: 0,
        totalSpent: 0,
        monthlyBudget: 0,
      });

      // Execute all deletions
      await batch.commit();

      Alert.alert(
        "✅ Data Cleared",
        "All your data has been successfully deleted. The app will restart with default settings.",
        [
          {
            text: "OK",
            onPress: () => {
              console.log("Data cleared successfully");
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error clearing all data:", error);
      Alert.alert(
        "Error",
        "Failed to clear all data. Please try again or contact support."
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      {/* Monthly Budget Setting */}
      <View style={styles.settingSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="wallet-outline" size={24} color="#F76A86" />
          <Text style={styles.settingTitle}>Monthly Budget</Text>
        </View>
        <Text style={styles.settingDescription}>
          Set your monthly spending limit to track your expenses better.
        </Text>
        <View style={styles.settingRow}>
          <TextInput
            style={styles.settingInput}
            value={monthlyBudgetInput}
            onChangeText={handleMonthlyBudgetChange} // <-- Use the sanitized input handler
            placeholder="Enter your monthly budget (e.g., 50000)"
            keyboardType="decimal-pad"
          />
          <TouchableOpacity
            style={styles.settingButton}
            onPress={onUpdateBudget}
          >
            <Text style={styles.settingButtonText}>Update</Text>
          </TouchableOpacity>
        </View>
        {budget.monthlyBudget > 0 && (
          <View style={styles.budgetInfo}>
            <Text style={styles.budgetInfoText}>
              Current Budget: ₱{budget.monthlyBudget.toFixed(2)}
            </Text>
          </View>
        )}
      </View>

      {/* Categories Management */}
      <View style={styles.settingSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="grid-outline" size={24} color="#F76A86" />
          <Text style={styles.settingTitle}>Categories</Text>
        </View>
        <Text style={styles.settingDescription}>
          Customize your expense categories and set individual budgets. Swipe
          left to edit or delete.
        </Text>

        <TouchableOpacity
          style={styles.addButton}
          onPress={onOpenCategoryModal}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add New Category</Text>
        </TouchableOpacity>

        <View style={styles.categoriesHeader}>
          <Text style={styles.categoriesTitle}>
            Your Categories ({categories.length})
          </Text>
        </View>

        {/* Swipeable Category List */}
        <View style={styles.categoryList}>
          {categories.map((category) => (
            <Swipeable
              key={category.id}
              ref={(ref) => {
                swipeableRefs.current[category.id] = ref;
              }}
              onSwipeableOpen={() => {
                // Close other swipeables when one opens
                Object.keys(swipeableRefs.current).forEach((categoryId) => {
                  if (
                    categoryId !== category.id &&
                    swipeableRefs.current[categoryId]
                  ) {
                    swipeableRefs.current[categoryId]?.close();
                  }
                });
              }}
              renderRightActions={() => (
                <View style={styles.swipeActionsContainer}>
                  <TouchableOpacity
                    style={[styles.swipeAction, styles.editAction]}
                    onPress={() => handleEditCategory(category)}
                  >
                    <Ionicons name="create-outline" size={20} color="#fff" />
                    <Text style={styles.swipeActionText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.swipeAction, styles.deleteAction]}
                    onPress={() => handleDeleteCategory(category)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#fff" />
                    <Text style={styles.swipeActionText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
            >
              <View style={styles.categoryListItem}>
                <View style={styles.categoryItemLeft}>
                  <View
                    style={[
                      styles.categoryIcon,
                      { backgroundColor: category.color },
                    ]}
                  >
                    <Ionicons
                      name={category.icon as any}
                      size={20}
                      color="white"
                    />
                  </View>
                  <View style={styles.categoryItemDetails}>
                    <Text style={styles.categoryItemName}>{category.name}</Text>
                    <Text style={styles.categoryItemBudget}>
                      Budget: ₱{category.budget.toFixed(2)}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#999" />
              </View>
            </Swipeable>
          ))}
        </View>
      </View>

      {/* Data Management */}
      <View style={styles.settingSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="server-outline" size={24} color="#F76A86" />
          <Text style={styles.settingTitle}>Data Management</Text>
        </View>
        <Text style={styles.settingDescription}>
          Export your data in CSV or JSON format, or clear all information from
          the app.
        </Text>

        <TouchableOpacity
          style={styles.exportButton}
          onPress={handleExportData}
        >
          <Ionicons name="download-outline" size={20} color="#4CAF50" />
          <Text style={styles.exportButtonText}>Export Data</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClearAllData}
        >
          <Ionicons name="warning-outline" size={20} color="#fff" />
          <Text style={styles.clearButtonText}>Clear All Data</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Settings;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 20,
  },
  settingSection: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginLeft: 12,
  },
  settingDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
    lineHeight: 20,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  settingInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#f8f9fa",
  },
  settingButton: {
    backgroundColor: "#F76A86",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
    minWidth: 80,
  },
  settingButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  budgetInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#E8F5E8",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  budgetInfoText: {
    fontSize: 14,
    color: "#2E7D32",
    fontWeight: "500",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F76A86",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  categoriesHeader: {
    marginBottom: 12,
  },
  categoriesTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  categoryList: {
    gap: 8,
  },
  categoryListItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#333",
    height: 60,
  },
  categoryItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryItemDetails: {
    marginLeft: 12,
    flex: 1,
  },
  categoryItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  categoryItemBudget: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  swipeActionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  swipeAction: {
    width: width * 0.2,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  editAction: {
    backgroundColor: "#4CAF50",
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderLeftWidth: 0,
    borderColor: "#333",
  },
  deleteAction: {
    backgroundColor: "#F76A86",
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderLeftWidth: 0,
    borderColor: "#333",
  },
  swipeActionText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#4CAF50",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  exportButtonText: {
    color: "#4CAF50",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6B6B",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  clearButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
});
