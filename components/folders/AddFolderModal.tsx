import { AddFolderModalProps } from "@/types/props";
import { Ionicons } from "@expo/vector-icons";
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
} from "react-native";
import sanitizeHtml from 'sanitize-html'; // Import sanitize-html

// Sanitize input function to remove HTML
const sanitizeInput = (input: string) => {
  return sanitizeHtml(input, {
    allowedTags: [],  // No HTML tags allowed
    allowedAttributes: {},  // No attributes allowed
  });
};

const AddFolderModal = ({
  visible,
  onClose,
  onAddFolder,
  folder,
}: AddFolderModalProps) => {
  const [title, setTitle] = useState(folder ? folder.title : "");
  const [description, setDescription] = useState(folder ? folder.description : "");
  const [error, setError] = useState("");
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [showModal, setShowModal] = useState(visible);

  // Prefill fields when editing, clear when adding
  useEffect(() => {
    setTitle(folder ? folder.title : "");
    setDescription(folder ? folder.description : "");
    setError("");
  }, [folder, visible]);

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }).start(() => setShowModal(false));
    }
  }, [visible, fadeAnim]);

  const handleAddOrEdit = () => {
    if (!title.trim()) {
      setError("Please enter a folder title.");
      return;
    }
    setError("");

    // Sanitize the inputs before passing to the parent
    const sanitizedTitle = sanitizeInput(title.trim());
    const sanitizedDescription = sanitizeInput(description.trim());

    onAddFolder({ title: sanitizedTitle, description: sanitizedDescription });
    setTitle("");
    setDescription("");
    handleClose();
  };

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setError("");
    onClose();
  };

  if (!showModal) return null;

  return (
    <Modal
      visible={showModal}
      transparent
      animationType="none"
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
          <Text style={styles.modalTitle}>
            {folder ? "Edit Folder" : "Add New Folder"}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Folder Title"
            placeholderTextColor="#888"
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (error) setError("");
            }}
            maxLength={50}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description (optional)"
            placeholderTextColor="#888"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={200}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddOrEdit}
            activeOpacity={0.8}
          >
            <Text style={styles.addButtonText}>
              {folder ? "Save" : "Add Folder"}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default AddFolderModal;

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
  modalTitle: {
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
});
