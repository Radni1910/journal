import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import * as LocalAuth from "expo-local-authentication";

export default function LockScreen({ onUnlock }) {
  const [loading, setLoading] = useState(false);
  const theme = useColorScheme();

  const unlock = async () => {
    setLoading(true);
    try {
      const hasHardware = await LocalAuth.hasHardwareAsync();
      const isEnrolled = await LocalAuth.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert(
          "Biometric Unlock",
          "Biometric authentication is not available. Please enable it in your device settings.",
          [{ text: "OK", onPress: () => onUnlock() }]
        );
        setLoading(false);
        return;
      }

      const res = await LocalAuth.authenticateAsync({
        promptMessage: "Unlock Your Journal",
        cancelLabel: "Cancel",
        disableDeviceFallback: false,
      });

      if (res.success) {
        onUnlock();
      } else if (res.error === "user_cancel") {
        // User cancelled, do nothing
      } else {
        Alert.alert("Authentication Failed", "Please try again.");
      }
    } catch (error) {
      Alert.alert("Error", "Unable to authenticate. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const backgroundColor = theme === "dark" ? "#1a1a1a" : "#b8d3a6";
  const textColor = theme === "dark" ? "#fff" : "#000";

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.content}>
        {/* Lock Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.lockEmoji}>🔒</Text>
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: textColor }]}>
          Journal Locked
        </Text>
        <Text style={[styles.subtitle, { color: textColor }]}>
          Authenticate to access your journal entries
        </Text>

        {/* Unlock Button */}
        <TouchableOpacity
          style={[styles.unlockButton, loading && styles.buttonDisabled]}
          onPress={unlock}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.unlockEmoji}>👆</Text>
              <Text style={styles.buttonText}>Unlock Journal</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Hint */}
        <Text style={[styles.hint, { color: textColor }]}>
          Use your fingerprint or face ID
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  iconContainer: {
    marginBottom: 30,
  },
  lockEmoji: {
    fontSize: 80,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 40,
    opacity: 0.7,
    paddingHorizontal: 20,
  },
  unlockButton: {
    backgroundColor: "#40916c",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 40,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  unlockEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  hint: {
    marginTop: 30,
    fontSize: 14,
    opacity: 0.6,
    fontStyle: "italic",
  },
});
