import { useAuth } from "@/contexts/AuthContext";
import Checkbox from "expo-checkbox";
import { useRouter } from "expo-router";
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

const { width, height } = Dimensions.get("window");

const Signup = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isChecked, setIsChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const authContext = useAuth();

  const handleSignup = async () => {
    if (!authContext || typeof authContext.signup !== "function") {
      Alert.alert(
        "Error",
        "Authentication service is not available. Please try again later."
      );
      return;
    }

    if (!username.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Sign Up", "Please fill in all fields.");
      return;
    }

    if (!isChecked) {
      Alert.alert(
        "Sign Up",
        "You must agree to the Terms of Service and Privacy Policy."
      );
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Sign Up", "Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Sign Up", "Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);

    try {
      const defaultProfileUrl =
        "https://ui-avatars.com/api/?name=" + encodeURIComponent(username);

      await authContext.signup(email, password, username, defaultProfileUrl);

      router.replace("/(tabs)/home");
    } catch (error: any) {
      Alert.alert(
        "Registration Error",
        error.message || "An unexpected error occurred. Please try again."
      );
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
      <Text style={styles.title}>Create an Account</Text>
      <Text style={styles.subtitle}>
        Create an account and take control today!
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor="#aaa"
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
        editable={!isLoading}
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#aaa"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        editable={!isLoading}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#aaa"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        editable={!isLoading}
      />

      <View style={styles.checkboxContainer}>
        <Checkbox
          value={isChecked}
          onValueChange={setIsChecked}
          color={isChecked ? "#F76A86" : undefined}
          style={styles.checkbox}
          disabled={isLoading}
        />
        <Text style={styles.checkboxText}>
          I agree to the <Text style={styles.link}>Terms</Text> and{" "}
          <Text style={styles.link}>Privacy Policy</Text>
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleSignup}
        disabled={isLoading}
        activeOpacity={0.9}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.buttonText}>Sign Up</Text>
        )}
      </TouchableOpacity>

      <View style={styles.signInContainer}>
        <Text style={styles.signInText}>Already have an account?</Text>
        <TouchableOpacity
          onPress={() => router.push("/(auth)/login")}
          disabled={isLoading}
        >
          <Text style={styles.signInLink}> Sign In</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAwareScrollView>
  );
};

export default Signup;

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
    fontSize: width * 0.08,
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
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: height * 0.025,
    width: "100%",
  },
  checkbox: {
    marginRight: width * 0.025,
    width: width * 0.055,
    height: width * 0.055,
  },
  checkboxText: {
    fontSize: width * 0.037,
    color: "#666",
    flexShrink: 1,
  },
  link: {
    color: "#F76A86",
    fontWeight: "bold",
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
  signInContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: height * 0.012,
  },
  signInText: {
    color: "#666",
    fontSize: width * 0.037,
  },
  signInLink: {
    color: "#F76A86",
    fontSize: width * 0.037,
    fontWeight: "bold",
  },
});
