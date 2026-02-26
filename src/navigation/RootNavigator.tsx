import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { ChevronLeft } from "lucide-react-native";
import { useAuth } from "../contexts/AuthContext";
import AuthScreen from "../screens/AuthScreen";
import TabNavigator from "./TabNavigator";
import RunReminderScreen from "../screens/RunReminderScreen";
import NameYourRunScreen from "../screens/NameYourRunScreen";
import TermsScreen from "../screens/TermsScreen";
import AboutScreen from "../screens/AboutScreen";
import ActivityDetailScreen from "../screens/ActivityDetailScreen";
import LevelProgressionScreen from "../screens/LevelProgressionScreen";
import { Loader } from "../components/Loaders";
import { colors, typography } from "../theme";
import type { RootStackParamList } from "../types/navigation";

const Stack = createNativeStackNavigator<RootStackParamList>();

function HeaderBackButton(): React.ReactElement {
  const navigation = useNavigation();
  return (
    <TouchableOpacity
      onPress={() => navigation.goBack()}
      style={styles.headerBack}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      activeOpacity={0.7}
    >
      <ChevronLeft size={18} stroke={colors.primary} strokeWidth={2} />
      <Text style={styles.headerBackLabel}>Back</Text>
    </TouchableOpacity>
  );
}

const screenOptionsWithBack = (title: string) => ({
  headerShown: true,
  headerTitle: title,
  headerTitleStyle: { fontFamily: typography.display, fontSize: 16, fontWeight: "700" as const, color: colors.foreground },
  headerStyle: { backgroundColor: colors.background },
  headerShadowVisible: false,
  headerBackTitleVisible: false,
  headerLeft: () => <HeaderBackButton />,
});

export default function RootNavigator(): React.ReactElement {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <Loader type="spinnerLarge" color={colors.primary} />
        <Text style={styles.loadingText}>LOADING</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Auth">
          {() => <AuthScreen onAuthSuccess={() => {}} />}
        </Stack.Screen>
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen name="RunReminder" component={RunReminderScreen} />
      <Stack.Screen name="NameYourRun" component={NameYourRunScreen} options={screenOptionsWithBack("Name your run")} />
      <Stack.Screen name="Terms" component={TermsScreen} options={screenOptionsWithBack("Terms and Conditions")} />
      <Stack.Screen name="About" component={AboutScreen} options={screenOptionsWithBack("About & Privacy")} />
      <Stack.Screen name="ActivityDetail" component={ActivityDetailScreen} options={screenOptionsWithBack("Activity")} />
      <Stack.Screen name="LevelProgression" component={LevelProgressionScreen} options={screenOptionsWithBack("Level")} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  headerBack: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 4,
    paddingRight: 8,
    paddingVertical: 6,
  },
  headerBackLabel: {
    fontSize: 13,
    color: colors.primary,
    marginLeft: 2,
    fontWeight: "500",
  },
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 12,
    color: colors.mutedForeground,
    fontFamily: typography.display,
    letterSpacing: 2,
  },
});
