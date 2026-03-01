import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { Map, Play, Activity, User } from "lucide-react-native";
import MapScreen from "../screens/MapScreen";
import RunScreen from "../screens/RunScreen";
import ActivityScreen from "../screens/ActivityScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { useOfflineSync } from "../hooks/useOfflineSync";
import { colors, typography } from "../theme";
import type { TabParamList } from "../types/navigation";

const Tab = createBottomTabNavigator<TabParamList>();

export default function TabNavigator(): React.ReactElement {
  useOfflineSync();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: styles.tabLabel,
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glassStrong }]} />
          ),
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tab.Screen
        name="Map"
        options={{
          tabBarLabel: "Map",
          tabBarIcon: ({ color, size }) => <Map size={size} stroke={color} />,
        }}
      >
        {() => <MapScreen />}
      </Tab.Screen>
      <Tab.Screen
        name="Run"
        options={{
          tabBarLabel: "Run",
          tabBarIcon: ({ color, size }) => <Play size={size} stroke={color} />,
        }}
      >
        {() => <RunScreen />}
      </Tab.Screen>
      <Tab.Screen
        name="Activity"
        options={{
          tabBarLabel: "Activity",
          tabBarIcon: ({ color, size }) => <Activity size={size} stroke={color} />,
        }}
      >
        {() => <ActivityScreen />}
      </Tab.Screen>
      <Tab.Screen
        name="Profile"
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => <User size={size} stroke={color} />,
        }}
      >
        {() => <ProfileScreen />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
    backgroundColor: "transparent",
    elevation: 0,
    shadowOpacity: 0,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: typography.body,
    fontWeight: "500",
  },
  tabItem: {
    paddingTop: 8,
  },
});
