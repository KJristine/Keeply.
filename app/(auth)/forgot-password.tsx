import { db } from "@/config/firebase";
import { useRouter } from "expo-router";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import LottieView from "lottie-react-native";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import sanitizeHtml from "sanitize-html";

const { width, height } = Dimensions.get("window");

const ForgotPassword = () => {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const fetchEmailFromUsername = async (
    username: string
  ): Promise<string | null> => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", username));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      return querySnapshot.docs[0].data().email || null;
    } catch (error) {
      console.error("Error fetching email from username:", error);
      return null;
    }
  };

  const handlePasswordReset = async () => {
    if (!emailOrUsername.trim()) {
      Alert.alert("Error", "Please enter your email or username.");
      return;
    }

    setIsLoading(true);

    try {
      let resetEmail = emailOrUsername.trim();

      // Check if input is an email or username
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailOrUsername)) {
        // If it's not an email, try to fetch email using username
        const fetchedEmail = await fetchEmailFromUsername(emailOrUsername);
        if (!fetchedEmail) {
          Alert.alert(
            "User Not Found",
            "No account found with this username. Please check and try again."
          );
          setIsLoading(false);
          return;
        }
        resetEmail = fetchedEmail;
      }

      // Sanitize the email
      resetEmail = sanitizeHtml(resetEmail, {
        allowedTags: [],
        allowedAttributes: {},
      });

      const auth = getAuth();
      await sendPasswordResetEmail(auth, resetEmail);

      Alert.alert(
        "Reset Email Sent",
        `A password reset email has been sent to ${resetEmail}. Please check your inbox and follow the instructions.`,
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      let errorMessage = "Failed to send reset email";
      let customErrorMessage = "An error occurred, please try again.";

      switch (error.code) {
        case "auth/user-not-found":
          customErrorMessage = "No account found with this email address.";
          break;
        case "auth/invalid-email":
          customErrorMessage = "Please enter a valid email address.";
          break;
        case "auth/network-request-failed":
          customErrorMessage =
            "Network error occurred. Please check your internet connection.";
          break;
        case "auth/too-many-requests":
          customErrorMessage =
            "Too many reset attempts. Please try again later.";
          break;
        default:
          customErrorMessage = "Failed to send reset email. Please try again.";
          break;
      }

      Alert.alert(errorMessage, customErrorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={styles.scrollContainer}
      enableOnAndroid
      extraScrollHeight={Platform.OS === "ios" ? 20 : 40}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <LottieView
        source={require("../../assets/animations/login.json")}
        autoPlay
        loop
        style={styles.animation}
      />

      <Text style={styles.title}>Forgot Password?</Text>
      <Text style={styles.subtitle}>
        Enter your email or username and we'll send you a link to reset your
        password
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email or Username"
        placeholderTextColor="#aaa"
        autoCapitalize="none"
        value={emailOrUsername}
        onChangeText={setEmailOrUsername}
        editable={!isLoading}
        keyboardType="email-address"
      />

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handlePasswordReset}
        disabled={isLoading}
        activeOpacity={0.9}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.buttonText}>Send Reset Email</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        disabled={isLoading}
      >
        <Text style={styles.backButtonText}>Back to Login</Text>
      </TouchableOpacity>
    </KeyboardAwareScrollView>
  );
};

export default ForgotPassword;

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: width * 0.05,
    paddingBottom: height * 0.05,
    backgroundColor: "#fff",
  },
  animation: {
    width: width * 0.6,
    height: width * 0.6,
    marginBottom: height * 0.02,
  },
  title: {
    fontSize: width * 0.08,
    fontWeight: "900",
    color: "#333",
    marginTop: -height * 0.02,
    textAlign: "center",
    marginBottom: height * 0.01,
  },
  subtitle: {
    fontSize: width * 0.04,
    fontWeight: "500",
    color: "#666",
    marginBottom: height * 0.04,
    textAlign: "center",
    paddingHorizontal: width * 0.05,
    lineHeight: width * 0.055,
  },
  input: {
    width: "100%",
    height: height * 0.065,
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: width * 0.04,
    fontSize: width * 0.045,
    color: "#333",
    marginBottom: height * 0.025,
    borderWidth: 1,
    borderColor: "#000",
  },
  button: {
    width: "100%",
    height: height * 0.065,
    backgroundColor: "#F76A86",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    marginBottom: height * 0.02,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 6,
    borderWidth: 2,
    borderColor: "#333",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: width * 0.05,
    fontWeight: "bold",
  },
  backButton: {
    marginTop: height * 0.01,
  },
  backButtonText: {
    color: "#F76A86",
    fontSize: width * 0.04,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
