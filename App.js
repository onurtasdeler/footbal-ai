import React from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Context
import { SubscriptionProvider } from './src/context/SubscriptionContext';

// Navigation
import AppNavigator from './src/navigation/AppNavigator';

// Theme
import { COLORS } from './src/theme/colors';

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  // Get device color scheme (dark/light mode)
  const colorScheme = useColorScheme();

  return (
    <SubscriptionProvider>
      <SafeAreaProvider>
        {/* StatusBar adapts to device's dark/light mode setting */}
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <AppNavigator />
      </SafeAreaProvider>
    </SubscriptionProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
});
