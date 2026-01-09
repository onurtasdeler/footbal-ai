import React, { useState, useEffect } from 'react';
import {
  View,
  Platform,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Theme
import { COLORS } from '../theme/colors';

// Services
import { hasCompletedOnboarding } from '../services/cacheService';

// ═══════════════════════════════════════════════════════════════════════════════
// SCREENS - Direct imports (React.lazy causes crashes in RN production builds)
// ═══════════════════════════════════════════════════════════════════════════════
import HomeScreen from '../screens/HomeScreen';
import LiveScreen from '../screens/LiveScreen';
import LiveMatchDetailScreen from '../screens/LiveMatchDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MatchAnalysisScreen from '../screens/MatchAnalysisScreen';
import PredictionsScreen from '../screens/PredictionsScreen';
import PaywallScreen from '../screens/PaywallScreen';
import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ═══════════════════════════════════════════════════════════════════════════════
// HOME STACK
// ═══════════════════════════════════════════════════════════════════════════════
const HomeStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: COLORS.bg },
      animation: 'slide_from_right',
    }}
  >
    <Stack.Screen name="HomeMain" component={HomeScreen} />
    <Stack.Screen name="MatchAnalysis" component={MatchAnalysisScreen} />
  </Stack.Navigator>
);

// ═══════════════════════════════════════════════════════════════════════════════
// LIVE STACK
// ═══════════════════════════════════════════════════════════════════════════════
const LiveStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: COLORS.bg },
      animation: 'slide_from_right',
    }}
  >
    <Stack.Screen name="LiveMain" component={LiveScreen} />
    <Stack.Screen name="LiveMatchDetail" component={LiveMatchDetailScreen} />
    <Stack.Screen name="MatchAnalysis" component={MatchAnalysisScreen} />
  </Stack.Navigator>
);

// ═══════════════════════════════════════════════════════════════════════════════
// PREDICTIONS STACK
// ═══════════════════════════════════════════════════════════════════════════════
const PredictionsStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: COLORS.bg },
    }}
  >
    <Stack.Screen name="PredictionsMain" component={PredictionsScreen} />
  </Stack.Navigator>
);

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE STACK
// ═══════════════════════════════════════════════════════════════════════════════
const ProfileStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: COLORS.bg },
    }}
  >
    <Stack.Screen name="ProfileMain" component={ProfileScreen} />
  </Stack.Navigator>
);

// ═══════════════════════════════════════════════════════════════════════════════
// TAB BAR CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════
const TAB_CONFIG = [
  { name: 'Home', label: 'Maçlar', icon: 'football-outline', activeIcon: 'football', component: HomeStack },
  { name: 'Live', label: 'Canlı', icon: 'radio-outline', activeIcon: 'radio', component: LiveStack },
  { name: 'Predictions', label: 'Tahmin', icon: 'analytics-outline', activeIcon: 'analytics', component: PredictionsStack },
  { name: 'Profile', label: 'Profil', icon: 'person-outline', activeIcon: 'person', component: ProfileStack },
];

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOM TAB BAR - Android Safe, Modern Design
// ═══════════════════════════════════════════════════════════════════════════════
const CustomTabBar = ({ state, navigation }) => {
  const insets = useSafeAreaInsets();

  // Extra padding to lift tab bar higher on all devices
  const EXTRA_LIFT = 25;
  const bottomPadding = Math.max(insets.bottom, 10) + EXTRA_LIFT;

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: bottomPadding }]}>
      <View style={styles.tabBarContent}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const tab = TAB_CONFIG[index];

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.7}
              onPress={onPress}
              style={styles.tabButton}
            >
              <View style={[styles.tabIconContainer, isFocused && styles.tabIconActive]}>
                <Ionicons
                  name={isFocused ? tab.activeIcon : tab.icon}
                  size={22}
                  color={isFocused ? COLORS.accent : COLORS.gray500}
                />
              </View>
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN TAB NAVIGATOR
// ═══════════════════════════════════════════════════════════════════════════════
const MainTabs = () => (
  <Tab.Navigator
    tabBar={(props) => <CustomTabBar {...props} />}
    screenOptions={{
      headerShown: false,
      lazy: true,
    }}
  >
    {TAB_CONFIG.map((tab) => (
      <Tab.Screen key={tab.name} name={tab.name} component={tab.component} />
    ))}
  </Tab.Navigator>
);

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT NAVIGATOR
// ═══════════════════════════════════════════════════════════════════════════════
const RootStack = createNativeStackNavigator();

const AppNavigator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      // Production: Check if user has completed onboarding
      const completed = await hasCompletedOnboarding();
      setShowOnboarding(!completed);
    } catch (error) {
      setShowOnboarding(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking onboarding status
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.bg },
        }}
        initialRouteName={showOnboarding ? 'Splash' : 'Main'}
      >
        {/* Splash & Onboarding - Only shown if not completed */}
        <RootStack.Screen
          name="Splash"
          component={SplashScreen}
          options={{
            animation: 'fade',
          }}
        />
        <RootStack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />

        {/* Main App */}
        <RootStack.Screen name="Main" component={MainTabs} />
        <RootStack.Screen
          name="Paywall"
          component={PaywallScreen}
          options={{
            presentation: 'transparentModal',
            animation: 'fade',
          }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Custom Tab Bar - Modern & Safe
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
  },
  tabBarContent: {
    flexDirection: 'row',
    backgroundColor: 'rgba(20, 20, 20, 0.95)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    // Shadow for elevation effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  tabIconContainer: {
    width: 40,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginBottom: 2,
  },
  tabIconActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.gray500,
    marginTop: 2,
  },
  tabLabelActive: {
    color: COLORS.accent,
    fontWeight: '600',
  },
});

export default AppNavigator;
