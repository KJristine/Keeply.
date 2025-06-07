import { AddBookModalProps } from "@/types/props";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import sanitizeHtml from "sanitize-html"; // Import sanitize-html

// Define a type for the book object
interface Book {
  title: string;
  description: string;
  coverUri?: string;
  rating: number;
}

const AddBookModal: React.FC<AddBookModalProps> = ({
  visible,
  onClose,
  onAdd,
  newBook,
  setNewBook,
  starTemp,
  setRating,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [showModal, setShowModal] = useState(visible);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

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
  }, [visible]);

  const pickImage = async () => {
    try {
      // Request permissions
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "We need camera roll permission to select a book cover"
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4], // Book cover aspect ratio
        quality: 0.3, // Reduced quality for faster upload
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsUploadingImage(true);

        const localUri = result.assets[0].uri;
        const filename = localUri.split("/").pop() || "book_cover.jpg";

        // Determine file type
        let fileType = "image/jpeg";
        if (filename.toLowerCase().endsWith(".png")) fileType = "image/png";
        else if (filename.toLowerCase().endsWith(".gif"))
          fileType = "image/gif";
        else if (filename.toLowerCase().endsWith(".webp"))
          fileType = "image/webp";

        // Create FormData for upload
        const formData = new FormData();
        const imageObject =
          Platform.OS === "ios"
            ? { uri: localUri, type: fileType, name: filename }
            : { uri: localUri, type: fileType, name: filename };

        // @ts-ignore
        formData.append("image", imageObject);

        // Upload to imgbb
        const IMGBB_API_KEY = "40c0d39660f1471beb29946ab8b5291b"; // Same key as your profile
        const response = await axios({
          method: "post",
          url: `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
          data: formData,
          headers: {
            "Content-Type": "multipart/form-data",
            Accept: "application/json",
          },
          timeout: 30000,
          maxContentLength: 10 * 1024 * 1024, // 10MB limit
        });

        // Validate response
        if (
          !response.data ||
          !response.data.data ||
          !response.data.data.display_url
        ) {
          throw new Error("Invalid response from image server");
        }

        // Update book with image URL
        const imageUrl = response.data.data.display_url;
        setNewBook({ ...newBook, coverUri: imageUrl });

        Alert.alert("Success", "Book cover uploaded successfully!");
      }
    } catch (error) {
      console.error("Image upload error:", error);
      Alert.alert("Error", "Failed to upload book cover. Please try again.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  // --- Sanitize Inputs ---
  const sanitizeInput = (input: string) => {
    return sanitizeHtml(input, {
      allowedTags: [], // No HTML tags allowed
      allowedAttributes: {}, // No attributes allowed
    });
  };

  const handleTitleChange = (text: string) => {
    const sanitizedTitle = sanitizeInput(text);
    setNewBook((prevState: Book) => ({
      ...prevState,
      title: sanitizedTitle,
    }));
  };

  const handleDescriptionChange = (text: string) => {
    const sanitizedDescription = sanitizeInput(text);
    setNewBook((prevState: Book) => ({
      ...prevState,
      description: sanitizedDescription,
    }));
  };

  if (!showModal) return null;

  return (
    <Modal visible={showModal} animationType="none" transparent>
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.modalContent, { opacity: fadeAnim }]}>
          <Text style={styles.modalHeader}>Add Book</Text>

          {/* Image Picker Section */}
          <TouchableOpacity
            style={styles.imagePicker}
            onPress={pickImage}
            disabled={isUploadingImage}
          >
            {isUploadingImage ? (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="large" color="#F76A86" />
                <Text style={styles.uploadingText}>Uploading cover...</Text>
              </View>
            ) : newBook.coverUri ? (
              <Image
                source={{ uri: newBook.coverUri }}
                style={styles.coverLarge}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.placeholderContainer}>
                <Ionicons name="image-outline" size={48} color="#aaa" />
              </View>
            )}
            <Text style={styles.imagePickerText}>
              {isUploadingImage
                ? "Uploading..."
                : newBook.coverUri
                ? "Change Cover"
                : "Pick Cover Image"}
            </Text>
          </TouchableOpacity>

          {/* Title Input */}
          <TextInput
            style={styles.input}
            placeholder="Title"
            placeholderTextColor="#888"
            value={newBook.title || ""}
            onChangeText={handleTitleChange} // Use sanitized title
          />

          {/* Description Input */}
          <TextInput
            style={styles.descInput}
            placeholder="Description (e.g. Chapter, Author, Notes...)"
            placeholderTextColor="#888"
            value={newBook.description || ""}
            onChangeText={handleDescriptionChange} // Use sanitized description
            multiline
          />

          {/* Star Rating */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <Ionicons
                  name={starTemp >= star ? "star" : "star-outline"}
                  size={32}
                  color="#FFD36B"
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            style={[styles.addBtn, isUploadingImage && styles.disabledBtn]}
            onPress={onAdd}
            disabled={isUploadingImage}
          >
            <Text style={styles.addBtnText}>Add Book</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.addBtn, styles.cancelBtn]}
            onPress={onClose}
          >
            <Text style={styles.addBtnText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default AddBookModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(240,240,240,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 24,
    width: "90%",
    maxWidth: 400,
    alignItems: "stretch",
  },
  modalHeader: {
    fontSize: 22,
    fontWeight: "700",
    color: "#222",
    marginBottom: 18,
    alignSelf: "center",
  },
  imagePicker: {
    alignItems: "center",
    marginBottom: 18,
    minHeight: 180, // Ensure consistent height
  },
  placeholderContainer: {
    width: 120,
    height: 160,
    borderRadius: 10,
    backgroundColor: "#f5f5f5",
    borderWidth: 2,
    borderColor: "#ddd",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadingContainer: {
    width: 120,
    height: 160,
    borderRadius: 10,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  uploadingText: {
    color: "#666",
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
  coverLarge: {
    width: 120,
    height: 160,
    borderRadius: 10,
    backgroundColor: "#eee",
  },
  imagePickerText: {
    color: "#888",
    marginTop: 6,
    fontSize: 14,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#222",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  descInput: {
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    fontSize: 16,
    color: "#222",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#333",
    height: 80,
    textAlignVertical: "top",
    includeFontPadding: false,
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    marginVertical: 12,
    width: "100%",
  },
  addBtn: {
    backgroundColor: "#F76A86",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  disabledBtn: {
    backgroundColor: "#ccc",
  },
  addBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  cancelBtn: {
    backgroundColor: "#F76A86",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
});
