import { Budget, Category, Debt, Expense, FilterPeriod } from "@/types/props";
import { Ionicons } from "@expo/vector-icons";
import { User } from "firebase/auth";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import "react-native-get-random-values";
import { SafeAreaView } from "react-native-safe-area-context";

// Firebase imports
import { auth, db } from "@/config/firebase";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

// Component imports
import { AddDebtModal } from "@/components/ledger/AddDebtModal";
import { AddExpenseForm } from "@/components/ledger/AddExpenseForm";
import { BudgetOverview } from "@/components/ledger/BudgetOverview";
import { CategoryModal } from "@/components/ledger/CategoryModal";
import { DebtTracker } from "@/components/ledger/DebtTracker";
import { ExpenseCharts } from "@/components/ledger/ExpenseCharts";
import { ExpenseList } from "@/components/ledger/ExpenseList";
import { FilterControls } from "@/components/ledger/FilterControls";
import { MonthYearPicker } from "@/components/ledger/MonthYearPicker";
import { Settings } from "@/components/ledger/Settings";
import ProfileModal from "@/components/profile/ProfileModal";

const { width, height } = Dimensions.get("window");

const Ledger = () => {
  // User state
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Main states
  const [isProfileModalVisible, setProfileModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "add" | "history" | "budget" | "debts" | "settings"
  >("overview");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [budget, setBudget] = useState<Budget>({
    totalBudget: 0,
    totalSpent: 0,
    monthlyBudget: 0,
  });
  const [loading, setLoading] = useState(false);

  // Add Expense Form States
  const [amount, setAmount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [expenseType, setExpenseType] = useState<"expense" | "income">(
    "expense"
  );

  // Edit Expense States
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isEditExpenseModalVisible, setEditExpenseModalVisible] =
    useState(false);

  // Filter States
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("month");
  const [selectedCategoryFilter, setSelectedCategoryFilter] =
    useState<string>("all");

  // Date Filter States
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isMonthYearPickerVisible, setMonthYearPickerVisible] = useState(false);

  // Category Creation Modal States
  const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryBudget, setNewCategoryBudget] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("folder");
  const [newCategoryColor, setNewCategoryColor] = useState("#FF6B6B");

  // Category Edit States
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Debt Modal States
  const [isDebtModalVisible, setDebtModalVisible] = useState(false);
  const [newDebtPersonName, setNewDebtPersonName] = useState("");
  const [newDebtAmount, setNewDebtAmount] = useState("");
  const [newDebtDescription, setNewDebtDescription] = useState("");
  const [newDebtType, setNewDebtType] = useState<"owed_to_me" | "i_owe">(
    "owed_to_me"
  );

  // Debt History State
  const [showDebtHistory, setShowDebtHistory] = useState(false);

  // Settings States
  const [monthlyBudgetInput, setMonthlyBudgetInput] = useState("0");

  // Swipeable callback state
  const [closeSwipeablesCallback, setCloseSwipeablesCallback] = useState<
    (() => void) | null
  >(null);

  // Icons for Categories
  const availableIcons = [
    "restaurant",
    "car",
    "bag",
    "game-controller",
    "receipt",
    "medical",
    "home",
    "airplane",
    "card",
    "fitness",
    "gift",
    "school",
    "briefcase",
    "heart",
    "musical-notes",
    "camera",
    "book",
    "cafe",
  ];

  // Colors for Categories
  const availableColors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FECA57",
    "#FF9FF3",
    "#A8E6CF",
    "#FFD93D",
    "#6BCF7F",
    "#4D96FF",
    "#9B59B6",
    "#E74C3C",
    "#F39C12",
    "#2ECC71",
    "#3498DB",
    "#9B59B6",
    "#34495E",
    "#95A5A6",
  ];

  // Default Categories - ALL SET TO ZERO
  const defaultCategories = [
    {
      name: "Food",
      color: "#FF6B6B",
      budget: 0,
      icon: "restaurant",
    },
    {
      name: "Transport",
      color: "#4ECDC4",
      budget: 0,
      icon: "car",
    },
    {
      name: "Shopping",
      color: "#45B7D1",
      budget: 0,
      icon: "bag",
    },
    {
      name: "Entertainment",
      color: "#96CEB4",
      budget: 0,
      icon: "game-controller",
    },
    {
      name: "Bills",
      color: "#FECA57",
      budget: 0,
      icon: "receipt",
    },
    {
      name: "Health",
      color: "#FF9FF3",
      budget: 0,
      icon: "medical",
    },
  ];

  // --- FIREBASE LOGIC START ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        await initializeUserData(user.uid);
      } else {
        try {
          const result = await signInAnonymously(auth);
          setUser(result.user);
          await initializeUserData(result.user.uid);
        } catch (error) {
          console.error("Error signing in anonymously:", error);
          Alert.alert("Error", "Failed to initialize user session");
        }
      }
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const initializeUserData = async (userId: string) => {
    try {
      // Categories
      const userCategoriesQuery = query(
        collection(db, "categories"),
        where("userId", "==", userId)
      );
      const unsubscribeCategories = onSnapshot(
        userCategoriesQuery,
        (snapshot) => {
          if (snapshot.empty) {
            createDefaultCategories(userId);
          } else {
            const categoriesData = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as Category[];
            setCategories(categoriesData);
            if (!selectedCategory && categoriesData.length > 0) {
              setSelectedCategory(categoriesData[0]);
            }
          }
        }
      );

      // Expenses
      const userExpensesQuery = query(
        collection(db, "expenses"),
        where("userId", "==", userId),
        orderBy("date", "desc")
      );
      const unsubscribeExpenses = onSnapshot(userExpensesQuery, (snapshot) => {
        const expensesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date.toDate(),
        })) as Expense[];
        setExpenses(expensesData);

        // Update budget totalSpent
        const totalSpent = expensesData
          .filter((exp) => exp.type === "expense")
          .reduce((sum, exp) => sum + exp.amount, 0);

        setBudget((prev) => ({ ...prev, totalSpent }));
      });

      // Debts - FIXED DATA MAPPING
      const userDebtsQuery = query(
        collection(db, "debts"),
        where("userId", "==", userId),
        orderBy("date", "desc")
      );
      const unsubscribeDebts = onSnapshot(userDebtsQuery, (snapshot) => {
        const debtsData = snapshot.docs.map((doc) => {
          const data = doc.data();

          // Ensure all required fields are present with proper types
          const debtItem: Debt = {
            id: doc.id,
            personName: data.personName || "",
            amount: Number(data.amount) || 0,
            description: data.description || "",
            type: data.type || "owed_to_me",
            status: data.status || "active",
            userId: data.userId || userId,
            date: data.date?.toDate() || new Date(),
            settledDate: data.settledDate?.toDate() || null,
          };

          return debtItem;
        });

        setDebts(debtsData);
      });

      // Budget
      await loadUserBudget(userId);

      return () => {
        unsubscribeCategories();
        unsubscribeExpenses();
        unsubscribeDebts();
      };
    } catch (error) {
      console.error("Error initializing user data:", error);
      Alert.alert("Error", "Failed to load user data");
    }
  };

  const createDefaultCategories = async (userId: string) => {
    try {
      const batch = writeBatch(db);
      defaultCategories.forEach((category) => {
        const categoryRef = doc(collection(db, "categories"));
        batch.set(categoryRef, {
          name: category.name,
          color: category.color,
          budget: category.budget, // Will be 0
          icon: category.icon,
          userId,
        });
      });
      await batch.commit();
      console.log("Default categories created successfully");
    } catch (error) {
      console.error("Error creating default categories:", error);
    }
  };

  const loadUserBudget = async (userId: string) => {
    try {
      const budgetDoc = await getDoc(doc(db, "budgets", userId));
      if (budgetDoc.exists()) {
        const budgetData = budgetDoc.data();
        setBudget(budgetData as Budget);
        setMonthlyBudgetInput(budgetData.monthlyBudget?.toString() || "0");
      } else {
        const defaultBudget = {
          totalBudget: 0, // Zero budget by default
          totalSpent: 0,
          monthlyBudget: 0, // Zero monthly budget by default
        };
        await setDoc(doc(db, "budgets", userId), defaultBudget);
        setBudget(defaultBudget);
        setMonthlyBudgetInput("0");
      }
    } catch (error) {
      console.error("Error loading user budget:", error);
    }
  };

const handleAddExpense = async (encryptedData?: any) => {
  if (!user) {
    Alert.alert("Error", "User not authenticated");
    return;
  }

  try {
    setLoading(true);

    if (encryptedData) {
      console.log('Using encrypted data for storage');
      
      if (!encryptedData.amount || !encryptedData.description || !encryptedData.selectedCategory) {
        Alert.alert("Error", "Please fill in all fields");
        return;
      }

      await addDoc(collection(db, "expenses"), {
        amount: encryptedData.amount,
        category: encryptedData.selectedCategory.name,
        description: encryptedData.description,
        date: encryptedData.date,
        type: encryptedData.expenseType,
        userId: user.uid,
        createdAt: new Date().toISOString(),
        isEncrypted: true
      });

      console.log('Encrypted transaction saved successfully');
      
    } else {
      console.log('Using fallback unencrypted data');
      
      if (!amount || !description || !selectedCategory) {
        Alert.alert("Error", "Please fill in all fields");
        return;
      }

      await addDoc(collection(db, "expenses"), {
        amount: parseFloat(amount),
        category: selectedCategory.name,  
        description,
        date: expenseDate, // This will be stored as Timestamp
        type: expenseType,
        userId: user.uid,
        createdAt: new Date().toISOString(),
        isEncrypted: false
      });

      console.log('Unencrypted transaction saved (fallback)');
    }

    // Reset form and navigate back to overview
    setAmount("");
    setDescription("");
    setExpenseDate(new Date());
    setSelectedCategory(null);
    setActiveTab("overview");
    
    Alert.alert("Success", "Transaction added successfully!");
    
  } catch (error) {
    console.error("Error adding expense:", error);
    Alert.alert("Error", "Failed to add transaction. Please try again.");
  } finally {
    setLoading(false);
  }
};


  // Delete Expense from Firebase
  const handleDeleteExpense = async (expenseId: string) => {
    if (!user) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    Alert.alert(
      "Delete Expense",
      "Are you sure you want to delete this transaction?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "expenses", expenseId));
              Alert.alert("Success", "Transaction deleted successfully!");
            } catch (error) {
              console.error("Error deleting expense:", error);
              Alert.alert("Error", "Failed to delete transaction");
            }
          },
        },
      ]
    );
  };

  // Edit Expense Function
  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setAmount(expense.amount.toString());
    setDescription(expense.description);
    setExpenseDate(expense.date);
    setExpenseType(expense.type);

    // Find the category
    const category = categories.find((cat) => cat.name === expense.category);
    if (category) {
      setSelectedCategory(category);
    }

    setEditExpenseModalVisible(true);
  };

  // Update Expense in Firebase
  const updateExpense = async () => {
    if (
      !user ||
      !amount ||
      !description ||
      !selectedCategory ||
      !editingExpense
    ) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      await updateDoc(doc(db, "expenses", editingExpense.id), {
        amount: parseFloat(amount),
        category: selectedCategory.name,
        description,
        date: expenseDate,
        type: expenseType,
      });

      // Reset form
      setAmount("");
      setDescription("");
      setExpenseDate(new Date());
      setExpenseType("expense");
      setEditingExpense(null);
      setEditExpenseModalVisible(false);

      Alert.alert("Success", "Transaction updated successfully!");
    } catch (error) {
      console.error("Error updating expense:", error);
      Alert.alert("Error", "Failed to update transaction");
    } finally {
      setLoading(false);
    }
  };

  // Add Category to Firebase
  const addCategory = async () => {
    if (!user || !newCategoryName || !newCategoryBudget) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      await addDoc(collection(db, "categories"), {
        name: newCategoryName,
        color: newCategoryColor,
        budget: parseFloat(newCategoryBudget),
        icon: newCategoryIcon,
        userId: user.uid,
      });
      setNewCategoryName("");
      setNewCategoryBudget("");
      setNewCategoryIcon("folder");
      setNewCategoryColor("#FF6B6B");
      setCategoryModalVisible(false);
      Alert.alert("Success", "Category added successfully!");
    } catch (error) {
      console.error("Error adding category:", error);
      Alert.alert("Error", "Failed to add category");
    }
  };

  // Edit Category Function
  const editCategory = async () => {
    if (!user || !editingCategory || !newCategoryName || !newCategoryBudget) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      await updateDoc(doc(db, "categories", editingCategory.id), {
        name: newCategoryName,
        color: newCategoryColor,
        budget: parseFloat(newCategoryBudget),
        icon: newCategoryIcon,
      });
      setNewCategoryName("");
      setNewCategoryBudget("");
      setNewCategoryIcon("folder");
      setNewCategoryColor("#FF6B6B");
      setEditingCategory(null);
      setCategoryModalVisible(false);
      Alert.alert("Success", "Category updated successfully!");
    } catch (error) {
      console.error("Error updating category:", error);
      Alert.alert("Error", "Failed to update category");
    }
  };

  // Add Debt to Firebase
  const handleAddDebt = async (encryptedData?: any) => {
  if (!user) {
    Alert.alert("Error", "User not authenticated");
    return;
  }

  try {
    setLoading(true);

    if (encryptedData) {
      console.log('Using encrypted data for storage');
      
      if (!encryptedData.amount || !encryptedData.description) {
        Alert.alert("Error", "Please fill in all fields");
        return;
      }

      await addDoc(collection(db, "debts"), {
        personName: encryptedData.personName,
        amount: encryptedData.amount,
        description: encryptedData.description,
        type: encryptedData.debtType,
        date: new Date(),
        status: "active",
        userId: user.uid,
        createdAt: new Date().toISOString(),
        isEncrypted: true
      });

      console.log('Encrypted transaction saved successfully');
      
    } else {
      console.log('Using fallback unencrypted data');
      
      if (!user || !newDebtPersonName || !newDebtAmount || !newDebtDescription) {
        Alert.alert("Error", "Please fill in all fields");
        return;
      }

      await addDoc(collection(db, "expenses"), {
        personName: newDebtPersonName,
        amount: parseFloat(newDebtAmount), 
        description: newDebtDescription,
        type: newDebtType,
        date: new Date(),
        status: "active",
        userId: user.uid,
        createdAt: new Date().toISOString(),
        isEncrypted: false
      });

      console.log('Unencrypted transaction saved (fallback)');
    }

    // Reset form and navigate back to overview
      setNewDebtPersonName("");
      setNewDebtAmount("");
      setNewDebtDescription("");
      setNewDebtType("owed_to_me");
      setDebtModalVisible(false);
      Alert.alert("Success", "Debt record added successfully!"); 
  } catch (error) {
    console.error("Error adding expense:", error);
    Alert.alert("Error", "Failed to add transaction. Please try again.");
  } finally {
    setLoading(false);
  }
};

  // Settle Debt in Firebase - FIXED WITH settledDate
  const handleSettleDebt = async (debtId: string) => {
    if (!user) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    try {
      await updateDoc(doc(db, "debts", debtId), {
        status: "settled",
        settledDate: new Date(), // Add this line to fix the debt history
      });
      Alert.alert("Success", "Debt marked as settled!");
    } catch (error) {
      console.error("Error settling debt:", error);
      Alert.alert("Error", "Failed to settle debt");
    }
  };

  // Update Budget in Firebase
  const updateBudgetInFirebase = async (newBudget: Budget) => {
    if (!user) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    try {
      await setDoc(doc(db, "budgets", user.uid), newBudget);
    } catch (error) {
      console.error("Error updating budget:", error);
      Alert.alert("Error", "Failed to update budget");
    }
  };

  const updateMonthlyBudget = () => {
    const newBudget = {
      ...budget,
      monthlyBudget: parseFloat(monthlyBudgetInput) || 0,
      totalBudget: parseFloat(monthlyBudgetInput) || 0,
    };

    setBudget(newBudget);
    updateBudgetInFirebase(newBudget);
    Alert.alert("Success", "Monthly budget updated");
  };

  // Filter expenses based on selected period and category
  const getFilteredExpenses = () => {
    const now = new Date();
    let filteredByDate = expenses;

    switch (filterPeriod) {
      case "week":
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredByDate = expenses.filter(
          (exp) => new Date(exp.date) >= oneWeekAgo
        );
        break;
      case "month":
        filteredByDate = expenses.filter((exp) => {
          const expDate = new Date(exp.date);
          return (
            expDate.getMonth() === selectedMonth &&
            expDate.getFullYear() === selectedYear
          );
        });
        break;
      case "year":
        filteredByDate = expenses.filter((exp) => {
          const expDate = new Date(exp.date);
          return expDate.getFullYear() === selectedYear;
        });
        break;
      case "all":
        filteredByDate = expenses;
        break;
      default:
        filteredByDate = expenses;
    }

    if (selectedCategoryFilter === "all") {
      return filteredByDate;
    }

    return filteredByDate.filter(
      (exp) => exp.category === selectedCategoryFilter
    );
  };

  // Date handler functions
  const handleDateSelect = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  // Handle Edit Category
  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryBudget(category.budget.toString());
    setNewCategoryIcon(category.icon);
    setNewCategoryColor(category.color);
    setCategoryModalVisible(true);
  };

  // Reset form function
  const resetExpenseForm = () => {
    setAmount("");
    setDescription("");
    setExpenseDate(new Date());
    setExpenseType("expense");
    setEditingExpense(null);
  };

  // Render functions using components
  const renderOverview = () => {
    const filteredExpenses = getFilteredExpenses();

    // Calculate monthly statistics
    const monthlyExpenses = filteredExpenses.filter(
      (exp) => exp.type === "expense"
    );
    const monthlyIncome = filteredExpenses.filter(
      (exp) => exp.type === "income"
    );
    const totalMonthlySpent = monthlyExpenses.reduce(
      (sum, exp) => sum + exp.amount,
      0
    );
    const totalMonthlyIncome = monthlyIncome.reduce(
      (sum, exp) => sum + exp.amount,
      0
    );

    return (
      <View style={styles.tabContent}>
        {/* Monthly Summary Cards */}
        <View style={styles.monthlySummary}>
          <View style={[styles.summaryCard, styles.expenseCard]}>
            <Ionicons name="trending-down" size={24} color="#FF6B6B" />
            <Text style={styles.summaryAmount}>
              ₱{totalMonthlySpent.toFixed(2)}
            </Text>
            <Text style={styles.summaryLabel}>Expenses</Text>
          </View>

          <View style={[styles.summaryCard, styles.incomeCard]}>
            <Ionicons name="trending-up" size={24} color="#4CAF50" />
            <Text style={styles.summaryAmount}>
              ₱{totalMonthlyIncome.toFixed(2)}
            </Text>
            <Text style={styles.summaryLabel}>Income</Text>
          </View>

          <View style={[styles.summaryCard, styles.balanceCard]}>
            <Ionicons
              name={
                totalMonthlyIncome - totalMonthlySpent >= 0
                  ? "wallet"
                  : "warning"
              }
              size={24}
              color={
                totalMonthlyIncome - totalMonthlySpent >= 0
                  ? "#2196F3"
                  : "#FF9800"
              }
            />
            <Text style={styles.summaryAmount}>
              ₱{(totalMonthlyIncome - totalMonthlySpent).toFixed(2)}
            </Text>
            <Text style={styles.summaryLabel}>Balance</Text>
          </View>
        </View>

        <FilterControls
          filterPeriod={filterPeriod}
          setFilterPeriod={setFilterPeriod}
          selectedCategoryFilter={selectedCategoryFilter}
          setSelectedCategoryFilter={setSelectedCategoryFilter}
          categories={categories}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onMonthYearPress={() => setMonthYearPickerVisible(true)}
          onYearPress={() => setMonthYearPickerVisible(true)}
        />

        <BudgetOverview budget={budget} filterPeriod={filterPeriod} />

        <ExpenseCharts
          filteredExpenses={filteredExpenses}
          categories={categories}
        />

        <ExpenseList
          expenses={filteredExpenses}
          categories={categories}
          title="Recent Expenses"
          limit={5}
          showDate={true}
          onEditExpense={handleEditExpense}
          onDeleteExpense={handleDeleteExpense}
        />
      </View>
    );
  };

  const renderAddExpense = () => (
    <AddExpenseForm
      expenseType={expenseType}
      setExpenseType={setExpenseType}
      amount={amount}
      setAmount={setAmount}
      selectedCategory={selectedCategory}
      setSelectedCategory={setSelectedCategory}
      categories={categories}
      description={description}
      setDescription={setDescription}
      expenseDate={expenseDate}
      setExpenseDate={setExpenseDate}
      showDatePicker={showDatePicker}
      setShowDatePicker={setShowDatePicker}
      onAddExpense={handleAddExpense}
      onOpenCategoryModal={() => {
        setEditingCategory(null);
        setCategoryModalVisible(true);
      }}
      loading={loading}
    />
  );

  const renderHistory = () => {
    const filteredExpenses = getFilteredExpenses();

    return (
      <View style={styles.tabContent}>
        <Text style={styles.cardTitle}>Transaction History</Text>

        <FilterControls
          filterPeriod={filterPeriod}
          setFilterPeriod={setFilterPeriod}
          selectedCategoryFilter={selectedCategoryFilter}
          setSelectedCategoryFilter={setSelectedCategoryFilter}
          categories={categories}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onMonthYearPress={() => setMonthYearPickerVisible(true)}
          onYearPress={() => setMonthYearPickerVisible(true)}
        />

        <ExpenseList
          expenses={filteredExpenses}
          categories={categories}
          title=""
          showDate={true}
          onEditExpense={handleEditExpense}
          onDeleteExpense={handleDeleteExpense}
        />
      </View>
    );
  };

  const renderBudget = () => (
    <View style={styles.tabContent}>
      <Text style={styles.cardTitle}>Budget Tracker</Text>

      <FilterControls
        filterPeriod={filterPeriod}
        setFilterPeriod={setFilterPeriod}
        selectedCategoryFilter={selectedCategoryFilter}
        setSelectedCategoryFilter={setSelectedCategoryFilter}
        categories={categories}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onMonthYearPress={() => setMonthYearPickerVisible(true)}
        onYearPress={() => setMonthYearPickerVisible(true)}
      />

      {/* Overall Budget Status */}
      <View style={styles.budgetOverview}>
        <Text style={styles.budgetOverviewTitle}>Monthly Overview</Text>
        <View style={styles.budgetCircle}>
          <Text style={styles.budgetPercentage}>
            {budget.monthlyBudget > 0
              ? ((budget.totalSpent / budget.monthlyBudget) * 100).toFixed(0)
              : "0"}
            %
          </Text>
          <Text style={styles.budgetCircleText}>Used</Text>
        </View>
      </View>

      {/* Category Budgets */}
      <Text style={[styles.cardTitle, { marginTop: 20 }]}>
        Category Budgets
      </Text>
      {categories.map((category) => {
        const spent = expenses
          .filter(
            (exp) => exp.category === category.name && exp.type === "expense"
          )
          .reduce((sum, exp) => sum + exp.amount, 0);
        const percentage =
          category.budget > 0 ? (spent / category.budget) * 100 : 0;

        return (
          <View key={category.id} style={styles.categoryBudgetItem}>
            <View style={styles.categoryBudgetHeader}>
              <View style={styles.categoryBudgetLeft}>
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
                <Text style={styles.categoryBudgetName}>{category.name}</Text>
              </View>
              <Text style={styles.categoryBudgetAmount}>
                ₱{spent.toFixed(2)} / ₱{category.budget.toFixed(2)}
              </Text>
            </View>
            <View style={styles.categoryProgressBar}>
              <View
                style={[
                  styles.categoryProgressFill,
                  {
                    width: `${Math.min(percentage, 100)}%`,
                    backgroundColor:
                      percentage > 90 ? "#FF6B6B" : category.color,
                  },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );

  const renderDebts = () => (
    <View style={styles.tabContent}>
      <View style={styles.debtHeader}>
        <Text style={styles.cardTitle}>Debt Tracker</Text>
        <TouchableOpacity
          style={styles.historyToggleButton}
          onPress={() => setShowDebtHistory(!showDebtHistory)}
        >
          <Ionicons
            name={showDebtHistory ? "list" : "time"}
            size={20}
            color="#F76A86"
          />
          <Text style={styles.historyToggleText}>
            {showDebtHistory ? "Active Debts" : "History"}
          </Text>
        </TouchableOpacity>
      </View>

      <DebtTracker
        debts={debts}
        onAddDebt={() => setDebtModalVisible(true)}
        onSettleDebt={handleSettleDebt}
        showHistory={showDebtHistory}
      />
    </View>
  );

  const renderSettings = () => (
    <Settings
      budget={budget}
      categories={categories}
      monthlyBudgetInput={monthlyBudgetInput}
      setMonthlyBudgetInput={setMonthlyBudgetInput}
      onUpdateBudget={updateMonthlyBudget}
      onOpenCategoryModal={() => {
        setEditingCategory(null);
        setCategoryModalVisible(true);
      }}
      onEditCategory={handleEditCategory}
      userId={user?.uid || ""}
      expenses={expenses}
      debts={debts}
    />
  );

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return renderOverview();
      case "add":
        return renderAddExpense();
      case "history":
        return renderHistory();
      case "budget":
        return renderBudget();
      case "debts":
        return renderDebts();
      case "settings":
        return renderSettings();
      default:
        return renderOverview();
    }
  };

  // Show loading screen while initializing
  if (isLoading) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#F76A86" />
        <Text style={{ marginTop: 16, fontSize: 16, color: "#666" }}>
          Initializing your ledger...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: height * 0.12,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.innerContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.appName}>keeply.</Text>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => setProfileModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="person-circle-outline"
                size={width * 0.09}
                color="#F76A86"
              />
            </TouchableOpacity>
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeText}>Ledger</Text>
            </View>
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabNavigation}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[
                { key: "overview", label: "Overview", icon: "home" },
                { key: "add", label: "Add", icon: "add-circle" },
                { key: "history", label: "History", icon: "list" },
                { key: "budget", label: "Budget", icon: "pie-chart" },
                { key: "debts", label: "Debts", icon: "people" },
                { key: "settings", label: "Settings", icon: "settings" },
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tabButton,
                    activeTab === tab.key && styles.tabButtonActive,
                  ]}
                  onPress={() => setActiveTab(tab.key as any)}
                >
                  <Ionicons
                    name={tab.icon as any}
                    size={20}
                    color={activeTab === tab.key ? "#F76A86" : "#999"}
                  />
                  <Text
                    style={[
                      styles.tabButtonText,
                      activeTab === tab.key && styles.tabButtonTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Content */}
          {renderContent()}
        </View>
      </ScrollView>

      {/* Profile Modal */}
      <Modal
        visible={isProfileModalVisible}
        animationType="slide"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <ProfileModal />
        <TouchableOpacity
          style={{
            position: "absolute",
            top: height * 0.05,
            right: width * 0.05,
            zIndex: 10,
            backgroundColor: "#fff",
            borderRadius: 20,
            padding: width * 0.015,
            elevation: 4,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
          }}
          onPress={() => setProfileModalVisible(false)}
        >
          <Ionicons name="close" size={width * 0.07} color="#333" />
        </TouchableOpacity>
      </Modal>

      {/* Edit Expense Modal */}
      <Modal
        visible={isEditExpenseModalVisible}
        animationType="slide"
        onRequestClose={() => {
          setEditExpenseModalVisible(false);
          resetExpenseForm();
        }}
      >
        <SafeAreaView style={styles.container}>
          <View style={[styles.innerContainer, { paddingTop: height * 0.05 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Transaction</Text>
              <TouchableOpacity
                onPress={() => {
                  setEditExpenseModalVisible(false);
                  resetExpenseForm();
                }}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <AddExpenseForm
              expenseType={expenseType}
              setExpenseType={setExpenseType}
              amount={amount}
              setAmount={setAmount}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              categories={categories}
              description={description}
              setDescription={setDescription}
              expenseDate={expenseDate}
              setExpenseDate={setExpenseDate}
              showDatePicker={showDatePicker}
              setShowDatePicker={setShowDatePicker}
              onAddExpense={updateExpense}
              onOpenCategoryModal={() => {
                setEditingCategory(null);
                setCategoryModalVisible(true);
              }}
              loading={loading}
              isEditing={true}
              buttonText="Update Transaction"
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Category Creation/Edit Modal */}
      <CategoryModal
        visible={isCategoryModalVisible}
        onClose={() => {
          setCategoryModalVisible(false);
          setEditingCategory(null);
          setNewCategoryName("");
          setNewCategoryBudget("");
          setNewCategoryIcon("folder");
          setNewCategoryColor("#FF6B6B");

          // Close all swipeables when modal closes
          if (closeSwipeablesCallback) {
            closeSwipeablesCallback();
          }
        }}
        newCategoryName={newCategoryName}
        setNewCategoryName={setNewCategoryName}
        newCategoryBudget={newCategoryBudget}
        setNewCategoryBudget={setNewCategoryBudget}
        newCategoryIcon={newCategoryIcon}
        setNewCategoryIcon={setNewCategoryIcon}
        newCategoryColor={newCategoryColor}
        setNewCategoryColor={setNewCategoryColor}
        onAddCategory={editingCategory ? editCategory : addCategory}
        availableIcons={availableIcons}
        availableColors={availableColors}
        isEditing={!!editingCategory}
      />

      {/* Add Debt Modal */}
      <AddDebtModal
        visible={isDebtModalVisible}
        onClose={() => setDebtModalVisible(false)}
        personName={newDebtPersonName}
        setPersonName={setNewDebtPersonName}
        amount={newDebtAmount}
        setAmount={setNewDebtAmount}
        description={newDebtDescription}
        setDescription={setNewDebtDescription}
        debtType={newDebtType}
        setDebtType={setNewDebtType}
        onAddDebt={handleAddDebt}
      />

      {/* Month Year Picker Modal */}
      <MonthYearPicker
        visible={isMonthYearPickerVisible}
        onClose={() => setMonthYearPickerVisible(false)}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onDateSelect={handleDateSelect}
      />
    </SafeAreaView>
  );
};

export default Ledger;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: width * 0.06,
    paddingTop: height * 0.025,
  },
  header: {
    marginBottom: height * 0.03,
  },
  profileButton: {
    position: "absolute",
    right: 0,
    top: 0,
    padding: width * 0.01,
    zIndex: 2,
  },
  appName: {
    fontSize: width * 0.08,
    fontWeight: "700",
    color: "#333",
    marginBottom: height * 0.006,
  },
  welcomeContainer: {
    marginTop: height * 0.006,
  },
  welcomeText: {
    fontSize: width * 0.08,
    fontWeight: "900",
    color: "#333",
  },
  tabNavigation: {
    marginBottom: 20,
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
  },
  tabButtonActive: {
    backgroundColor: "#FFE8EC",
  },
  tabButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#999",
    fontWeight: "500",
  },
  tabButtonTextActive: {
    color: "#F76A86",
  },
  tabContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
  },
  monthlySummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  expenseCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#FF6B6B",
  },
  incomeCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  balanceCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#2196F3",
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  budgetOverview: {
    alignItems: "center",
    marginBottom: 20,
  },
  budgetOverviewTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  budgetCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F76A86",
    alignItems: "center",
    justifyContent: "center",
  },
  budgetPercentage: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },
  budgetCircleText: {
    fontSize: 12,
    color: "#fff",
    marginTop: 4,
  },
  categoryBudgetItem: {
    marginBottom: 16,
  },
  categoryBudgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryBudgetLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  categoryBudgetName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginLeft: 12,
  },
  categoryBudgetAmount: {
    fontSize: 14,
    color: "#666",
  },
  categoryProgressBar: {
    height: 6,
    backgroundColor: "#f0f0f0",
    borderRadius: 3,
    overflow: "hidden",
  },
  categoryProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
  debtHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  historyToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#FFE8EC",
    borderRadius: 20,
  },
  historyToggleText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#F76A86",
    fontWeight: "600",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
  },
});
