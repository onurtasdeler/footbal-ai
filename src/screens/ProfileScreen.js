import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Animated,
  Modal,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

// ═══════════════════════════════════════════════════════════════════════════════
// iOS HIG Spacing Constants
// ═══════════════════════════════════════════════════════════════════════════════
const IOS_SPACING = {
  screenMargin: 16,
  sectionSpacing: 35,
  rowHeight: 44,
  rowPadding: 16,
  iconBoxSize: 29,
  chevronSize: 14,
  sectionHeaderSize: 13,
  rowTitleSize: 17,
};

// Icon Background Colors (iOS Settings Style)
const ICON_COLORS = {
  settings: '#8E8E93',
  pro: '#F4B43A',
  restore: '#5856D6',
  language: '#34C759',
  support: '#007AFF',
  rate: '#FF9500',
  privacy: '#007AFF',
  terms: '#5856D6',
};

// ═══════════════════════════════════════════════════════════════════════════════
// TableRow Component - iOS Style
// ═══════════════════════════════════════════════════════════════════════════════
const TableRow = ({ icon, iconColor, title, onPress, isLast, isFirst }) => {
  return (
    <TouchableOpacity
      style={[
        styles.tableRow,
        isLast && styles.tableRowLast,
        isFirst && styles.tableRowFirst,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.tableRowLeft}>
        {icon && (
          <View style={[styles.iconBox, { backgroundColor: iconColor || COLORS.gray600 }]}>
            <Ionicons name={icon} size={17} color="#fff" />
          </View>
        )}
        <Text style={styles.tableRowTitle}>{title}</Text>
      </View>

      <View style={styles.tableRowRight}>
        <Ionicons name="chevron-forward" size={IOS_SPACING.chevronSize} color={COLORS.gray500} />
      </View>
    </TouchableOpacity>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// GroupedTableSection Component
// ═══════════════════════════════════════════════════════════════════════════════
const GroupedTableSection = ({ title, children, footer }) => (
  <View style={styles.tableSection}>
    {title && <Text style={styles.tableSectionHeader}>{title}</Text>}
    <View style={styles.tableContainer}>
      {children}
    </View>
    {footer && <Text style={styles.tableSectionFooter}>{footer}</Text>}
  </View>
);

// ═══════════════════════════════════════════════════════════════════════════════
// ProfileScreen Component
// ═══════════════════════════════════════════════════════════════════════════════
const ProfileScreen = ({ onShowPaywall }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Language state
  const [currentLanguage, setCurrentLanguage] = useState('tr');
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  // Language names
  const getLanguageName = (code) => ({ tr: 'Türkçe', en: 'English' }[code] || code);

  // Restore Purchases handler
  const handleRestorePurchases = () => {
    Alert.alert(
      'Satın Alımlar Geri Yükleniyor',
      'Önceki satın alımlarınız kontrol ediliyor...',
      [{ text: 'Tamam' }]
    );
    // RevenueCat restore purchases will be implemented here
  };

  // Support handler
  const handleSupport = () => {
    Linking.openURL('mailto:destek@aimacanalization.com?subject=Uygulama Destek');
  };

  // Rate Us handler
  const handleRateUs = () => {
    // App Store/Play Store URL will be added
    Alert.alert(
      'Bizi Oylayın',
      'Uygulamamızı beğendiyseniz mağazada değerlendirmenizi bırakın!',
      [
        { text: 'Daha Sonra', style: 'cancel' },
        { text: 'Oyla', onPress: () => {
          // Platform-specific store URL
          const storeUrl = Platform.OS === 'ios'
            ? 'https://apps.apple.com/app/id123456789' // Replace with actual App Store ID
            : 'https://play.google.com/store/apps/details?id=com.aimacanalization'; // Replace with actual package name
          Linking.openURL(storeUrl);
        }}
      ]
    );
  };

  // Privacy Policy handler
  const handlePrivacyPolicy = () => {
    Linking.openURL('https://aimacanalization.com/privacy');
  };

  // Terms handler
  const handleTerms = () => {
    Linking.openURL('https://aimacanalization.com/terms');
  };

  // Settings handler
  const handleSettings = () => {
    Alert.alert('Ayarlar', 'Ayarlar sayfası yakında eklenecek.');
  };

  return (
    <ScrollView
      style={styles.screen}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.screenContent, { paddingHorizontal: IOS_SPACING.screenMargin }]}
    >
      {/* ════════════════════ PAGE TITLE ════════════════════ */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <Text style={styles.pageTitle}>Profil</Text>
      </Animated.View>

      {/* ════════════════════ PRO UPGRADE CARD ════════════════════ */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <TouchableOpacity
          style={styles.proCard}
          onPress={onShowPaywall}
          activeOpacity={0.85}
        >
          <View style={styles.proCardGradient}>
            <View style={styles.proCardContent}>
              <View style={styles.proCardLeft}>
                <View style={styles.proIconContainer}>
                  <Ionicons name="trophy" size={24} color="#F4B43A" />
                </View>
                <View style={styles.proTextContainer}>
                  <Text style={styles.proTitle}>PRO'ya Yükselt</Text>
                  <Text style={styles.proSubtitle}>Sınırsız AI tahmin • Reklamsız deneyim</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* ════════════════════ HESAP SECTION ════════════════════ */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <GroupedTableSection title="HESAP">
          <TableRow
            icon="refresh-outline"
            iconColor={ICON_COLORS.restore}
            title="Satın Alımları Geri Yükle"
            onPress={handleRestorePurchases}
            isFirst
            isLast
          />
        </GroupedTableSection>
      </Animated.View>

      {/* ════════════════════ AYARLAR SECTION ════════════════════ */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <GroupedTableSection title="AYARLAR">
          <TableRow
            icon="settings-outline"
            iconColor={ICON_COLORS.settings}
            title="Ayarlar"
            onPress={handleSettings}
            isFirst
          />
          <TableRow
            icon="globe-outline"
            iconColor={ICON_COLORS.language}
            title="Dil"
            onPress={() => setShowLanguagePicker(true)}
            isLast
          />
        </GroupedTableSection>
      </Animated.View>

      {/* ════════════════════ DESTEK SECTION ════════════════════ */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <GroupedTableSection title="DESTEK">
          <TableRow
            icon="help-circle-outline"
            iconColor={ICON_COLORS.support}
            title="Destek"
            onPress={handleSupport}
            isFirst
          />
          <TableRow
            icon="star-outline"
            iconColor={ICON_COLORS.rate}
            title="Bizi Oyla"
            onPress={handleRateUs}
            isLast
          />
        </GroupedTableSection>
      </Animated.View>

      {/* ════════════════════ YASAL SECTION ════════════════════ */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <GroupedTableSection title="YASAL">
          <TableRow
            icon="shield-checkmark-outline"
            iconColor={ICON_COLORS.privacy}
            title="Gizlilik Politikası"
            onPress={handlePrivacyPolicy}
            isFirst
          />
          <TableRow
            icon="document-text-outline"
            iconColor={ICON_COLORS.terms}
            title="Kullanım Şartları"
            onPress={handleTerms}
            isLast
          />
        </GroupedTableSection>
      </Animated.View>

      {/* ════════════════════ APP INFO ════════════════════ */}
      <Animated.View style={[styles.appInfo, { opacity: fadeAnim }]}>
        <Text style={styles.appInfoVersion}>AI Maç Analiz v1.0.0</Text>
        <Text style={styles.appInfoCopyright}>© 2024 Tüm Hakları Saklıdır</Text>
      </Animated.View>

      {/* Bottom Padding */}
      <View style={{ height: 120 }} />

      {/* ════════════════════ LANGUAGE PICKER MODAL ════════════════════ */}
      <Modal
        visible={showLanguagePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLanguagePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLanguagePicker(false)}
        >
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>Dil Seçin</Text>
            {['tr', 'en'].map((lang) => (
              <TouchableOpacity
                key={lang}
                style={styles.pickerOption}
                onPress={() => {
                  setCurrentLanguage(lang);
                  setShowLanguagePicker(false);
                }}
              >
                <Text style={styles.pickerOptionText}>{getLanguageName(lang)}</Text>
                {currentLanguage === lang && (
                  <Ionicons name="checkmark" size={20} color={COLORS.accent} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE STYLES - iOS HIG Compliant
// ═══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  screenContent: {
    paddingHorizontal: 20,
  },

  // Header
  header: {
    paddingVertical: 20,
    marginBottom: 8,
  },
  pageTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: -0.5,
  },

  // Pro Card
  proCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  proCardGradient: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1.5,
    borderColor: '#F4B43A',
    borderRadius: 16,
  },
  proCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  proCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  proIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(244, 180, 58, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proTextContainer: {
    marginLeft: 14,
    flex: 1,
  },
  proTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F4B43A',
    letterSpacing: -0.3,
  },
  proSubtitle: {
    fontSize: 13,
    color: COLORS.gray400,
    marginTop: 4,
  },

  // Table Sections (iOS Style)
  tableSection: {
    marginTop: IOS_SPACING.sectionSpacing,
  },
  tableSectionHeader: {
    fontSize: IOS_SPACING.sectionHeaderSize,
    fontWeight: '400',
    color: COLORS.gray500,
    textTransform: 'uppercase',
    marginLeft: 16,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  tableContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tableSectionFooter: {
    fontSize: 13,
    color: COLORS.gray500,
    marginHorizontal: 16,
    marginTop: 8,
    lineHeight: 18,
  },

  // Table Row
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: IOS_SPACING.rowHeight,
    paddingHorizontal: IOS_SPACING.rowPadding,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableRowFirst: {
    // First row styling if needed
  },
  tableRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tableRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: IOS_SPACING.iconBoxSize,
    height: IOS_SPACING.iconBoxSize,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tableRowTitle: {
    fontSize: IOS_SPACING.rowTitleSize,
    color: COLORS.white,
  },

  // App Info
  appInfo: {
    alignItems: 'center',
    marginTop: 40,
  },
  appInfoVersion: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: COLORS.gray500,
  },
  appInfoCopyright: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
    color: COLORS.gray600,
    marginTop: 4,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  // Picker Modal
  pickerCard: {
    backgroundColor: COLORS.cardElevated,
    borderRadius: 16,
    width: '100%',
    maxWidth: 320,
    overflow: 'hidden',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    textAlign: 'center',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  pickerOptionText: {
    fontSize: 16,
    color: COLORS.white,
  },
});

export default ProfileScreen;
