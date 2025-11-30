import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Switch,
  Alert,
  Animated,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as profileService from '../services/profileService';
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
  predictions: '#007AFF',
  favorites: '#FF2D55',
  saved: '#5856D6',
  notifications: '#FF3B30',
  liveAlerts: '#FF9500',
  appearance: '#5856D6',
  language: '#34C759',
  cache: '#8E8E93',
  privacy: '#007AFF',
  danger: '#FF3B30',
  darkMode: '#000000',
  odds: '#00d4aa',
};

// ═══════════════════════════════════════════════════════════════════════════════
// TableRow Component - iOS Style
// ═══════════════════════════════════════════════════════════════════════════════
const TableRow = ({ icon, iconColor, title, value, toggle, onToggle, onPress, isLast, destructive, disabled }) => {
  const Component = onPress && !disabled ? TouchableOpacity : View;

  return (
    <Component
      style={[
        styles.tableRow,
        isLast && styles.tableRowLast,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <View style={styles.tableRowLeft}>
        {icon && (
          <View style={[styles.iconBox, { backgroundColor: iconColor || COLORS.gray600 }]}>
            <Ionicons name={icon} size={17} color="#fff" />
          </View>
        )}
        <Text style={[
          styles.tableRowTitle,
          destructive && { color: '#FF3B30' },
          disabled && { color: COLORS.gray600 },
        ]}>
          {title}
        </Text>
      </View>

      <View style={styles.tableRowRight}>
        {value && !toggle && (
          <Text style={styles.tableRowValue}>{value}</Text>
        )}

        {toggle !== undefined ? (
          <Switch
            value={toggle}
            onValueChange={onToggle}
            trackColor={{ false: COLORS.gray700, true: COLORS.accent }}
            thumbColor={Platform.OS === 'android' ? COLORS.white : undefined}
            ios_backgroundColor={COLORS.gray700}
            disabled={disabled}
          />
        ) : onPress && !destructive && (
          <Ionicons name="chevron-forward" size={IOS_SPACING.chevronSize} color={COLORS.gray500} />
        )}
      </View>
    </Component>
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
  const [refreshing, setRefreshing] = useState(false);

  // Profile State
  const [profile, setProfile] = useState({
    displayName: 'Kullanıcı',
    memberSince: '2024-11-01',
  });

  // Stats State
  const [stats, setStats] = useState({
    totalPredictions: 0,
    correctPredictions: 0,
    savedMatches: 0,
    favoriteTeamsCount: 0,
  });


  // Appearance Settings
  const [appearSettings, setAppearSettings] = useState({
    darkMode: true,
    language: 'tr',
    oddsFormat: 'decimal',
  });

  // Cache Size
  const [cacheSize, setCacheSize] = useState(0);

  // Favorite Teams (from AsyncStorage)
  const [favoriteTeams, setFavoriteTeams] = useState([]);

  // Modals
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showOddsPicker, setShowOddsPicker] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadProfileData();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadProfileData = async () => {
    try {
      const [profileData, statsData, appearData, cacheSizeData, favoriteTeamsData] = await Promise.all([
        profileService.getProfile(),
        profileService.getStats(),
        profileService.getAppearanceSettings(),
        profileService.calculateCacheSize(),
        AsyncStorage.getItem('@favorite_teams'),
      ]);

      setProfile(profileData);
      setStats(statsData);
      setAppearSettings(appearData);
      setCacheSize(cacheSizeData);

      if (favoriteTeamsData) {
        setFavoriteTeams(JSON.parse(favoriteTeamsData));
      }
    } catch (error) {
      console.error('loadProfileData error:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfileData();
    setRefreshing(false);
  };

  // Başarı oranı hesapla
  const winRate = stats.totalPredictions > 0
    ? Math.round((stats.correctPredictions / stats.totalPredictions) * 100)
    : 0;

  // Üyelik tarihini formatla
  const formatMemberSince = (dateStr) => {
    const date = new Date(dateStr);
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };


  // Reset handler
  const handleReset = async () => {
    setShowResetConfirm(false);

    // Gerçek sıfırlama - AsyncStorage'dan tüm verileri sil
    await profileService.resetAllProfileData();
    await AsyncStorage.removeItem('@favorite_teams');
    await AsyncStorage.removeItem('@user_widgets');

    // State'leri default değerlere çevir
    setProfile({ displayName: 'Kullanıcı', memberSince: new Date().toISOString().split('T')[0] });
    setStats({ totalPredictions: 0, correctPredictions: 0, savedMatches: 0, favoriteTeamsCount: 0 });
    setAppearSettings({ darkMode: true, language: 'tr', oddsFormat: 'decimal' });
    setFavoriteTeams([]);
    setCacheSize(0);

    Alert.alert('Başarılı', 'Tüm veriler sıfırlandı.');
  };

  // Dil ve oran format isimleri
  const getLanguageName = (code) => ({ tr: 'Türkçe', en: 'English' }[code] || code);
  const getOddsFormatName = (format) => ({
    decimal: 'Ondalık',
    fractional: 'Kesirli',
    american: 'Amerikan'
  }[format] || format);

  return (
    <ScrollView
      style={styles.screen}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.screenContent, { paddingHorizontal: IOS_SPACING.screenMargin }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.accent}
        />
      }
    >
      {/* ════════════════════ PROFILE HEADER ════════════════════ */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={36} color={COLORS.gray500} />
          </View>
          {winRate > 0 && (
            <View style={styles.winRateBadge}>
              <Text style={styles.winRateBadgeText}>%{winRate}</Text>
            </View>
          )}
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{profile.displayName}</Text>
          <Text style={styles.headerMember}>
            Üye: {formatMemberSince(profile.memberSince)}
          </Text>
          {winRate > 0 && (
            <View style={styles.successChip}>
              <Ionicons name="trending-up" size={12} color={COLORS.accent} />
              <Text style={styles.successChipText}>%{winRate} Başarı</Text>
            </View>
          )}
        </View>
      </Animated.View>

      {/* ════════════════════ PRO UPGRADE CARD ════════════════════ */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <TouchableOpacity
          style={styles.proUpgradeCard}
          onPress={onShowPaywall}
          activeOpacity={0.8}
        >
          <View style={styles.proUpgradeLeft}>
            <View style={styles.proUpgradeIconBg}>
              <Ionicons name="trophy" size={20} color="#F4B43A" />
            </View>
            <View style={styles.proUpgradeTextContainer}>
              <Text style={styles.proUpgradeTitle}>PRO'ya Yükselt</Text>
              <Text style={styles.proUpgradeSubtitle}>Sınırsız AI tahmin ve daha fazlası</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.gray500} />
        </TouchableOpacity>
      </Animated.View>

      {/* ════════════════════ STATS CARDS ════════════════════ */}
      <Animated.View style={[styles.statsRow, { opacity: fadeAnim }]}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalPredictions}</Text>
          <Text style={styles.statLabel}>TAHMİN</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: COLORS.accent }]}>
            %{winRate}
          </Text>
          <Text style={styles.statLabel}>BAŞARI</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{favoriteTeams.length}</Text>
          <Text style={styles.statLabel}>FAVORİ</Text>
        </View>
      </Animated.View>

      {/* ════════════════════ FAVORITE TEAMS ════════════════════ */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <Text style={styles.tableSectionHeader}>FAVORİ TAKIMLAR</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.teamsScroll}
        >
          {favoriteTeams.map((team) => (
            <TouchableOpacity key={team.id} style={styles.teamBadge} activeOpacity={0.7}>
              <Text style={styles.teamBadgeText}>{team.short}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.addTeamBadge} activeOpacity={0.7}>
            <Ionicons name="add" size={24} color={COLORS.accent} />
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>

      {/* ════════════════════ AKTİVİTE SECTION ════════════════════ */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <GroupedTableSection title="AKTİVİTE">
          <TableRow
            icon="analytics-outline"
            iconColor={ICON_COLORS.predictions}
            title="Tahmin Geçmişi"
            value={`${stats.totalPredictions} tahmin`}
            onPress={() => Alert.alert('Tahmin Geçmişi', 'Bu özellik yakında eklenecek.')}
          />
          <TableRow
            icon="bookmark-outline"
            iconColor={ICON_COLORS.saved}
            title="Kaydedilen Maçlar"
            value={`${stats.savedMatches} maç`}
            onPress={() => Alert.alert('Kaydedilen Maçlar', 'Bu özellik yakında eklenecek.')}
          />
          <TableRow
            icon="heart-outline"
            iconColor={ICON_COLORS.favorites}
            title="Favori Takımlar"
            value={`${favoriteTeams.length} takım`}
            onPress={() => Alert.alert('Favori Takımlar', 'Bu özellik yakında eklenecek.')}
            isLast
          />
        </GroupedTableSection>
      </Animated.View>


      {/* ════════════════════ GÖRÜNÜM SECTION ════════════════════ */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <GroupedTableSection title="GÖRÜNÜM">
          <TableRow
            icon="moon-outline"
            iconColor={ICON_COLORS.darkMode}
            title="Karanlık Mod"
            toggle={appearSettings.darkMode}
            disabled={true}
          />
          <TableRow
            icon="globe-outline"
            iconColor={ICON_COLORS.language}
            title="Dil"
            value={getLanguageName(appearSettings.language)}
            onPress={() => setShowLanguagePicker(true)}
          />
          <TableRow
            icon="calculator-outline"
            iconColor={ICON_COLORS.odds}
            title="Oran Formatı"
            value={getOddsFormatName(appearSettings.oddsFormat)}
            onPress={() => setShowOddsPicker(true)}
            isLast
          />
        </GroupedTableSection>
      </Animated.View>

      {/* ════════════════════ VERİ & GİZLİLİK SECTION ════════════════════ */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <GroupedTableSection
          title="VERİ & GİZLİLİK"
          footer="Verileriniz yalnızca cihazınızda saklanır."
        >
          <TableRow
            icon="folder-outline"
            iconColor={ICON_COLORS.cache}
            title="Önbellek Yönetimi"
            value={`${cacheSize} MB`}
            onPress={() => Alert.alert(
              'Önbelleği Temizle',
              'API önbelleği temizlensin mi?',
              [
                { text: 'İptal', style: 'cancel' },
                {
                  text: 'Temizle',
                  onPress: async () => {
                    await AsyncStorage.removeItem('@api_cache');
                    const newSize = await profileService.calculateCacheSize();
                    setCacheSize(newSize);
                    Alert.alert('Başarılı', 'Önbellek temizlendi.');
                  }
                }
              ]
            )}
          />
          <TableRow
            icon="trash-outline"
            iconColor={ICON_COLORS.danger}
            title="Tüm Verileri Sıfırla"
            destructive
            onPress={() => setShowResetConfirm(true)}
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

      {/* ════════════════════ RESET CONFIRMATION MODAL ════════════════════ */}
      <Modal
        visible={showResetConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResetConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.alertCard}>
            <Ionicons name="warning" size={48} color="#FF3B30" style={{ marginBottom: 16 }} />
            <Text style={styles.alertTitle}>Tüm Verileri Sıfırla</Text>
            <Text style={styles.alertMessage}>
              Tüm tahmin geçmişiniz, istatistikleriniz ve ayarlarınız silinecek. Bu işlem geri alınamaz.
            </Text>
            <View style={styles.alertButtons}>
              <TouchableOpacity
                style={[styles.alertButton, styles.alertButtonCancel]}
                onPress={() => setShowResetConfirm(false)}
              >
                <Text style={styles.alertButtonCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.alertButton, styles.alertButtonDestructive]}
                onPress={handleReset}
              >
                <Text style={styles.alertButtonDestructiveText}>Sıfırla</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
                  setAppearSettings(prev => ({ ...prev, language: lang }));
                  profileService.updateAppearanceSetting('language', lang);
                  setShowLanguagePicker(false);
                }}
              >
                <Text style={styles.pickerOptionText}>{getLanguageName(lang)}</Text>
                {appearSettings.language === lang && (
                  <Ionicons name="checkmark" size={20} color={COLORS.accent} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ════════════════════ ODDS FORMAT PICKER MODAL ════════════════════ */}
      <Modal
        visible={showOddsPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOddsPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOddsPicker(false)}
        >
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>Oran Formatı</Text>
            {['decimal', 'fractional', 'american'].map((format) => (
              <TouchableOpacity
                key={format}
                style={styles.pickerOption}
                onPress={() => {
                  setAppearSettings(prev => ({ ...prev, oddsFormat: format }));
                  profileService.updateAppearanceSetting('oddsFormat', format);
                  setShowOddsPicker(false);
                }}
              >
                <Text style={styles.pickerOptionText}>{getOddsFormatName(format)}</Text>
                {appearSettings.oddsFormat === format && (
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

  // PRO Upgrade Card
  proUpgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(244,180,58,0.12)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(244,180,58,0.25)',
  },
  proUpgradeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  proUpgradeIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(244,180,58,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proUpgradeTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  proUpgradeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F4B43A',
    letterSpacing: -0.3,
  },
  proUpgradeSubtitle: {
    fontSize: 12,
    color: COLORS.gray400,
    marginTop: 2,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 8,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.gray800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  winRateBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: COLORS.bg,
  },
  winRateBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.bg,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  headerName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  headerMember: {
    fontSize: 13,
    color: COLORS.gray500,
    marginTop: 2,
  },
  successChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentDim,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    gap: 4,
  },
  successChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
    color: COLORS.gray500,
    marginTop: 4,
    letterSpacing: 1,
  },

  // Favorite Teams
  teamsScroll: {
    paddingVertical: 8,
    gap: 10,
  },
  teamBadge: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  teamBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.white,
  },
  addTeamBadge: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderStyle: 'dashed',
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
  tableRowValue: {
    fontSize: 17,
    color: COLORS.gray500,
    marginRight: 8,
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
  alertCard: {
    backgroundColor: COLORS.cardElevated,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 8,
  },
  alertMessage: {
    fontSize: 14,
    color: COLORS.gray400,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  alertButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  alertButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  alertButtonCancel: {
    backgroundColor: COLORS.gray700,
  },
  alertButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  alertButtonDestructive: {
    backgroundColor: '#FF3B30',
  },
  alertButtonDestructiveText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
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
