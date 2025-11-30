import React, { useState } from 'react';
import { StyleSheet, StatusBar, Platform } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';

// Context
import { SubscriptionProvider } from './src/context/SubscriptionContext';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import LiveScreen from './src/screens/LiveScreen';
import LiveMatchDetailScreen from './src/screens/LiveMatchDetailScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import MatchAnalysisScreen from './src/screens/MatchAnalysisScreen';
import PredictionsScreen from './src/screens/PredictionsScreen';
import PaywallScreen from './src/screens/PaywallScreen';

// Components
import BottomTabBar from './src/components/BottomTabBar';

// Theme
import { COLORS } from './src/theme/colors';

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [liveDetailMatch, setLiveDetailMatch] = useState(null);
  const [showPaywall, setShowPaywall] = useState(false);

  // Paywall handlers
  const handleShowPaywall = () => setShowPaywall(true);
  const handleClosePaywall = () => setShowPaywall(false);

  // AI Analiz icin (MatchAnalysisScreen)
  const handleMatchPress = (match) => {
    setSelectedMatch(match);
  };

  const handleBackPress = () => {
    setSelectedMatch(null);
  };

  // Canli Takip icin (LiveMatchDetailScreen)
  const handleLiveMatchPress = (match) => {
    setLiveDetailMatch(match);
  };

  const handleLiveDetailBack = () => {
    setLiveDetailMatch(null);
  };

  const renderScreen = () => {
    // Canli mac detay sayfasi (hali saha + olaylar)
    if (liveDetailMatch) {
      return <LiveMatchDetailScreen match={liveDetailMatch} onBack={handleLiveDetailBack} />;
    }

    // AI Analiz sayfasi
    if (selectedMatch) {
      return <MatchAnalysisScreen match={selectedMatch} onBack={handleBackPress} />;
    }

    switch (activeTab) {
      case 'home':
        return <HomeScreen onMatchPress={handleMatchPress} onShowPaywall={handleShowPaywall} />;
      case 'live':
        return <LiveScreen onMatchPress={handleMatchPress} onLiveMatchPress={handleLiveMatchPress} />;
      case 'predictions':
        return <PredictionsScreen />;
      case 'profile':
        return <ProfileScreen onShowPaywall={handleShowPaywall} />;
      default:
        return <HomeScreen onMatchPress={handleMatchPress} onShowPaywall={handleShowPaywall} />;
    }
  };

  const isDetailScreen = selectedMatch || liveDetailMatch;

  return (
    <SubscriptionProvider>
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top']}>
          <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
          {renderScreen()}
          {!isDetailScreen && <BottomTabBar activeTab={activeTab} onTabPress={setActiveTab} />}
        </SafeAreaView>

        {/* Paywall Modal */}
        <PaywallScreen
          visible={showPaywall}
          onClose={handleClosePaywall}
        />
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
