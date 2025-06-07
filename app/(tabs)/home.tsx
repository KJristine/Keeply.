import AddTaskModal from "@/components/home/AddTaskModal";
import PomodoroTimerModal from "@/components/home/PomodoroTimerModal";
import ProfileModal from "@/components/profile/ProfileModal";
import { db } from "@/config/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import sanitizeHtml from 'sanitize-html';

const { width, height } = Dimensions.get("window");

interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  userId: string;
  deadline?: Date | null;
  createdAt?: any;
  updatedAt?: any;
}

const Home = () => {
  const [activeTab, setActiveTab] = useState("To Do list");
  const [searchQuery, setSearchQuery] = useState("");
  const { currentUser } = useAuth();
  const [username, setUsername] = useState("User");
  const [todayDate, setTodayDate] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isPomodoroVisible, setIsPomodoroVisible] = useState(false);
  const [isProfileModalVisible, setProfileModalVisible] = useState(false);

  // --- Task Streak Logic ---
  const [taskStreak, setTaskStreak] = useState(0);

  // --- Edit Task State ---
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    // Date: MONTH DAY, YEAR - WEEKDAY
    const now = new Date();
    const month = now
      .toLocaleString("default", { month: "long" })
      .toUpperCase();
    const day = now.getDate();
    const year = now.getFullYear();
    const weekday = now
      .toLocaleString("default", { weekday: "long" })
      .toUpperCase();
    setTodayDate(`${month} ${day}, ${year} - ${weekday}`);

    if (currentUser?.displayName) setUsername(currentUser.displayName);
  }, [currentUser]);

  // Firestore: Real-time tasks
  useEffect(() => {
    if (!currentUser?.uid) return;
    const q = query(
      collection(db, "tasks"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setTasks(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Task[]
      );
    });
    return unsub;
  }, [currentUser]);

  // --- Calculate Task Streak ---
  useEffect(() => {
    // Get all completed task dates (as yyyy-mm-dd)
    const completedDates = tasks
      .filter((t) => t.completed && t.updatedAt)
      .map((t) => {
        const date = t.updatedAt?.toDate?.() || t.updatedAt;
        return date ? new Date(date) : null;
      })
      .filter(Boolean)
      .sort((a, b) => (b as Date).getTime() - (a as Date).getTime()) as Date[];

    if (completedDates.length === 0) {
      setTaskStreak(0);
      return;
    }

    const now = new Date();
    const msInDay = 24 * 60 * 60 * 1000;
    const lastCompleted = completedDates[0];
    if (now.getTime() - lastCompleted.getTime() > msInDay) {
      setTaskStreak(0);
      return;
    }

    // Calculate streak
    let streak = 1;
    let prev = lastCompleted;
    for (let i = 1; i < completedDates.length; i++) {
      const diff = prev.getTime() - completedDates[i].getTime();
      if (diff > msInDay + 1000 * 60 * 60) break; // More than 24 hours gap
      if (diff >= msInDay - 1000 * 60 * 60) {
        streak++;
        prev = completedDates[i];
      }
    }
    setTaskStreak(streak);
  }, [tasks]);

  // --- Pomodoro Timer Modal Logic ---
  const handlePomodoroPress = () => {
    setIsPomodoroVisible(true);
  };

  // CRUD Handlers
  const handleAddTask = async ({
    title,
    description,
    deadline,
  }: {
    title: string;
    description: string;
    deadline?: Date | null;
  }) => {
    if (!title.trim()) return;
    try {
      await addDoc(collection(db, "tasks"), {
        title: title.trim(),
        description: description || "",
        completed: false,
        userId: currentUser.uid,
        deadline: deadline || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setIsModalVisible(false);
    } catch (e) {
      Alert.alert("Error", "Could not add task.");
    }
  };

  const handleEditTask = async ({
    title,
    description,
    deadline,
  }: {
    title: string;
    description: string;
    deadline?: Date | null;
  }) => {
    if (!editingTask) return;
    try {
      await updateDoc(doc(db, "tasks", editingTask.id), {
        title: title.trim(),
        description: description || "",
        deadline: deadline || null,
        updatedAt: serverTimestamp(),
      });
      setIsModalVisible(false);
      setEditingTask(null);
    } catch (e) {
      Alert.alert("Error", "Could not update task.");
    }
  };

  const handleToggleTask = async (task: Task) => {
    try {
      await updateDoc(doc(db, "tasks", task.id), {
        completed: !task.completed,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      Alert.alert("Error", "Could not update task.");
    }
  };

  const handleDeleteTask = async (task: Task) => {
    Alert.alert("Delete Task", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "tasks", task.id));
            Alert.alert("Task Deleted", "The task was deleted successfully.");
          } catch (e) {
            Alert.alert("Error", "Could not delete task.");
          }
        },
      },
    ]);
  };

  // Stats & Filter
  const completedCount = tasks.filter((t) => t.completed).length;
  const progress = tasks.length
    ? Math.round((completedCount / tasks.length) * 100)
    : 0;

  // Updated filter logic for tabs
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    if (activeTab === "To Do list") {
      // Show all tasks regardless of status
      return matchesSearch;
    }
    if (activeTab === "Ongoing") {
      return !task.completed && matchesSearch;
    }
    // Completed tab
    return task.completed && matchesSearch;
  });

  // UI
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: height * 0.12,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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
            <Text style={styles.welcomeText}>Hello, {username}</Text>
            <Text style={styles.dateText}>{todayDate}</Text>
          </View>
        </View>

        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <TouchableOpacity style={styles.statsCard}>
            <Ionicons
              name="checkmark-done-circle"
              size={width * 0.07}
              color="#F76A86"
            />
            <Text style={styles.statsValue}>{completedCount}</Text>
            <Text style={styles.statsLabel}>Completed</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statsCard}>
            <Ionicons name="list-circle" size={width * 0.07} color="#F76A86" />
            <Text style={styles.statsValue}>{tasks.length}</Text>
            <Text style={styles.statsLabel}>All Tasks</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statsCard}>
            <Ionicons name="trending-up" size={width * 0.07} color="#F76A86" />
            <Text style={styles.statsValue}>{progress}%</Text>
            <Text style={styles.statsLabel}>Progress</Text>
          </TouchableOpacity>
        </View>
        {/* Mini Stat Cards for Streak and Pomodoro */}
        <View style={styles.miniStatsContainer}>
          <View style={[styles.miniStatCard, { marginRight: width * 0.03 }]}>
            <Ionicons
              name="flame-outline"
              size={width * 0.05}
              color="#F76A86"
            />
            <View style={{ marginLeft: width * 0.02 }}>
              <Text style={styles.miniStatValue}>{taskStreak} Streak</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.miniStatCard}
            onPress={handlePomodoroPress}
          >
            <Ionicons
              name="timer-outline"
              size={width * 0.05}
              color="#F76A86"
            />
            <View style={{ marginLeft: width * 0.02 }}>
              <Text style={styles.miniStatValue}>Pomodoro Timer</Text>
            </View>
          </TouchableOpacity>
        </View>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={width * 0.05}
            color="#666"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Task"
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={(text) => {
              // Sanitize the input text to remove any unwanted HTML or scripts
              const sanitizedSearchQuery = sanitizeHtml(text, {
                allowedTags: [],  // No HTML tags allowed
                allowedAttributes: {},  // No attributes allowed
              });
              setSearchQuery(sanitizedSearchQuery);  // Update the state with sanitized query
            }}  // Use sanitized function directly
          />
        </View>
        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {["To Do list", "Ongoing", "Completed"].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabButton,
                activeTab === tab ? styles.activeTabButton : null,
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab ? styles.activeTabText : null,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress}%</Text>
        </View>
        {/* Task List */}
        <View style={styles.taskListContainer}>
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => (
              <Swipeable
                key={task.id}
                renderRightActions={() => (
                  <View style={styles.swipeActionsContainer}>
                    <TouchableOpacity
                      style={[styles.swipeActionRect, styles.editActionRect]}
                      onPress={() => {
                        setEditingTask(task);
                        setIsModalVisible(true);
                      }}
                    >
                      <Ionicons
                        name="create-outline"
                        size={width * 0.055}
                        color="#fff"
                      />
                      <Text style={styles.swipeActionTextRect}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.swipeActionRect, styles.deleteActionRect]}
                      onPress={() => handleDeleteTask(task)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={width * 0.055}
                        color="#fff"
                      />
                      <Text style={styles.swipeActionTextRect}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              >
                <TouchableOpacity
                  style={[
                    styles.taskItem,
                    task.completed && styles.completedTask,
                  ]}
                  onLongPress={() => handleDeleteTask(task)}
                >
                  <View style={styles.taskDetailsContainer}>
                    <Text
                      style={[
                        styles.taskTitle,
                        task.completed && styles.completedTaskText,
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {task.title}
                    </Text>
                    {task.description ? (
                      <Text
                        style={[
                          styles.taskDesc,
                          task.completed && styles.completedTaskText,
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {task.description}
                      </Text>
                    ) : null}
                    {task.deadline ? (
                      <Text
                        style={styles.taskDeadline}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {(() => {
                          let d;
                          if (
                            task.deadline &&
                            typeof (task.deadline as any).toDate === "function"
                          ) {
                            d = (task.deadline as any).toDate();
                          } else if (task.deadline instanceof Date) {
                            d = task.deadline;
                          } else {
                            d = new Date(task.deadline);
                          }
                          if (isNaN(d.getTime())) return "Due: Invalid date";
                          const month = d.toLocaleString("default", {
                            month: "long",
                          });
                          const day = d.getDate();
                          const year = d.getFullYear();
                          const time = d.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          });
                          return `Due: ${month} ${day}, ${year} - ${time}`;
                        })()}
                      </Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => handleToggleTask(task)}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        task.completed && styles.checkboxChecked,
                      ]}
                    >
                      {task.completed && (
                        <Ionicons
                          name="checkmark"
                          size={width * 0.04}
                          color="#fff"
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                </TouchableOpacity>
              </Swipeable>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Image
                source={require("../../assets/images/taskllist.png")}
                style={{ width: width * 0.23, height: width * 0.23 }}
                resizeMode="contain"
              />
              <Text style={styles.emptyStateText}>No tasks found</Text>
              <Text style={styles.emptyStateSubtext}>
                Add a new task to get started
              </Text>
            </View>
          )}
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
          }}
          onPress={() => setProfileModalVisible(false)}
        >
          <Ionicons name="close" size={width * 0.07} color="#333" />
        </TouchableOpacity>
      </Modal>

      <AddTaskModal
        visible={isModalVisible}
        onClose={() => {
          setIsModalVisible(false);
          setEditingTask(null);
        }}
        onAddTask={editingTask ? handleEditTask : handleAddTask}
        task={
          editingTask
            ? {
              id: editingTask.id,
              title: editingTask.title,
              description: editingTask.description ?? "",
              deadline: editingTask.deadline ?? null,
            }
            : undefined
        }
      />

      <PomodoroTimerModal
        visible={isPomodoroVisible}
        onClose={() => setIsPomodoroVisible(false)}
      />

      {/* Add Task FAB */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          setEditingTask(null);
          setIsModalVisible(true);
        }}
      >
        <Ionicons name="add" size={width * 0.08} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContainer: {
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
  dateText: {
    fontSize: width * 0.032,
    color: "#666",
    marginTop: height * 0.002,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: height * 0.025,
  },
  statsCard: {
    backgroundColor: "#fff",
    borderRadius: width * 0.03,
    padding: width * 0.04,
    alignItems: "center",
    justifyContent: "center",
    width: (width - width * 0.18) / 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  statsValue: {
    fontSize: width * 0.055,
    fontWeight: "800",
    color: "#333",
    marginTop: height * 0.006,
  },
  statsLabel: {
    fontSize: width * 0.032,
    color: "#666",
    marginTop: height * 0.002,
  },
  miniStatsContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: height * 0.022,
    gap: width * 0.03,
  },
  miniStatCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: width * 0.02,
    paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.04,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    minWidth: 0,
  },
  miniStatValue: {
    fontSize: width * 0.04,
    fontWeight: "700",
    color: "#333",
    marginBottom: 0,
    marginRight: 0,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: width * 0.025,
    paddingHorizontal: width * 0.04,
    marginBottom: height * 0.025,
    borderWidth: 1,
    borderColor: "#eee",
  },
  searchIcon: {
    marginRight: width * 0.025,
  },
  searchInput: {
    flex: 1,
    paddingVertical: height * 0.015,
    fontSize: width * 0.04,
    color: "#333",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderRadius: width * 0.025,
    marginBottom: height * 0.018,
    padding: width * 0.008,
  },
  tabButton: {
    flex: 1,
    paddingVertical: height * 0.018,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: width * 0.02,
  },
  activeTabButton: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: width * 0.037,
    fontWeight: "600",
    color: "#666",
  },
  activeTabText: {
    color: "#F76A86",
    fontWeight: "700",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: height * 0.025,
  },
  progressBarBg: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    height: height * 0.013,
    borderRadius: height * 0.0065,
    overflow: "hidden",
    marginRight: width * 0.025,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#F76A86",
    borderRadius: height * 0.0065,
  },
  progressText: {
    fontSize: width * 0.037,
    fontWeight: "700",
    color: "#F76A86",
  },
  taskListContainer: {
    marginBottom: height * 0.1,
  },
  taskItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFE0DE",
    paddingHorizontal: width * 0.045, // Only horizontal padding
    marginBottom: height * 0.012,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#333",
    height: width * 0.16, // Fixed height for alignment
    overflow: "hidden", // Ensures border radius is respected
  },
  taskDetailsContainer: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    marginBottom: 2, // or use marginBottom on each text if you want more control
  },
  taskTitle: {
    fontSize: width * 0.042,
    fontWeight: "700",
    color: "#333",
    marginBottom: 1,
  },
  taskDesc: {
    fontSize: width * 0.034,
    color: "#555",
    marginBottom: 1,
  },
  taskDeadline: {
    fontSize: width * 0.03,
    color: "#F76A86",
  },
  completedTask: {
    backgroundColor: "#C2EFB9",
  },
  completedTaskText: {
    textDecorationLine: "line-through",
    color: "#999",
  },
  checkboxContainer: {
    marginLeft: width * 0.025,
  },
  checkbox: {
    width: width * 0.06,
    height: width * 0.06,
    borderRadius: width * 0.015,
    borderWidth: 2,
    borderColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  checkboxChecked: {
    backgroundColor: "#F76A86",
    borderColor: "#F76A86",
  },
  swipeActionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: width * 0.16, // Match taskItem height
    margin: 0,
    padding: 0,
  },
  swipeActionRect: {
    width: width * 0.16,
    height: width * 0.16, // Match taskItem height
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 0, // Remove negative margin
    padding: 0,
    borderRadius: 0, // Let parent handle rounding
  },
  editActionRect: {
    backgroundColor: "#4CAF50",
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#333",
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    height: width * 0.16, // Ensure same height
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  deleteActionRect: {
    backgroundColor: "#F76A86",
    borderTopRightRadius: width * 0.025,
    borderBottomRightRadius: width * 0.025,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#333",
    height: width * 0.16, // Ensure same height
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  swipeActionTextRect: {
    color: "#fff",
    fontSize: width * 0.034,
    fontWeight: "600",
    marginTop: 2,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: height * 0.05,
  },
  emptyStateText: {
    fontSize: width * 0.045,
    fontWeight: "700",
    color: "#999",
  },
  emptyStateSubtext: {
    fontSize: width * 0.035,
    color: "#999",
    marginTop: height * 0.006,
  },
  addButton: {
    position: "absolute",
    right: width * 0.06,
    bottom: height * 0.04,
    width: width * 0.16,
    height: width * 0.16,
    borderRadius: width * 0.08,
    backgroundColor: "#F76A86",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    borderWidth: 3,
    borderColor: "#fff",
  },
});
