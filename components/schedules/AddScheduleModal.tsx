import { AddScheduleModalProps } from "@/types/props";
import { Ionicons } from "@expo/vector-icons";
import CryptoJS from 'crypto-js'; // You'll need: npm install crypto-js
import React from "react";
import {
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import sanitizeHtml from 'sanitize-html';
import { auth } from '../../config/firebase'; // Updated to match your Firebase config location

import { APP_SECRET_SALT } from '@env';

// Encryption utilities
const IV_LENGTH = 16;

// Generate user-specific encryption key from their UID
const getUserEncryptionKey = async (): Promise<string> => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  
  // Derive a unique key for this user
  const key = CryptoJS.PBKDF2(user.uid, APP_SECRET_SALT, {
    keySize: 256/32, // 32 bytes for AES-256
    iterations: 10000 // Strong key derivation
  }).toString();
  
  return key;
};

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

export default function AddScheduleModal({
  visible,
  fadeAnim,
  subject,
  setSubject,
  selectedDate,
  setSelectedDate,
  time,
  showTimePickerHandler,
  onClose,
  onSubmit,
  isLoading,
  editing,
}: AddScheduleModalProps) {
  
  // Sanitize subject before setting it to state
  const handleSubjectChange = (text: string) => {
    const sanitizedText = sanitizeHtml(text, {
      allowedTags: [],
      allowedAttributes: {}
    });
    setSubject(sanitizedText);
  };

  // Enhanced submit handler with encryption
  const handleEncryptedSubmit = async () => {
    try {
      // Encrypt the data
      const encryptedSubject = await encryptData(subject.trim());
      const encryptedTime = await encryptData(time.trim());
      
      // Create a temporary object with encrypted values
      const encryptedData = {
        subject: encryptedSubject,
        time: encryptedTime
      };
      
      // Pass the encrypted data to parent component
      onSubmit(encryptedData);
      
    } catch (error) {
      console.error('Failed to encrypt schedule data:', error);
      // Handle encryption error
      onSubmit(); // Fall back to original behavior
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <Animated.View style={[styles.modalBackdrop, { opacity: fadeAnim }]}>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {editing ? "Edit Schedule" : "New Schedule"}
          </Text>

          <ScrollView
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Subject */}
            <Text style={styles.inputLabel}>Subject Title</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="book-outline"
                size={22}
                color="#F76A86"
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="Enter subject"
                value={subject}
                onChangeText={handleSubjectChange}
                style={styles.input}
                placeholderTextColor="#9CA3AF"
                secureTextEntry={false} // Set to true if you want to hide input
              />
            </View>

            {/* Date */}
            <Text style={styles.inputLabel}>Select Date</Text>
            <View style={styles.datePickerContainer}>
              <Calendar
                onDayPress={(day) => setSelectedDate(day.dateString)}
                markedDates={
                  selectedDate
                    ? {
                        [selectedDate]: {
                          selected: true,
                          selectedColor: "#F76A86",
                        },
                      }
                    : {}
                }
                style={styles.miniCalendar}
                theme={{
                  backgroundColor: "#ffffff",
                  calendarBackground: "#ffffff",
                  textSectionTitleColor: "#b6c1cd",
                  selectedDayBackgroundColor: "#F76A86",
                  selectedDayTextColor: "#ffffff",
                  todayTextColor: "#F76A86",
                  dayTextColor: "#2d4150",
                  arrowColor: "#F76A86",
                }}
              />
            </View>

            {/* Time */}
            <Text style={styles.inputLabel}>Time</Text>
            <TouchableOpacity
              style={styles.inputContainer}
              onPress={showTimePickerHandler}
            >
              <Ionicons
                name="time-outline"
                size={22}
                color="#F76A86"
                style={styles.inputIcon}
              />
              <TextInput
                value={time}
                placeholder="Select time"
                style={styles.input}
                placeholderTextColor="#9CA3AF"
                editable={false}
                pointerEvents="none"
              />
              <Ionicons
                name="chevron-down-outline"
                size={20}
                color="#9CA3AF"
                style={{ marginRight: 10 }}
              />
            </TouchableOpacity>

            {/* Submit */}
            <TouchableOpacity
              style={[
                styles.confirmButton,
                (!subject.trim() || !time.trim() || !selectedDate) &&
                  styles.confirmButtonDisabled,
              ]}
              onPress={handleEncryptedSubmit} // Use encrypted submit handler
              disabled={
                !subject.trim() || !time.trim() || !selectedDate || isLoading
              }
            >
              {isLoading ? (
                <Text style={styles.confirmButtonText}>Loading...</Text>
              ) : (
                <Text style={styles.confirmButtonText}>
                  {editing ? "Update Schedule" : "Add Schedule"}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Animated.View>
    </Modal>
  );
}

// Export encryption utilities for use in other components
export { decryptData, encryptData, getUserEncryptionKey };

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(240,240,240,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "stretch",
    maxHeight: "90%",
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 15,
    padding: 8,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 20,
    color: "#1F2937",
    textAlign: "center",
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#4B5563",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
  },
  inputIcon: {
    paddingLeft: 14,
  },
  input: {
    flex: 1,
    padding: 14,
    fontSize: 16,
    color: "#374151",
  },
  datePickerContainer: {
    marginBottom: 16,
  },
  miniCalendar: {
    height: 310,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  confirmButton: {
    backgroundColor: "#F76A86",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  confirmButtonDisabled: {
    backgroundColor: "#F3ABAB",
  },
  confirmButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});