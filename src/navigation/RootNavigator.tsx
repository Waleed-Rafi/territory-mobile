import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../contexts/AuthContext";
import AuthScreen from "../screens/AuthScreen";
import TabNavigator from "./TabNavigator";
import RunReminderScreen from "../screens/RunReminderScreen";
import NameYourRunScreen from "../screens/NameYourRunScreen";
import { Loader } from "../components/Loaders";
import { colors, typography } from "../theme";
import type { RootStackParamList } from "../types/navigation";

const Stack = createNativeStackNavigator<RootStackParamList>();

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
      <Stack.Screen name="NameYourRun" component={NameYourRunScreen} options={{ headerShown: true, headerTitle: "Name your run", headerBackTitle: "Back", headerTintColor: colors.primary, headerStyle: { backgroundColor: colors.background }, headerShadowVisible: false }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
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
