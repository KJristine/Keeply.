import { auth, db } from "@/config/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateEmail,
  updatePassword,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import sanitizeHtml from 'sanitize-html';

const { width, height } = Dimensions.get("window");

// Responsive helper functions
const wp = (percentage: number) => (width * percentage) / 100;
const hp = (percentage: number) => (height * percentage) / 100;

// Font scale helper for better cross-platform text sizing
const getFontSize = (size: number) => {
  const scale = width / 375;
  const newSize = size * scale;
  return Math.max(newSize, size * 0.8);
};

export default function ProfileModal() {
  const { currentUser } = useAuth();
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [editing, setEditing] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const router = useRouter();

  // Account settings state
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (currentUser) fetchUserData();
  }, [currentUser]);

  const fetchUserData = async () => {
    if (!currentUser) return;
    setFetchingData(true);
    try {
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUsername(userData.username || currentUser.displayName || "User");
        setBio(userData.bio || "");
        setProfilePhoto(userData.profileUrl || null);
        setCoverPhoto(userData.coverUrl || null);
        setNewEmail(currentUser.email || "");
      } else {
        await setDoc(doc(db, "users", currentUser.uid), {
          username: currentUser.displayName || "User",
          email: currentUser.email,
          bio: "Tell us about yourself...",
          createdAt: new Date(),
        });
        setUsername(currentUser.displayName || "User");
      }
    } catch (error) {
      console.error("fetchUserData error:", error);
      Alert.alert("Error", "Failed to load user data");
    } finally {
      setFetchingData(false);
    }
  };

  const sanitizeInput = (text: string) => {
    return sanitizeHtml(text, {
      allowedTags: [], // No HTML tags allowed
      allowedAttributes: {}, // No attributes allowed
    });
  };

  const pickImage = async (
    setter: (uri: string) => void,
    type: "profile" | "cover"
  ) => {
    if (!currentUser) {
      Alert.alert("Error", "You must be logged in to update your profile");
      return;
    }
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "We need camera roll permission to change your photo"
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === "profile" ? [1, 1] : [16, 9],
        quality: 0.2,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsLoading(true);
        const localUri = result.assets[0].uri;
        const filename = localUri.split("/").pop() || "image";
        let fileType = "image/jpeg";
        if (filename.toLowerCase().endsWith(".png")) fileType = "image/png";
        else if (filename.toLowerCase().endsWith(".gif"))
          fileType = "image/gif";
        else if (filename.toLowerCase().endsWith(".webp"))
          fileType = "image/webp";
        const formData = new FormData();
        const imageObject =
          Platform.OS === "ios"
            ? { uri: localUri, type: fileType, name: filename }
            : { uri: localUri, type: fileType, name: filename };
        // @ts-ignore
        formData.append("image", imageObject);
        const IMGBB_API_KEY = "40c0d39660f1471beb29946ab8b5291b";
        const response = await axios({
          method: "post",
          url: `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
          data: formData,
          headers: {
            "Content-Type": "multipart/form-data",
            Accept: "application/json",
          },
          timeout: 30000,
          maxContentLength: 10 * 1024 * 1024,
        });
        if (
          !response.data ||
          !response.data.data ||
          !response.data.data.display_url
        ) {
          throw new Error("Invalid response from image server");
        }
        const imageUrl = response.data.data.display_url;
        const userDocRef = doc(db, "users", currentUser.uid);
        const updateField =
          type === "profile"
            ? { profileUrl: imageUrl }
            : { coverUrl: imageUrl };
        await updateDoc(userDocRef, updateField);
        setter(imageUrl);
        Alert.alert("Success", "Image updated successfully");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to upload image");
    } finally {
      setIsLoading(false);
    }
  };

  const saveBio = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      await updateDoc(userDocRef, { bio });
      setEditing(false);
      Alert.alert("Success", "Bio updated successfully");
    } catch (error) {
      Alert.alert("Error", "Failed to update bio");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        onPress: async () => {
          try {
            await auth.signOut();
            router.replace("/(auth)/welcome");
          } catch (error) {
            Alert.alert("Error", "Failed to sign out");
          }
        },
      },
    ]);
  };

  const openAccountSettings = () => {
    if (currentUser) {
      setNewEmail(currentUser.email || "");
      setShowAccountSettings(true);
    }
  };

  const closeAccountSettings = () => {
    setShowAccountSettings(false);
    setCurrentPassword("");
    setNewEmail("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const updateUserEmail = async () => {
    if (!currentUser || !currentPassword) {
      Alert.alert("Error", "Please enter your current password");
      return;
    }
    if (!newEmail) {
      Alert.alert("Error", "Please enter a new email");
      return;
    }
    setIsLoading(true);
    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email || "",
        currentPassword
      );
      await reauthenticateWithCredential(currentUser, credential);
      await updateEmail(currentUser, newEmail);
      const userDocRef = doc(db, "users", currentUser.uid);
      await updateDoc(userDocRef, { email: newEmail });
      Alert.alert("Success", "Email updated successfully");
      setCurrentPassword("");
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to update email. Please check your password."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserPassword = async () => {
    if (!currentUser || !currentPassword) {
      Alert.alert("Error", "Please enter your current password");
      return;
    }
    if (!newPassword) {
      Alert.alert("Error", "Please enter a new password");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords don't match");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Error", "Password should be at least 6 characters");
      return;
    }
    setIsLoading(true);
    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email || "",
        currentPassword
      );
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      Alert.alert("Success", "Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to update password. Please check your current password."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const updateUsernameInSettings = async () => {
    if (!currentUser || !username.trim()) {
      Alert.alert("Error", "Username cannot be empty");
      return;
    }
    setIsLoading(true);
    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      await updateDoc(userDocRef, { username });
      Alert.alert("Success", "Username updated successfully");
    } catch (error) {
      Alert.alert("Error", "Failed to update username");
    } finally {
      setIsLoading(false);
    }
  };

  if (fetchingData) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#F76A86" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Cover Photo */}
        <View style={styles.coverContainer}>
          <Image
            source={
              coverPhoto
                ? { uri: coverPhoto }
                : require("@/assets/images/favicon.png")
            }
            style={styles.coverPhoto}
            resizeMode="cover"
            key={coverPhoto || "default-cover"}
          />
          <TouchableOpacity
            style={styles.coverCameraButton}
            onPress={() => pickImage(setCoverPhoto, "cover")}
            disabled={isLoading}
          >
            <Ionicons name="camera" size={wp(4)} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Profile Photo */}
        <View style={styles.profileSection}>
          <View style={styles.profilePhotoContainer}>
            <Image
              source={
                profilePhoto
                  ? { uri: profilePhoto }
                  : require("@/assets/images/favicon.png")
              }
              style={styles.profilePhoto}
              key={profilePhoto || "default-profile"}
            />
            <TouchableOpacity
              style={styles.profileCameraButton}
              onPress={() => pickImage(setProfilePhoto, "profile")}
              disabled={isLoading}
            >
              <Ionicons name="camera" size={wp(3.5)} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.usernameContainer}>
            <Text style={styles.username}>{username}</Text>
          </View>
        </View>

        {/* Bio Section */}
        <View style={styles.bioContainer}>
          {editing ? (
            <>
              <TextInput
                value={bio}
                onChangeText={(text) => setBio(sanitizeInput(text))}  // Apply sanitization
                multiline
                style={styles.bioInput}
                placeholder="Tell us about yourself..."
                placeholderTextColor="#999"
              />
              <TouchableOpacity
                onPress={saveBio}
                style={styles.saveButton}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              onPress={() => setEditing(true)}
              style={styles.bioTextContainer}
              disabled={isLoading}
            >
              <Text style={styles.bioText}>{bio || "Tap to add a bio."}</Text>
              <Ionicons name="pencil" size={wp(3.5)} color="#F76A86" />
            </TouchableOpacity>
          )}
        </View>

        {/* About Us Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>About Us</Text>
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <FontAwesome6 name="discord" size={wp(4.5)} color="#7289DA" />
              <Text style={styles.menuItemText}>Discord</Text>
            </View>
            <Ionicons name="chevron-forward" size={wp(4)} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="people" size={wp(4.5)} color="#F76A86" />
              <Text style={styles.menuItemText}>Team</Text>
            </View>
            <Ionicons name="chevron-forward" size={wp(4)} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Support</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() =>
              Alert.alert("Report", "Thank you for your feedback!")
            }
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="warning-outline" size={wp(4.5)} color="#F59E0B" />
              <Text style={styles.menuItemText}>Report a Problem</Text>
            </View>
            <Ionicons name="chevron-forward" size={wp(4)} color="#9CA3AF" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="log-out-outline" size={wp(4.5)} color="#EF4444" />
              <Text style={styles.menuItemText}>Sign Out</Text>
            </View>
            <Ionicons name="chevron-forward" size={wp(4)} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Account Settings Modal */}
      <Modal
        visible={showAccountSettings}
        animationType="slide"
        transparent={true}
        onRequestClose={closeAccountSettings}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Account Settings</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeAccountSettings}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={wp(4)} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              {/* Username Section */}
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Username</Text>
                <TextInput
                  value={username}
                  onChangeText={(text) => setUsername(sanitizeInput(text))}  // Apply sanitization
                  style={styles.settingsInput}
                  placeholder="Enter username"
                  placeholderTextColor="#999"
                  maxLength={20}
                />
                <TouchableOpacity
                  style={styles.updateButton}
                  onPress={updateUsernameInSettings}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.updateButtonText}>Update Username</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Email Section */}
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Email Address</Text>
                <TextInput
                  value={newEmail}
                  onChangeText={(text) => setNewEmail(sanitizeInput(text))}  // Apply sanitization
                  style={styles.settingsInput}
                  placeholder="Enter new email"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TextInput
                  value={currentPassword}
                  onChangeText={(text) => setCurrentPassword(sanitizeInput(text))}  // Apply sanitization
                  style={styles.settingsInput}
                  placeholder="Current password"
                  placeholderTextColor="#999"
                  secureTextEntry
                />
                <TouchableOpacity
                  style={styles.updateButton}
                  onPress={updateUserEmail}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.updateButtonText}>Update Email</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Password Section */}
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Change Password</Text>
                <TextInput
                  value={currentPassword}
                  onChangeText={(text) => setCurrentPassword(sanitizeInput(text))}  // Apply sanitization
                  style={styles.settingsInput}
                  placeholder="Current password"
                  placeholderTextColor="#999"
                  secureTextEntry
                />
                <TextInput
                  value={newPassword}
                  onChangeText={(text) => setNewPassword(sanitizeInput(text))}  // Apply sanitization
                  style={styles.settingsInput}
                  placeholder="New password"
                  placeholderTextColor="#999"
                  secureTextEntry
                />
                <TextInput
                  value={confirmPassword}
                  onChangeText={(text) => setConfirmPassword(sanitizeInput(text))}  // Apply sanitization
                  style={styles.settingsInput}
                  placeholder="Confirm new password"
                  placeholderTextColor="#999"
                  secureTextEntry
                />
                <TouchableOpacity
                  style={styles.updateButton}
                  onPress={updateUserPassword}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.updateButtonText}>Update Password</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#F76A86" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: wp(4),
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: hp(1),
    fontSize: getFontSize(14),
    color: "#666",
    fontWeight: "500",
  },
  loadingOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
  },
  scrollContent: {
    paddingBottom: hp(2),
  },
  coverContainer: {
    position: "relative",
    height: hp(18),
    width: "100%",
  },
  coverPhoto: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f0f0f0",
  },
  coverCameraButton: {
    position: "absolute",
    bottom: hp(1),
    right: wp(3),
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: wp(1.5),
    borderRadius: wp(3),
  },
  profileSection: {
    alignItems: "center",
    marginTop: -hp(4),
    paddingHorizontal: wp(4),
  },
  profilePhotoContainer: {
    position: "relative",
  },
  profilePhoto: {
    width: wp(18),
    height: wp(18),
    borderRadius: wp(9),
    borderWidth: wp(0.8),
    borderColor: "#fff",
    backgroundColor: "#f0f0f0",
  },
  profileCameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#F76A86",
    padding: wp(1),
    borderRadius: wp(3),
    borderWidth: wp(0.3),
    borderColor: "#fff",
  },
  usernameContainer: {
    marginTop: hp(1),
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.3),
    alignItems: "center",
  },
  username: {
    fontSize: getFontSize(18),
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
  },
  bioContainer: {
    marginTop: hp(2),
    paddingHorizontal: wp(4),
  },
  bioTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: wp(2.5),
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: wp(1.5),
    minHeight: hp(4.5),
  },
  bioInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: wp(1.5),
    padding: wp(2.5),
    minHeight: hp(7),
    textAlignVertical: "top",
    backgroundColor: "#fff",
    fontSize: getFontSize(13),
    color: "#333",
  },
  bioText: {
    fontSize: getFontSize(13),
    color: "#444",
    flex: 1,
    lineHeight: getFontSize(18),
  },
  saveButton: {
    backgroundColor: "#F76A86",
    marginTop: hp(1),
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(4),
    borderRadius: wp(3),
    alignSelf: "flex-end",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: getFontSize(12),
  },
  sectionContainer: {
    marginTop: hp(2.5),
    paddingHorizontal: wp(4),
  },
  sectionTitle: {
    fontSize: getFontSize(16),
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: hp(1),
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: hp(1),
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    minHeight: hp(4.5),
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuItemText: {
    marginLeft: wp(2.5),
    fontSize: getFontSize(14),
    color: "#374151",
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: wp(4),
  },
  modalContainer: {
    width: "100%",
    maxWidth: wp(85),
    maxHeight: hp(75),
    backgroundColor: "#fff",
    borderRadius: wp(4),
    padding: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: hp(0.5) },
    shadowOpacity: 0.3,
    shadowRadius: wp(3),
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: wp(4),
    paddingTop: hp(2),
    paddingBottom: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  modalTitle: {
    fontSize: getFontSize(17),
    fontWeight: "700",
    color: "#111827",
    flex: 1,
  },
  closeButton: {
    width: wp(7),
    height: wp(7),
    borderRadius: wp(3.5),
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: wp(4),
  },
  modalScrollContent: {
    paddingBottom: hp(1.5),
  },
  settingsSection: {
    paddingVertical: hp(1.8),
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  settingsSectionTitle: {
    fontSize: getFontSize(14),
    fontWeight: "600",
    marginBottom: hp(1.2),
    color: "#374151",
  },
  settingsInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: wp(2),
    padding: wp(3),
    marginBottom: hp(1),
    fontSize: getFontSize(13),
    backgroundColor: "#f9fafb",
    color: "#111827",
    minHeight: hp(4.5),
  },
  updateButton: {
    backgroundColor: "#F76A86",
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(3),
    borderRadius: wp(2),
    alignItems: "center",
    marginTop: hp(0.5),
    shadowColor: "#F76A86",
    shadowOffset: { width: 0, height: hp(0.3) },
    shadowOpacity: 0.3,
    shadowRadius: wp(1.5),
    elevation: 4,
  },
  updateButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: getFontSize(13),
  },
});
