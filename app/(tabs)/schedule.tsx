import ProfileModal from "@/components/profile/ProfileModal";
import { db } from "@/config/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Schedule } from "@/types/props";
import { decryptData } from "../../components/schedules/AddScheduleModal";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { StatusBar } from "expo-status-bar";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import { Swipeable } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import AddScheduleModal from "../../components/schedules/AddScheduleModal";

// Get screen dimensions
const { width, height } = Dimensions.get("window");

export default function ScheduleScreen() {
  const [showModal, setShowModal] = useState(false);
  const [subject, setSubject] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [time, setTime] = useState("");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeDate, setTimeDate] = useState(new Date());
  const [modalVisibleBeforeTimePicker, setModalVisibleBeforeTimePicker] =
    useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(
    null
  );
  const [isProfileModalVisible, setProfileModalVisible] = useState(false);

  // Modal fade animation
  const modalFadeAnim = useRef(new Animated.Value(0)).current;
  // Time picker fade animation
  const timePickerFadeAnim = useRef(new Animated.Value(0)).current;

  interface MarkedDates {
    [date: string]: {
      marked?: boolean;
      dotColor?: string;
      selected?: boolean;
    };
  }

  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const { currentUser } = useAuth();

  const today = new Date();
  const dateString = `${today.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  })} - ${today.toLocaleDateString(undefined, { weekday: "long" })}`;

  // Animate modal fade in/out
  useEffect(() => {
    if (showModal && !showTimePicker) {
      Animated.timing(modalFadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }).start();
    } else {
      Animated.timing(modalFadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }).start();
    }
  }, [showModal, showTimePicker, modalFadeAnim]);

  // Animate time picker fade in/out
  useEffect(() => {
    if (showTimePicker) {
      Animated.timing(timePickerFadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }).start();
    } else {
      Animated.timing(timePickerFadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }).start();
    }
  }, [showTimePicker, timePickerFadeAnim]);

  // Fetch schedules from Firestore
  const fetchSchedules = async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }
    try {
      const schedulesRef = collection(db, "schedules");
      const q = query(schedulesRef, where("userId", "==", currentUser.uid));
      const querySnapshot = await getDocs(q);

      const schedulesData: Schedule[] = [];
      const dates: {
        [key: string]: { marked: boolean; dotColor: string; selected: boolean };
      } = {};

      // Process each document
      for (const document of querySnapshot.docs) {
        const docData = document.data();
        const data = { id: document.id, ...docData } as Schedule;
        
        // Check if data is encrypted and decrypt if needed
        if (docData.encrypted) {
          try {
            // Decrypt subject and time
            data.subject = await decryptData(data.subject);
            data.time = await decryptData(data.time);
          } catch (decryptError) {
            console.error("Error decrypting schedule data:", decryptError);
            // Keep encrypted data as fallback
          }
        }
        
        schedulesData.push(data);

        if (data.date) {
          dates[data.date] = {
            marked: true,
            dotColor: "#F76A86",
            selected: selectedDate === data.date,
          };
        }
      }

      setSchedules(schedulesData);
      setMarkedDates(dates);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      Alert.alert("Error", "Failed to load schedules");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      updateSelectedDateMarking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const updateSelectedDateMarking = () => {
    if (!selectedDate) return;

    const updatedMarkedDates = { ...markedDates };

    Object.keys(updatedMarkedDates).forEach((date) => {
      updatedMarkedDates[date] = {
        ...updatedMarkedDates[date],
        selected: date === selectedDate,
      };
    });

    if (!updatedMarkedDates[selectedDate]) {
      updatedMarkedDates[selectedDate] = {
        selected: true,
      };
    } else {
      updatedMarkedDates[selectedDate].selected = true;
    }

    setMarkedDates(updatedMarkedDates);
  };

  const handleCreateSchedule = async (encryptedData?: any) => {
    if (!currentUser) {
      Alert.alert("Error", "You must be logged in to create schedules");
      return;
    }

    if (!subject?.trim() || !time?.trim() || !selectedDate) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      // Use encrypted data if provided, otherwise use plain text
      const scheduleData = {
        subject: encryptedData?.subject || subject.trim(),
        time: encryptedData?.time || time.trim(),
        date: selectedDate,
        userId: currentUser.uid,
        ...(editingScheduleId ? {} : { createdAt: serverTimestamp() }),
        encrypted: !!encryptedData // Flag to indicate if data is encrypted
      };

      if (editingScheduleId) {
        await updateDoc(doc(db, "schedules", editingScheduleId), scheduleData);
        Alert.alert("Success", "Schedule updated successfully!");
      } else {
        await addDoc(collection(db, "schedules"), scheduleData);
        Alert.alert("Success", "Schedule added successfully!");
      }

      handleCloseModal();
      resetForm();
      setEditingScheduleId(null);
      fetchSchedules();
    } catch (error) {
      console.error("Error with schedule:", error);
      Alert.alert(
        "Error",
        `Failed to ${editingScheduleId ? "update" : "create"} schedule`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!scheduleId) return;

    Alert.alert(
      "Delete Schedule",
      "Are you sure you want to delete this schedule?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoading(true);
              await deleteDoc(doc(db, "schedules", scheduleId));
              Alert.alert("Success", "Schedule deleted successfully!");
              fetchSchedules();
            } catch (error) {
              console.error("Error deleting schedule:", error);
              Alert.alert("Error", "Failed to delete schedule");
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleEditSchedule = (schedule: Schedule) => {
    if (!schedule.id) return;
    
    // Make sure we're using decrypted values in the form
    setSubject(schedule.subject);
    setTime(schedule.time);
    setSelectedDate(schedule.date);
    setEditingScheduleId(schedule.id);
    handleOpenModal();
  };

  const resetForm = () => {
    setSubject("");
    setTime("");
  };

  const onDayPress = (day: DateData) => {
    const formattedDate = day.dateString;
    setSelectedDate(formattedDate);
  };

  const getSchedulesForSelectedDate = () => {
    if (!selectedDate) return [];
    return schedules.filter((schedule) => schedule.date === selectedDate);
  };

  // Animations for time picker
  const fadeInTimePicker = () => {
    Animated.timing(timePickerFadeAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const fadeOutTimePicker = (callback: () => void) => {
    Animated.timing(timePickerFadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      callback();
    });
  };

  const showTimePickerHandler = () => {
    setModalVisibleBeforeTimePicker(true);
    Animated.timing(modalFadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setShowTimePicker(true);
      fadeInTimePicker();
    });
  };

  const cancelTimePicker = () => {
    fadeOutTimePicker(() => {
      setShowTimePicker(false);
      Animated.timing(modalFadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

  const confirmTime = () => {
    try {
      const formattedTime = timeDate.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      setTime(formattedTime);
    } catch (error) {
      console.error("Error formatting time:", error);
    }
    fadeOutTimePicker(() => {
      setShowTimePicker(false);
      Animated.timing(modalFadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      if (event.type === "set" && selectedDate) {
        setTimeDate(selectedDate);
        try {
          const formattedTime = selectedDate.toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          });
          setTime(formattedTime);
        } catch (error) {
          console.error("Error formatting time:", error);
        }
      }
      setShowTimePicker(false);
      Animated.timing(modalFadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    } else if (selectedDate) {
      setTimeDate(selectedDate);
    }
  };

  const handleCloseModal = () => {
    Animated.timing(modalFadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowModal(false);
      setShowTimePicker(false);
      resetForm();
      setEditingScheduleId(null);
    });
  };

  const handleOpenModal = () => {
    modalFadeAnim.setValue(0);
    setShowModal(true);
    Animated.timing(modalFadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  };

  // Show loading indicator until schedules are loaded
  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F76A86" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.contentContainer}>
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
            <Text style={styles.welcomeText}>Schedule</Text>
            <Text style={styles.dateText}>{dateString}</Text>
          </View>
        </View>

        {/* Calendar */}
        <View style={styles.calendarContainer}>
          <Calendar
            onDayPress={onDayPress}
            markedDates={markedDates}
            theme={{
              backgroundColor: "#ffffff",
              calendarBackground: "#ffffff",
              textSectionTitleColor: "#b6c1cd",
              selectedDayBackgroundColor: "#F76A86",
              selectedDayTextColor: "#ffffff",
              todayTextColor: "#F76A86",
              dayTextColor: "#2d4150",
              textDisabledColor: "#d9e1e8",
              dotColor: "#F76A86",
              selectedDotColor: "#ffffff",
              arrowColor: "#F76A86",
              monthTextColor: "#2d4150",
              indicatorColor: "#F76A86",
              textDayFontSize: width * 0.035,
              textMonthFontSize: width * 0.04,
              textDayHeaderFontSize: width * 0.032,
            }}
          />
        </View>

        {/* Schedule List Container */}
        <View style={styles.scheduleListContainer}>
          <Text style={styles.scheduleListTitle}>
            {selectedDate
              ? `Schedules for ${new Date(selectedDate).toLocaleDateString(
                  undefined,
                  { month: "long", day: "numeric", year: "numeric" }
                )} - ${new Date(selectedDate).toLocaleDateString(undefined, {
                  weekday: "long",
                })}`
              : "Select a date to view schedules"}
          </Text>

          {isLoading ? (
            <ActivityIndicator color="#F76A86" style={styles.loader} />
          ) : (
            <>
              {getSchedulesForSelectedDate().length > 0 ? (
                <FlatList
                  data={getSchedulesForSelectedDate()}
                  keyExtractor={(item) => item.id || Math.random().toString()}
                  renderItem={({ item: schedule }) => (
                    <Swipeable
                      renderRightActions={() => (
                        <View style={styles.swipeActionsContainer}>
                          <TouchableOpacity
                            style={[
                              styles.swipeActionRect,
                              styles.editActionRect,
                            ]}
                            onPress={() => handleEditSchedule(schedule)}
                          >
                            <Ionicons
                              name="create-outline"
                              size={width * 0.045}
                              color="#fff"
                            />
                            <Text style={styles.swipeActionTextRect}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.swipeActionRect,
                              styles.deleteActionRect,
                            ]}
                            onPress={() =>
                              handleDeleteSchedule(schedule.id || "")
                            }
                          >
                            <Ionicons
                              name="trash-outline"
                              size={width * 0.045}
                              color="#fff"
                            />
                            <Text style={styles.swipeActionTextRect}>
                              Delete
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    >
                      <View style={styles.scheduleItemContainer}>
                        <View style={styles.scheduleItem}>
                          <View style={styles.scheduleContent}>
                            <View style={styles.scheduleTimeContainer}>
                              <Ionicons
                                name="time-outline"
                                size={width * 0.045}
                                color="#F76A86"
                              />
                              <Text style={styles.scheduleTime}>
                                {schedule.time}
                              </Text>
                            </View>
                            <Text
                              style={styles.scheduleSubject}
                              numberOfLines={1}
                            >
                              {schedule.subject}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </Swipeable>
                  )}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: height * 0.02 }}
                />
              ) : (
                selectedDate && (
                  <View style={styles.emptyScheduleContainer}>
                    <Image
                      source={require("@/assets/images/schedule.png")}
                      style={styles.emptyScheduleImage}
                      resizeMode="contain"
                    />
                    <Text style={styles.emptyScheduleText}>
                      No schedules for this date
                    </Text>
                  </View>
                )
              )}
            </>
          )}
        </View>
      </View>

      {/* Add Schedule Button */}
      <TouchableOpacity style={styles.addButton} onPress={handleOpenModal}>
        <Ionicons name="add" size={width * 0.08} color="#fff" />
      </TouchableOpacity>

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

      {/* Schedule Modal with animated opacity */}
      <AddScheduleModal
        visible={showModal && !showTimePicker}
        fadeAnim={modalFadeAnim}
        subject={subject}
        setSubject={setSubject}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        time={time}
        showTimePickerHandler={showTimePickerHandler}
        onClose={handleCloseModal}
        onSubmit={handleCreateSchedule}
        isLoading={isLoading}
        editing={!!editingScheduleId}
      />

      {/* Time picker modal with opacity animation */}
      {Platform.OS === "ios" && showTimePicker && (
        <Modal
          visible={true}
          animationType="none"
          transparent={true}
          statusBarTranslucent={true}
        >
          <Animated.View
            style={[styles.timePickerBackdrop, { opacity: timePickerFadeAnim }]}
          >
            <View style={styles.timePickerContainer}>
              <View style={styles.timePickerHeader}>
                <Text style={styles.timePickerTitle}>Select Time</Text>
              </View>

              <DateTimePicker
                testID="iosTimePicker"
                value={timeDate}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
                style={styles.timePicker}
                textColor="black"
              />

              <View style={styles.timePickerActions}>
                <TouchableOpacity
                  style={styles.timePickerButton}
                  onPress={cancelTimePicker}
                >
                  <Text style={styles.timePickerCancel}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.timePickerButton,
                    styles.timePickerConfirmButton,
                  ]}
                  onPress={confirmTime}
                >
                  <Text style={styles.timePickerConfirm}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </Modal>
      )}

      {/* Android native time picker */}
      {Platform.OS === "android" && showTimePicker && (
        <DateTimePicker
          testID="androidTimePicker"
          value={timeDate}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={handleTimeChange}
          themeVariant="light"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: width * 0.06,
    paddingTop: height * 0.025,
  },
  contentContainer: {
    flex: 1,
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
    marginTop: height * 0.003,
  },
  calendarContainer: {
    marginTop: height * 0.01,
    padding: width * 0.025,
    backgroundColor: "#fff",
    borderRadius: width * 0.04,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    marginHorizontal: width * 0.01,
  },
  scheduleListContainer: {
    flex: 1,
    marginTop: height * 0.02,
    paddingHorizontal: width * 0.01,
  },
  scheduleListTitle: {
    fontSize: width * 0.04,
    fontWeight: "700",
    marginBottom: height * 0.02,
    color: "#4B5563",
    textAlign: width > 768 ? "center" : "left",
  },
  scheduleItemContainer: {
    marginBottom: height * 0.012,
  },
  scheduleItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFE0DE",
    paddingVertical: height * 0.015, // Reduced vertical padding
    paddingHorizontal: width * 0.04,
    borderWidth: 1,
    borderColor: "#333",
    minHeight: height * 0.055, // Reduced from 0.08 to 0.055
  },
  scheduleContent: {
    flex: 1,
    flexDirection: "row", // Changed to row layout
    alignItems: "center", // Center items vertically
    justifyContent: "space-between", // Space between time and title
  },
  scheduleTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    // Removed marginBottom since we're using row layout
  },
  scheduleTime: {
    fontSize: width * 0.038,
    color: "#4B5563",
    marginLeft: width * 0.02,
  },
  scheduleSubject: {
    fontSize: width * 0.042,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1, // Take remaining space
    textAlign: "right", // Align text to the right
    marginLeft: width * 0.03, // Add some spacing from time
  },
  // Swipe Actions Styles
  swipeActionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: height * 0.055, // Match the new scheduleItem height
    marginBottom: height * 0.012,
  },
  swipeActionRect: {
    width: width * 0.16,
    height: height * 0.055, // Match the new scheduleItem height
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#333",
  },
  editActionRect: {
    backgroundColor: "#4CAF50",
    borderRightWidth: 1,
  },
  deleteActionRect: {
    backgroundColor: "#F76A86",
    borderRightWidth: 1,
    borderTopRightRadius: width * 0.03,
    borderBottomRightRadius: width * 0.03,
  },
  swipeActionTextRect: {
    color: "#fff",
    fontSize: width * 0.03, // Slightly smaller text for compact design
    fontWeight: "600",
    marginTop: 1, // Reduced margin
  },
  emptyScheduleContainer: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingTop: height * 0.05,
  },
  emptyScheduleImage: {
    width: width * 0.35,
    height: width * 0.35,
    maxWidth: 150,
    maxHeight: 150,
  },
  emptyScheduleText: {
    fontSize: width * 0.04,
    color: "#6B7280",
    textAlign: "center",
    marginTop: height * 0.01,
  },
  addButton: {
    position: "absolute",
    right: width * 0.06,
    bottom: height * 0.04, // Changed from 0.03 to 0.04 to match home.tsx
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
  loader: {
    marginVertical: height * 0.025,
  },
  // Time picker modal styles
  timePickerBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  timePickerContainer: {
    backgroundColor: "white",
    borderRadius: width * 0.05,
    padding: width * 0.05,
    width: width * 0.85,
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  timePicker: {
    width: "100%",
    height: height * 0.22,
    color: "#000000",
  },
  timePickerHeader: {
    width: "100%",
    alignItems: "center",
    marginBottom: height * 0.02,
  },
  timePickerTitle: {
    fontSize: width * 0.048,
    fontWeight: "700",
    color: "#1F2937",
  },
  timePickerActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: height * 0.02,
  },
  timePickerButton: {
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.05,
    borderRadius: width * 0.025,
    minWidth: width * 0.25,
    alignItems: "center",
  },
  timePickerConfirmButton: {
    backgroundColor: "#F76A86",
  },
  timePickerCancel: {
    color: "#6B7280",
    fontSize: width * 0.04,
    fontWeight: "600",
  },
  timePickerConfirm: {
    color: "#FFF",
    fontSize: width * 0.04,
    fontWeight: "600",
  },
});
