import React, { Suspense, lazy } from 'react';
import { View, Platform, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Theme
import { COLORS } from '../theme/colors';

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

const AppNavigator = () => (
  <NavigationContainer>
    <RootStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.bg },
      }}
    >
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
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    paddingTop: 8,
    height: Platform.OS === 'ios' ? 85 : 65,
  },
  tabIconContainer: {
    width: 40,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  tabIconActive: {
    backgroundColor: COLORS.accentDim,
  },
});

export default AppNavigator;
