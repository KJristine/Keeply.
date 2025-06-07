import { AddTaskModalProps } from "@/types/props";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import sanitizeHtml from 'sanitize-html';

const AddTaskModal = ({
  visible,
  onClose,
  onAddTask,
  task,
}: AddTaskModalProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [error, setError] = useState("");
  const [tempPickerValue, setTempPickerValue] = useState<Date>(
    deadline || new Date()
  );

  // Animation state
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    setTitle(task ? task.title : "");
    setDescription(task ? task.description : "");
    setDeadline(
      task && task.deadline
        ? typeof (task.deadline as any).toDate === "function"
          ? (task.deadline as any).toDate()
          : new Date(task.deadline)
        : null
    );
    setError("");
  }, [task, visible]);

  // Keep tempPickerValue in sync with deadline
  useEffect(() => {
    setTempPickerValue(deadline || new Date());
  }, [showDatePicker, showTimePicker, deadline]);

  // Animate in/out when modal visibility changes (slow fade)
  React.useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }).start();
    }
  }, [visible]);

    // Sanitize Title and Description Input
  const handleTitleChange = (text: string) => {
    // Sanitize the title text
    const sanitizedText = sanitizeHtml(text, {
      allowedTags: [], // No HTML tags allowed
      allowedAttributes: {}, // No attributes allowed
    });
    setTitle(sanitizedText); // Update state with sanitized title
  };

  const handleDescriptionChange = (text: string) => {
    // Sanitize the description text
    const sanitizedText = sanitizeHtml(text, {
      allowedTags: [], // No HTML tags allowed
      allowedAttributes: {}, // No attributes allowed
    });
    setDescription(sanitizedText); // Update state with sanitized description
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      setError("Please enter a task title.");
      return;
    }
    setError("");
    onAddTask({ title, description, deadline, id: task?.id });
    setTitle("");
    setDescription("");
    setDeadline(null);
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 350,
      useNativeDriver: true,
      easing: Easing.in(Easing.ease),
    }).start(() => {
      onClose();
    });
  };

  const handleClose = () => {
    setError("");
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 350,
      useNativeDriver: true,
      easing: Easing.in(Easing.ease),
    }).start(() => {
      onClose();
    });
  };

  const getDeadlineDisplay = () => {
    if (!deadline) return "Set Deadline (optional)";
    const date = deadline.toLocaleDateString();
    const time = deadline.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${date} • ${time}`;
  };

  // --- Date and Time Picker Logic ---
  const onIOSPickerChange = (_: any, selectedDate?: Date) => {
    if (selectedDate) setTempPickerValue(selectedDate);
  };

  // For iOS: show a "Done" button to close the picker and set the value
  const renderIOSPicker = (
    mode: "date" | "time",
    show: boolean,
    onChange: (event: any, date?: Date) => void,
    onDone: () => void
  ) =>
    show ? (
      <View style={styles.iosPickerContainer}>
        <DateTimePicker
          value={tempPickerValue}
          mode={mode}
          display="spinner"
          onChange={onChange}
          minimumDate={mode === "date" ? new Date() : undefined}
          textColor="#000"
          style={{ backgroundColor: "#fff" }}
        />
        <TouchableOpacity onPress={onDone} style={styles.iosPickerDoneButton}>
          <Text style={styles.iosPickerDoneText}>Done</Text>
        </TouchableOpacity>
      </View>
    ) : null;

  // For Android: handle picker change and close
  const onDateChange = (_: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const prev = deadline || new Date();
      const newDate = new Date(selectedDate);
      newDate.setHours(prev.getHours(), prev.getMinutes());
      setDeadline(newDate);
    }
  };

  const onTimeChange = (_: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime && deadline) {
      const newDate = new Date(deadline);
      newDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
      setDeadline(newDate);
    }
  };

  // iOS Done handlers
  const onIOSDateDone = () => {
    setDeadline((prev) => {
      const d = new Date(tempPickerValue);
      // preserve time if already set
      if (prev) d.setHours(prev.getHours(), prev.getMinutes());
      return d;
    });
    setShowDatePicker(false);
  };

  const onIOSTimeDone = () => {
    setDeadline((prev) => {
      const d = new Date(prev || new Date());
      d.setHours(tempPickerValue.getHours(), tempPickerValue.getMinutes());
      return d;
    });
    setShowTimePicker(false);
  };

  return (
    <Modal
      animationType="none"
      transparent
      visible={visible}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.centeredView}
      >
        <Animated.View style={[styles.modalView, { opacity: fadeAnim }]}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={28} color="#A0A0A0" />
          </TouchableOpacity>
          <Text style={styles.title}>
            {task ? "Edit Task" : "Add New Task"}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Task Title"
            placeholderTextColor="#888"
            value={title}
            onChangeText={handleTitleChange}  // Sanitize title
            maxLength={50}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description (optional)"
            placeholderTextColor="#888"
            value={description}
            onChangeText={handleDescriptionChange}  // Sanitize description
            multiline
            numberOfLines={4}
            maxLength={200}
          />
          <TouchableOpacity
            style={styles.deadlineButton}
            onPress={() => {
              setTempPickerValue(deadline || new Date());
              setShowDatePicker(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar-outline" size={20} color="#6C63FF" />
            <Text style={styles.deadlineButtonText}>
              {getDeadlineDisplay()}
            </Text>
            {deadline && (
              <>
                <TouchableOpacity
                  onPress={() => setDeadline(null)}
                  style={{ marginLeft: 8 }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={18} color="#B0B0B0" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setTempPickerValue(deadline || new Date());
                    setShowTimePicker(true);
                  }}
                  style={{ marginLeft: 8 }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="time-outline" size={18} color="#6C63FF" />
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>
          {/* Date Picker */}
          {Platform.OS === "ios"
            ? renderIOSPicker(
                "date",
                showDatePicker,
                onIOSPickerChange,
                onIOSDateDone
              )
            : showDatePicker && (
                <DateTimePicker
                  value={deadline || new Date()}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                  minimumDate={new Date()}
                  textColor="#000"
                />
              )}
          {/* Time Picker */}
          {Platform.OS === "ios"
            ? renderIOSPicker(
                "time",
                showTimePicker,
                onIOSPickerChange,
                onIOSTimeDone
              )
            : showTimePicker && (
                <DateTimePicker
                  value={deadline || new Date()}
                  mode="time"
                  display="default"
                  onChange={onTimeChange}
                  textColor="#000"
                />
              )}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleSubmit}
            activeOpacity={0.8}
          >
            <Text style={styles.addButtonText}>
              {task ? "Save" : "Add Task"}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default AddTaskModal;

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    backgroundColor: "rgba(240,240,240,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalView: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 28,
    alignItems: "stretch",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  closeButton: {
    position: "absolute",
    right: 18,
    top: 18,
    zIndex: 1,
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#222",
    marginBottom: 24,
    alignSelf: "center",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#f5f5f5",
    color: "#222",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#000",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  deadlineButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#000",
  },
  deadlineButtonText: {
    color: "#888",
    fontSize: 16,
    marginLeft: 8,
  },
  addButton: {
    backgroundColor: "#F76A86",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#000",
  },
  addButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  errorText: {
    color: "#F76A86",
    fontSize: 14,
    marginBottom: 8,
    alignSelf: "center",
    fontWeight: "600",
  },
  iosPickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 16,
    marginTop: -8,
    overflow: "hidden",
    alignItems: "stretch",
  },
  iosPickerDoneButton: {
    alignSelf: "flex-end",
    padding: 12,
    paddingRight: 18,
  },
  iosPickerDoneText: {
    color: "#6C63FF",
    fontWeight: "700",
    fontSize: 16,
  },
});
