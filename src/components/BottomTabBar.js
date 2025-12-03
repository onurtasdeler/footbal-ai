import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { t } from '../i18n';

const BottomTabBar = ({ activeTab, onTabPress }) => {
  const tabs = [
    { id: 'home', icon: 'football-outline', activeIcon: 'football', label: t('navigation.home') },
    { id: 'live', icon: 'radio-outline', activeIcon: 'radio', label: t('navigation.live') },
    { id: 'predictions', icon: 'analytics-outline', activeIcon: 'analytics', label: t('navigation.predictions') },
    { id: 'profile', icon: 'person-outline', activeIcon: 'person', label: t('navigation.profile') },
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
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    paddingTop: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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

export default BottomTabBar;
