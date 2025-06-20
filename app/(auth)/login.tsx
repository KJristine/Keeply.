import { db } from "@/config/firebase";
import { useRouter } from "expo-router";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
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
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import sanitizeHtml from "sanitize-html";

const { width, height } = Dimensions.get("window");

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false); // State for password visibility
  const router = useRouter();

  const fetchEmailFromUsername = async (
    username: string
  ): Promise<string | null> => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", username));

      // Ensure query executes correctly by awaiting the promise
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      // Retrieve the first document's email field
      return querySnapshot.docs[0].data().email || null;
    } catch (error) {
      console.error("Error fetching email from username:", error);
      return null;
    }
  };

  const fetchUsernameFromUserId = async (
    userId: string
  ): Promise<string | null> => {
    try {
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        return userDoc.data().username || null;
      }

      return null;
    } catch (error) {
      console.error("Error fetching username from user ID:", error);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Login", "Please fill in all fields.");
      return;
    }

    setIsLoading(true);

    try {
      let loginEmail = email;

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        // If email is not provided, attempt to resolve it with the username
        const usernameToEmail = await fetchEmailFromUsername(email);
        if (!usernameToEmail) {
          throw new Error("No account found for the provided username.");
        }
        loginEmail = usernameToEmail;
      }

      // Sanitize the login email (which can be a username or email address)
      loginEmail = sanitizeHtml(loginEmail, {
        allowedTags: [],
        allowedAttributes: {},
      });

      const auth = getAuth();
      const userCredential = await signInWithEmailAndPassword(
        auth,
        loginEmail,
        password
      );

      // Fetch username from Firestore using the user's UID
      const username = await fetchUsernameFromUserId(userCredential.user.uid);

      Alert.alert("Success", `Welcome back, ${username || "User"}!`);
      router.replace("/(tabs)/home"); // Redirect to the home page
    } catch (error: any) {
      let errorMessage = "Login Failed";
      let customErrorMessage = "An error occurred, please try again."; // Default error message

      // Handle specific Firebase authentication errors
      switch (error.code) {
        case "auth/wrong-password":
          customErrorMessage = "Incorrect password. Please try again.";
          break;
        case "auth/user-not-found":
          customErrorMessage = "No account found for this email/username.";
          break;
        case "auth/invalid-email":
          customErrorMessage = "Please enter a valid email address.";
          break;
        case "auth/invalid-credential":
          customErrorMessage =
            "Invalid credentials. Please check your email and password.";
          break;
        case "auth/network-request-failed":
          customErrorMessage =
            "Network error occurred. Please check your internet connection.";
          break;
        case "auth/too-many-requests":
          customErrorMessage = "Too many attempts. Please try again later.";
          break;
        default:
          customErrorMessage =
            "An unexpected error occurred. Please try again.";
          break;
      }

      // Remove Firebase-specific error part
      const formattedErrorMessage = error.message.replace(
        /Firebase: Error \([^)]+\)/,
        ""
      );

      // Show the Alert with the custom error message
      Alert.alert(errorMessage, customErrorMessage || formattedErrorMessage);
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
      <Text style={styles.title}>Welcome Back!</Text>
      <Text style={styles.subtitle}>Please enter your credentials</Text>

      <TextInput
        style={styles.input}
        placeholder="Username or Email"
        placeholderTextColor="#aaa"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        editable={!isLoading}
      />

      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#aaa"
          secureTextEntry={!isPasswordVisible} // Toggles visibility based on state
          value={password}
          onChangeText={setPassword}
          editable={!isLoading}
        />
        <TouchableOpacity
          onPress={() => setIsPasswordVisible(!isPasswordVisible)} // Toggle password visibility
          style={styles.eyeIcon}
        >
          <Text style={styles.eyeText}>
            {isPasswordVisible ? "Hide" : "Show"} {/* Toggle text */}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.forgotPasswordContainer}
        disabled={isLoading}
        onPress={() => router.push("/(auth)/forgot-password")} // Add this line
      >
        <Text style={styles.forgotPassword}>Forgot Password?</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={isLoading}
        activeOpacity={0.9}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>

      <View style={styles.signUpContainer}>
        <Text style={styles.signUpText}>Don't have an account?</Text>
        <TouchableOpacity
          onPress={() => router.push("/(auth)/signup")}
          disabled={isLoading}
        >
          <Text style={styles.signUpLink}> Sign Up</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAwareScrollView>
  );
};

export default Login;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: width * 0.05,
    paddingBottom: height * 0.05,
  },
  animation: {
    width: width * 0.7,
    height: width * 0.7,
    marginBottom: height * 0.02,
  },
  title: {
    fontSize: width * 0.09,
    fontWeight: "900",
    color: "#333",
    marginTop: -height * 0.02,
    textAlign: "center",
  },
  subtitle: {
    fontSize: width * 0.045,
    fontWeight: "500",
    color: "#666",
    marginBottom: height * 0.03,
    textAlign: "center",
  },
  input: {
    width: "100%",
    height: height * 0.065,
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: width * 0.04,
    fontSize: width * 0.045,
    color: "#333",
    marginBottom: height * 0.018,
    borderWidth: 1,
    borderColor: "#000",
  },
  forgotPasswordContainer: {
    width: "100%",
    alignItems: "flex-end",
    marginBottom: height * 0.018,
  },
  forgotPassword: {
    color: "#F76A86",
    fontSize: width * 0.037,
  },
  button: {
    width: "100%",
    height: height * 0.065,
    backgroundColor: "#F76A86",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    marginBottom: height * 0.018,
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
  signUpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: height * 0.012,
  },
  signUpText: {
    color: "#666",
    fontSize: width * 0.037,
  },
  signUpLink: {
    color: "#F76A86",
    fontSize: width * 0.037,
    fontWeight: "bold",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    position: "relative",
  },
  eyeIcon: {
    position: "absolute",
    right: width * 0.04,
    top: height * 0.022,
  },
  eyeText: {
    color: "#aaa",
    fontSize: width * 0.045,
  },
});
