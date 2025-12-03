import React, { Suspense, lazy, useState, useEffect } from 'react';
import { View, Platform, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Theme
import { COLORS } from '../theme/colors';

// Services
import { hasCompletedOnboarding } from '../services/cacheService';

// ═══════════════════════════════════════════════════════════════════════════════
// LAZY LOADED SCREENS
// ═══════════════════════════════════════════════════════════════════════════════
const HomeScreen = lazy(() => import('../screens/HomeScreen'));
const LiveScreen = lazy(() => import('../screens/LiveScreen'));
const LiveMatchDetailScreen = lazy(() => import('../screens/LiveMatchDetailScreen'));
const ProfileScreen = lazy(() => import('../screens/ProfileScreen'));
const MatchAnalysisScreen = lazy(() => import('../screens/MatchAnalysisScreen'));
const PredictionsScreen = lazy(() => import('../screens/PredictionsScreen'));
const PaywallScreen = lazy(() => import('../screens/PaywallScreen'));
const SplashScreen = lazy(() => import('../screens/SplashScreen'));
const OnboardingScreen = lazy(() => import('../screens/OnboardingScreen'));

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ═══════════════════════════════════════════════════════════════════════════════
// LOADING FALLBACK
// ═══════════════════════════════════════════════════════════════════════════════
const LoadingFallback = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={COLORS.accent} />
  </View>
);

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN WRAPPER WITH SUSPENSE
// ═══════════════════════════════════════════════════════════════════════════════
const withSuspense = (Component) => {
  return function WrappedComponent(props) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <Component {...props} />
      </Suspense>
    );
  };
};

// Wrapped lazy screens
const LazyHomeScreen = withSuspense(HomeScreen);
const LazyLiveScreen = withSuspense(LiveScreen);
const LazyLiveMatchDetailScreen = withSuspense(LiveMatchDetailScreen);
const LazyProfileScreen = withSuspense(ProfileScreen);
const LazyMatchAnalysisScreen = withSuspense(MatchAnalysisScreen);
const LazyPredictionsScreen = withSuspense(PredictionsScreen);
const LazyPaywallScreen = withSuspense(PaywallScreen);
const LazySplashScreen = withSuspense(SplashScreen);
const LazyOnboardingScreen = withSuspense(OnboardingScreen);

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
    <Stack.Screen name="HomeMain" component={LazyHomeScreen} />
    <Stack.Screen name="MatchAnalysis" component={LazyMatchAnalysisScreen} />
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
    <Stack.Screen name="LiveMain" component={LazyLiveScreen} />
    <Stack.Screen name="LiveMatchDetail" component={LazyLiveMatchDetailScreen} />
    <Stack.Screen name="MatchAnalysis" component={LazyMatchAnalysisScreen} />
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
    <Stack.Screen name="PredictionsMain" component={LazyPredictionsScreen} />
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
    <Stack.Screen name="ProfileMain" component={LazyProfileScreen} />
  </Stack.Navigator>
);

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOM TAB BAR ICON
// ═══════════════════════════════════════════════════════════════════════════════
const TabBarIcon = ({ focused, icon, activeIcon }) => (
  <View style={[styles.tabIconContainer, focused && styles.tabIconActive]}>
    <Ionicons
      name={focused ? activeIcon : icon}
      size={28}
      color={focused ? COLORS.accent : COLORS.gray600}
    />
  </View>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN TAB NAVIGATOR
// ═══════════════════════════════════════════════════════════════════════════════
const MainTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: styles.tabBar,
      tabBarShowLabel: false,
      tabBarHideOnKeyboard: true,
      lazy: true, // Enable lazy loading for tabs
    }}
  >
    <Tab.Screen
      name="Home"
      component={HomeStack}
      options={{
        tabBarIcon: ({ focused }) => (
          <TabBarIcon focused={focused} icon="football-outline" activeIcon="football" />
        ),
      }}
    />
    <Tab.Screen
      name="Live"
      component={LiveStack}
      options={{
        lazy: true,
        tabBarIcon: ({ focused }) => (
          <TabBarIcon focused={focused} icon="radio-outline" activeIcon="radio" />
        ),
      }}
    />
    <Tab.Screen
      name="Predictions"
      component={PredictionsStack}
      options={{
        lazy: true,
        tabBarIcon: ({ focused }) => (
          <TabBarIcon focused={focused} icon="analytics-outline" activeIcon="analytics" />
        ),
      }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileStack}
      options={{
        lazy: true,
        tabBarIcon: ({ focused }) => (
          <TabBarIcon focused={focused} icon="person-outline" activeIcon="person" />
        ),
      }}
    />
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
          component={LazySplashScreen}
          options={{
            animation: 'fade',
          }}
        />
        <RootStack.Screen
          name="Onboarding"
          component={LazyOnboardingScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />

        {/* Main App */}
        <RootStack.Screen name="Main" component={MainTabs} />
        <RootStack.Screen
          name="Paywall"
          component={LazyPaywallScreen}
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
  tabBar: {
    backgroundColor: COLORS.bg,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    paddingTop: 12,
    height: Platform.OS === 'ios' ? 85 : 65,
  },
  tabIconContainer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  tabIconActive: {
    backgroundColor: COLORS.accentDim,
  },
});

export default AppNavigator;
