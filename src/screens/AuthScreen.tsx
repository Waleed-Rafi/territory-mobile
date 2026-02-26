import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Loader } from "../components/Loaders";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react-native";
import { BlurView } from "expo-blur";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "../supabase/client";
import { useAlert } from "../contexts/AlertContext";
import { colors, radius, spacing, typography } from "../theme";

export interface AuthScreenProps {
  onAuthSuccess: () => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps): React.ReactElement {
  const alert = useAlert();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const show = (msg: string, isError = false) => {
    alert.show(isError ? "Error" : "Success", msg);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        show("Welcome back, runner!");
        onAuthSuccess();
      } else {
        if (username.length < 3) {
          show("Username must be at least 3 characters", true);
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username, display_name: username },
          },
        });
        if (error) throw error;
        show("Account created! Sign in with your email and password.");
      }
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : "Authentication failed", true);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async (): Promise<void> => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: "territory://auth/callback",
        },
      });
      if (error) throw error;
      if (data?.url) {
        const result = await WebBrowser.openBrowserAsync(data.url, { createTask: false });
        if (result?.type === "dismiss") onAuthSuccess();
      }
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : "Google sign-in failed", true);
    }
  };

  const inputStyle = [styles.input, { borderColor: colors.border }];
  const iconSize = 18;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logo}>
          <Text style={styles.title}>TERRITORY</Text>
          <Text style={styles.subtitle}>Run. Claim. Defend.</Text>
        </View>

        {!isLogin && (
          <View style={styles.inputWrap}>
            <User size={iconSize} stroke={colors.mutedForeground} style={styles.inputIcon} />
            <TextInput
              placeholder="Username"
              placeholderTextColor={colors.mutedForeground}
              value={username}
              onChangeText={setUsername}
              style={inputStyle}
              autoCapitalize="none"
              maxLength={20}
            />
          </View>
        )}

        <View style={styles.inputWrap}>
          <Mail size={iconSize} stroke={colors.mutedForeground} style={styles.inputIcon} />
          <TextInput
            placeholder="Email"
            placeholderTextColor={colors.mutedForeground}
            value={email}
            onChangeText={setEmail}
            style={inputStyle}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        </View>

        <View style={styles.inputWrap}>
          <Lock size={iconSize} stroke={colors.mutedForeground} style={styles.inputIcon} />
          <TextInput
            placeholder="Password"
            placeholderTextColor={colors.mutedForeground}
            value={password}
            onChangeText={setPassword}
            style={[inputStyle, { paddingRight: 48 }]}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete={isLogin ? "password" : "new-password"}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeButton}
          >
            {showPassword ? (
              <EyeOff size={iconSize} stroke={colors.mutedForeground} />
            ) : (
              <Eye size={iconSize} stroke={colors.mutedForeground} />
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
          activeOpacity={0.9}
        >
          {loading ? (
            <Loader type="spinner" color={colors.primaryForeground} />
          ) : (
            <Text style={styles.primaryButtonText}>
              {isLogin ? "SIGN IN" : "CREATE ACCOUNT"}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={styles.dividerText}>or</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        <TouchableOpacity
          onPress={handleGoogleSignIn}
          style={styles.googleButton}
          activeOpacity={0.9}
        >
          <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setIsLogin(!isLogin)}
          style={styles.toggleWrap}
          activeOpacity={0.7}
        >
          <Text style={styles.toggleText}>
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          </Text>
          <Text style={styles.toggleLink}>{isLogin ? "Sign up" : "Sign in"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing["2xl"],
    minHeight: "100%",
  },
  logo: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontFamily: typography.display,
    fontSize: 28,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 4,
    textShadowColor: "rgba(0, 255, 136, 0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  subtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginTop: 8,
  },
  inputWrap: {
    width: "100%",
    maxWidth: 360,
    marginBottom: spacing.lg,
    position: "relative",
  },
  inputIcon: {
    position: "absolute",
    left: 12,
    top: "50%",
    marginTop: -9,
    zIndex: 1,
  },
  input: {
    width: "100%",
    backgroundColor: colors.secondary,
    color: colors.foreground,
    paddingLeft: 40,
    paddingRight: spacing.lg,
    paddingVertical: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    fontSize: 16,
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    top: "50%",
    marginTop: -9,
    padding: 4,
  },
  primaryButton: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontFamily: typography.display,
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 2,
    color: colors.primaryForeground,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    maxWidth: 360,
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  googleButton: {
    width: "100%",
    maxWidth: 360,
    paddingVertical: 14,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  googleButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.foreground,
  },
  toggleWrap: {
    flexDirection: "row",
    marginTop: 24,
    alignItems: "center",
  },
  toggleText: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  toggleLink: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
});
