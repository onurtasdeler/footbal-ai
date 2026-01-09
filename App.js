import React, { useEffect, Component } from 'react';
import { StyleSheet, useColorScheme, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Context
import { SubscriptionProvider } from './src/context/SubscriptionContext';

// Navigation
import AppNavigator from './src/navigation/AppNavigator';

// Theme
import { COLORS } from './src/theme/colors';

// Services
import { cleanupOldCache } from './src/services/cacheService';

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR BOUNDARY - Hata yakalama
// ═══════════════════════════════════════════════════════════════════════════════
class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0e13', padding: 20 }}>
          <Text style={{ color: '#ff4444', fontSize: 16, textAlign: 'center' }}>
            {this.state.error?.message || 'Unknown error'}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  // Get device color scheme (dark/light mode)
  const colorScheme = useColorScheme();

  // Uygulama başlangıcında eski cache verilerini temizle
  useEffect(() => {
    // 7 günden eski cache verilerini sil (varsayılan)
    cleanupOldCache().catch(() => {
      // Cache temizleme hatası kritik değil, sessizce devam et
    });
  }, []);

  return (
    <ErrorBoundary>
      <SubscriptionProvider>
        <SafeAreaProvider>
          {/* StatusBar adapts to device's dark/light mode setting */}
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <AppNavigator />
        </SafeAreaProvider>
      </SubscriptionProvider>
    </ErrorBoundary>
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
