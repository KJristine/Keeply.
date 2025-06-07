import { AddNoteModalProps } from "@/types/props";
import React, { useEffect, useRef, useState } from "react";
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
import sanitizeHtml from 'sanitize-html'; // Import sanitize-html

const AddNoteModal = ({
  visible,
  onClose,
  onAddNote,
  note,
}: AddNoteModalProps) => {
  const [title, setTitle] = useState(note ? note.title : "");
  const [description, setDescription] = useState(note ? note.description : "");
  const [error, setError] = useState("");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Prefill fields when editing
  useEffect(() => {
    setTitle(note ? note.title : "");
    setDescription(note ? note.description : "");
    setError("");
  }, [note, visible]);

  // Animate in/out when modal visibility changes
  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0); // <-- Add this line
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }).start();
    }
  }, [visible, fadeAnim]);

  const handleAddOrEdit = () => {
    if (!title.trim() || !description.trim()) {
      setError("Please fill out all fields.");
      return;
    }

    // Sanitize the title and description to remove unwanted HTML
    const sanitizedTitle = sanitizeHtml(title.trim(), {
      allowedTags: [],  // No tags allowed in title
      allowedAttributes: {}  // No attributes allowed in title
    });

    const sanitizedDescription = sanitizeHtml(description.trim(), {
      allowedTags: ['b', 'i', 'em', 'strong', 'p'],  // Allow some basic tags in description (optional)
      allowedAttributes: {}  // No attributes allowed in description
    });

    let dateString = note?.date;
    if (!dateString) {
      // New note, generate date
      const now = new Date();
      const datePart = now.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
      });
      const timePart = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      dateString = `${datePart} - ${timePart}`;
    }

    onAddNote({
      title: sanitizedTitle,
      description: sanitizedDescription,
      date: dateString,
    });
    setTitle("");
    setDescription("");
    setError("");
    onClose();
  };

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setError("");
    onClose();
  };

  // Format date as "MONTH DAY, YEAR - WEEKDAY - TIME"
  let displayDate = note?.date;
  if (!displayDate) {
    const now = new Date();
    const datePart = now.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
    const timePart = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    displayDate = `${datePart} - ${timePart}`;
  }

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.centeredView}
      >
        <Animated.View style={[styles.modalView, { opacity: fadeAnim }]} >
          <Text style={styles.modalTitle}>
            {note ? "Edit Note" : "Add Note"}
          </Text>
          <Text style={styles.dateText}>{displayDate}</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="Title"
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (error) setError("");
            }}
            maxLength={60}
            placeholderTextColor="#aaa"
          />
          <TextInput
            style={styles.input}
            placeholder="Description"
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              if (error) setError("");
            }}
            multiline
            placeholderTextColor="#aaa"
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddOrEdit}
            >
              <Text style={styles.addText}>{note ? "Save" : "Add"}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default AddNoteModal;

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(240,240,240,0.85)",
  },
  modalView: {
    width: "92%",
    maxWidth: 500,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 26,
    alignItems: "stretch",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#222",
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  dateText: {
    fontSize: 13,
    color: "#888",
    marginBottom: 14,
    textAlign: "center",
  },
  titleInput: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
    color: "#222",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    minHeight: 80,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#333",
    color: "#222",
    textAlignVertical: "top",
  },
  errorText: {
    color: "#F76A86",
    fontSize: 14,
    marginBottom: 8,
    textAlign: "center",
    fontWeight: "600",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 6,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  addButton: {
    flex: 1,
    backgroundColor: "#F76A86",
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 12,
    marginLeft: 8,
    opacity: 1,
    borderWidth: 1,
    borderColor: "#333",
  },
  addButtonDisabled: {
    backgroundColor: "#FBB8C8",
  },
  cancelText: {
    color: "#333",
    fontWeight: "700",
    fontSize: 16,
  },
  addText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
