import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

const BottomTabBar = ({ activeTab, onTabPress }) => {
  const tabs = [
    { id: 'home', icon: 'football-outline', activeIcon: 'football', label: 'Ana' },
    { id: 'live', icon: 'radio-outline', activeIcon: 'radio', label: 'Canlı' },
    { id: 'predictions', icon: 'analytics-outline', activeIcon: 'analytics', label: 'Tahmin' },
    { id: 'profile', icon: 'person-outline', activeIcon: 'person', label: 'Profil' },
  ];

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabItem}
            onPress={() => onTabPress(tab.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.tabIconContainer, isActive && styles.tabIconActive]}>
              <Ionicons
                name={isActive ? tab.activeIcon : tab.icon}
                size={28}
                color={isActive ? COLORS.accent : COLORS.gray600}
              />
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
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

export default BottomTabBar;
