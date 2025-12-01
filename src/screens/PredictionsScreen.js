/**
 * PredictionsScreen - Bahis Tahminleri Sayfası
 * Claude AI ile maç bazlı bahis tahminleri
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Animated,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Image,
  ImageBackground,
  Modal,
  Pressable,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Localization from 'expo-localization';
import footballApi from '../services/footballApi';
import { getBettingPredictions, getCachedMatchIds, cleanOldPredictionCache } from '../services/bettingPredictions';
import { RISK_LEVELS, BETTING_CATEGORIES } from '../data/bettingTypes';
// supabaseService removed - Edge Function handles caching
import { COLORS } from '../theme/colors';
import { useSubscription } from '../context/SubscriptionContext';
import PaywallScreen from './PaywallScreen';
import { t } from '../i18n';
import { PredictionLoadingAnimation } from '../components/loading';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const LOCALE_TO_COUNTRY = {
  'tr': 'Turkey', 'en': 'England', 'de': 'Germany', 'es': 'Spain', 'fr': 'France',
  'it': 'Italy', 'pt': 'Portugal', 'nl': 'Netherlands', 'be': 'Belgium',
};

const POPULAR_LEAGUE_IDS = [39, 140, 135, 78, 61, 203, 2, 3];

// ═══════════════════════════════════════════════════════════════════════════════
// CIRCULAR PROGRESS COMPONENT (View-based - SVG gerektirmez)
// ═══════════════════════════════════════════════════════════════════════════════
const CircularProgress = ({ percentage, size = 56, color }) => {
  // Renk yoğunluğunu yüzdeye göre ayarla
  const bgOpacity = 0.15;

  return (
    <View style={[
      styles.circularProgressContainer,
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color + '20',
        borderWidth: 3,
        borderColor: color,
      }
    ]}>
      {/* Progress göstergesi olarak doluluk efekti */}
      <View style={[
        styles.circularProgressFill,
        {
          width: size - 6,
          height: size - 6,
          borderRadius: (size - 6) / 2,
          backgroundColor: color + Math.round(percentage * 0.4).toString(16).padStart(2, '0'),
        }
      ]} />
      <Text style={[styles.circularProgressText, { color }]}>
        %{percentage}
      </Text>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// DISCLAIMER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const DisclaimerBanner = () => (
  <View style={styles.disclaimerBanner}>
    <Text style={styles.disclaimerText}>
      {t('predictions.disclaimerBanner')}
    </Text>
  </View>
);

// ═══════════════════════════════════════════════════════════════════════════════
// PREDICTION CARD COMPONENT (Dairesel Progress ile)
// ═══════════════════════════════════════════════════════════════════════════════
const PredictionCard = ({ prediction, index }) => {
  const riskInfo = RISK_LEVELS[prediction.risk] || RISK_LEVELS.orta;
  const confidenceColor = getConfidenceColor(prediction.confidence);

  return (
    <View style={[styles.predictionCard, index === 0 && styles.predictionCardFirst]}>
      {/* Üst Kısım: Dairesel Progress + Bilgi */}
      <View style={styles.predictionHeader}>
        {/* Sol: Dairesel Progress */}
        <View style={styles.predictionProgress}>
          <CircularProgress
            percentage={prediction.confidence}
            size={56}
            strokeWidth={5}
            color={confidenceColor}
          />
        </View>

        {/* Orta: Tahmin Bilgisi */}
        <View style={styles.predictionInfo}>
          <Text style={styles.predictionName}>{prediction.betName}</Text>
          <Text style={styles.predictionType}>{prediction.selection || prediction.betType}</Text>

          {/* Alt: Risk + Kategori Badge'leri */}
          <View style={styles.predictionMeta}>
            <View style={[styles.riskBadge, { backgroundColor: riskInfo.bgColor }]}>
              <Ionicons name={riskInfo.icon} size={12} color={riskInfo.color} />
              <Text style={[styles.riskText, { color: riskInfo.color }]}>{riskInfo.label}</Text>
            </View>
            <View style={[styles.categoryBadge, { backgroundColor: (prediction.categoryColor || COLORS.accent) + '20' }]}>
              <Ionicons
                name={prediction.categoryIcon || 'help-circle-outline'}
                size={12}
                color={prediction.categoryColor || COLORS.accent}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Açıklama */}
      {prediction.reasoning && (
        <View style={styles.predictionBody}>
          <Text style={styles.reasoningText}>{prediction.reasoning}</Text>
        </View>
      )}
    </View>
  );
};

const getConfidenceColor = (confidence) => {
  if (confidence >= 70) return COLORS.success;
  if (confidence >= 50) return COLORS.warning;
  return COLORS.danger;
};

// ═══════════════════════════════════════════════════════════════════════════════
// FORMATION-BASED PLAYER POSITIONING (HORIZONTAL PITCH)
// Simetrik ve ortalanmış kadro dizilişi
// 11 oyuncu: 1 Kaleci + Formasyon (örn: 4-2-3-1 = 10 saha oyuncusu)
// Kaleci solda, forvetler sağda - her hat dikey olarak MERKEZLENMİŞ
// ═══════════════════════════════════════════════════════════════════════════════
const getPlayerPosition = (formation, playerIndex) => {
  // Formation: "4-3-3", "4-4-2", "3-5-2", "4-2-3-1", "3-4-1-2" etc.
  // 4-2-3-1 = [4, 2, 3, 1] → 4 defans, 2 DMF, 3 AMF, 1 forvet = 10 saha oyuncusu
  const lines = formation?.split('-').map(n => parseInt(n)) || [4, 4, 2];
  const totalLines = lines.length; // Kaleci hariç hat sayısı

  // Kaleci pozisyonu (index 0) - sol tarafta, TAM ORTADA
  if (playerIndex === 0) {
    return {
      top: '50%',
      left: '6%'
    };
  }

  // Saha oyuncuları (index 1-10)
  // playerIndex 1 = ilk defans, playerIndex 5 = ilk DMF, vs.
  let remainingIndex = playerIndex - 1; // Kaleci hariç index
  let lineIndex = 0;
  let positionInLine = 0;
  let found = false;

  for (let i = 0; i < lines.length; i++) {
    if (remainingIndex < lines[i]) {
      lineIndex = i;
      positionInLine = remainingIndex;
      found = true;
      break;
    }
    remainingIndex -= lines[i];
  }

  // Eğer index formasyondaki toplam oyuncu sayısını aşarsa, son hatta yerleştir
  if (!found) {
    lineIndex = totalLines - 1;
    positionInLine = 0;
  }

  const playersInThisLine = lines[lineIndex] || 1;

  // YATAY POZİSYON (left): Hatları eşit aralıklarla dağıt
  // Kaleci %6, Defans ~%24, Orta ~%44, İleri ~%64, Forvet ~%84
  const leftPercent = 24 + (lineIndex * 20);

  // DİKEY POZİSYON (top): Oyuncuları MERKEZ ETRAFINDA SİMETRİK dağıt
  let topPercent;

  if (playersInThisLine === 1) {
    // Tek oyuncu → tam ortada
    topPercent = 50;
  } else {
    // Birden fazla oyuncu → merkez etrafında simetrik dağılım
    // Örnek: 4 oyuncu → %20, %40, %60, %80 (merkez %50 etrafında simetrik)
    const totalSpread = Math.min(65, playersInThisLine * 16);
    const spacing = totalSpread / (playersInThisLine - 1);
    const startTop = 50 - (totalSpread / 2);
    topPercent = startTop + (positionInLine * spacing);
  }

  return {
    top: `${Math.max(15, Math.min(85, topPercent))}%`,
    left: `${Math.max(6, Math.min(88, leftPercent))}%`
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// PREDICTION DETAIL PAGE (iddaa Oran Analizi Tarzı Framework)
// ═══════════════════════════════════════════════════════════════════════════════

// Tab Types - Dynamic function for i18n support
const getDetailTabs = () => [
  { id: 'tahminler', label: t('predictions.tabs.predictions'), icon: 'analytics' },
  { id: 'analiz', label: t('predictions.tabs.analysis'), icon: 'stats-chart' },
  { id: 'istatistik', label: t('predictions.tabs.statistics'), icon: 'bar-chart' },
  { id: 'kadro', label: t('predictions.tabs.lineup'), icon: 'people' },
  { id: 'h2h', label: t('predictions.tabs.h2h'), icon: 'swap-horizontal' },
  { id: 'kartkorner', label: t('predictions.tabs.cardCorner'), icon: 'card' },
  { id: 'sakatlık', label: t('predictions.tabs.injuries'), icon: 'medkit' },
];

// Odds-style Grid Card
const OddsGridCard = ({ prediction, isHighlighted }) => {
  const riskInfo = RISK_LEVELS[prediction.risk] || RISK_LEVELS.orta;
  const confidenceColor = getConfidenceColor(prediction.confidence);

  return (
    <View style={[
      styles.oddsCard,
      isHighlighted && styles.oddsCardHighlighted,
    ]}>
      <Text style={styles.oddsCardLabel}>{prediction.betType || prediction.betName?.split(' ')[0]}</Text>
      <View style={styles.oddsCardValueRow}>
        <Text style={[styles.oddsCardValue, { color: confidenceColor }]}>
          %{prediction.confidence}
        </Text>
        <View style={[styles.oddsCardTrend, { backgroundColor: riskInfo.bgColor }]}>
          <Ionicons
            name={prediction.confidence >= 60 ? 'trending-up' : prediction.confidence >= 40 ? 'remove' : 'trending-down'}
            size={12}
            color={riskInfo.color}
          />
        </View>
      </View>
      <Text style={styles.oddsCardSelection} numberOfLines={1}>{prediction.selection || prediction.betName}</Text>
    </View>
  );
};

// Section Header with Info
const SectionHeaderWithInfo = ({ title, onInfoPress }) => (
  <View style={styles.sectionHeaderRow}>
    <Text style={styles.sectionHeaderText}>* {title} *</Text>
    <TouchableOpacity onPress={onInfoPress} style={styles.sectionInfoBtn}>
      <Ionicons name="information-circle-outline" size={20} color={COLORS.gray400} />
    </TouchableOpacity>
  </View>
);

// Statistics List Item
const StatListItem = ({ label, value, percentage, count }) => (
  <View style={styles.statListItem}>
    <Text style={styles.statListDot}>•</Text>
    <Text style={styles.statListLabel}>{label}:</Text>
    <Text style={styles.statListValue}>%{percentage}</Text>
    {count !== undefined && <Text style={styles.statListCount}>({count})</Text>}
  </View>
);

const PredictionDetailPage = ({ visible, match, predictions, loading, onClose }) => {
  // Safe area insets for proper header positioning
  const insets = useSafeAreaInsets();

  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const [activeTab, setActiveTab] = useState('tahminler');
  const [showInfoModal, setShowInfoModal] = useState(false);

  // New Tab States
  const [lineups, setLineups] = useState(null);
  const [h2hData, setH2hData] = useState(null);
  const [cardCornerStats, setCardCornerStats] = useState(null);
  const [injuries, setInjuries] = useState(null);
  const [tabLoading, setTabLoading] = useState({});
  const [tabDataLoaded, setTabDataLoaded] = useState({});
  const [injuryExpanded, setInjuryExpanded] = useState({}); // Collapsible state for injury sections

  // İstatistik hesaplamaları - Hook'lar koşullu return'den ÖNCE olmalı
  const stats = useMemo(() => {
    if (!predictions?.predictions) return null;
    const preds = predictions.predictions;
    const total = preds.length;
    if (total === 0) return null;
    const highConf = preds.filter(p => p.confidence >= 70).length;
    const medConf = preds.filter(p => p.confidence >= 50 && p.confidence < 70).length;
    const lowConf = preds.filter(p => p.confidence < 50).length;
    const avgConf = Math.round(preds.reduce((sum, p) => sum + p.confidence, 0) / total);

    const riskCounts = { dusuk: 0, orta: 0, yuksek: 0, cok_yuksek: 0 };
    preds.forEach(p => {
      if (riskCounts[p.risk] !== undefined) riskCounts[p.risk]++;
    });

    return { total, highConf, medConf, lowConf, avgConf, riskCounts };
  }, [predictions]);

  // Fetch tab data (lazy loading)
  const fetchTabData = useCallback(async (tabId) => {
    if (!match || tabLoading[tabId] || tabDataLoaded[tabId]) return;

    setTabLoading(prev => ({ ...prev, [tabId]: true }));

    try {
      switch (tabId) {
        case 'kadro':
          const lineupResponse = await footballApi.getFixtureLineups(match.id);
          // API-Football returns data in response array
          const lineupData = lineupResponse?.response || lineupResponse || [];
          setLineups(lineupData);
          break;
        case 'h2h':
          if (match.home?.id && match.away?.id) {
            const h2h = await footballApi.getHeadToHead(match.home.id, match.away.id, 10);
            setH2hData(h2h);
          }
          break;
        case 'kartkorner':
          const statsData = await footballApi.getFixtureStats(match.id);
          setCardCornerStats(statsData);
          break;
        case 'sakatlık':
          if (match.league?.id) {
            const currentYear = new Date().getFullYear();
            const injuryResponse = await footballApi.getInjuries(match.league.id, currentYear);
            // API-Football returns data in response array
            const injuryList = injuryResponse?.response || injuryResponse || [];
            // Filter injuries for teams in this match
            const filteredInjuries = injuryList.filter(injury => {
              const teamId = injury.team?.id;
              return teamId === match.home?.id || teamId === match.away?.id;
            });
            setInjuries(filteredInjuries);
          }
          break;
      }
      setTabDataLoaded(prev => ({ ...prev, [tabId]: true }));
    } catch (error) {
      // Silent fail
    } finally {
      setTabLoading(prev => ({ ...prev, [tabId]: false }));
    }
  }, [match, tabLoading, tabDataLoaded]);

  // Fetch data when tab changes
  useEffect(() => {
    if (visible && activeTab && ['kadro', 'h2h', 'kartkorner', 'sakatlık'].includes(activeTab)) {
      fetchTabData(activeTab);
    }
  }, [visible, activeTab, fetchTabData]);

  // Reset tab data when match changes
  useEffect(() => {
    if (match) {
      setLineups(null);
      setH2hData(null);
      setCardCornerStats(null);
      setInjuries(null);
      setTabDataLoaded({});
      setInjuryExpanded({}); // Reset collapsed states
    }
  }, [match?.id]);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible && !match) return null;

  return (
    <Animated.View style={[
      styles.detailPage,
      { transform: [{ translateX: slideAnim }] }
    ]}>
      {/* Header with Back Button */}
      <View style={[styles.detailHeader, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          {(match?.league?.flag || match?.league?.logo) && (
            <Image source={{ uri: match.league.flag || match.league.logo }} style={styles.headerLeagueLogo} />
          )}
          <Text style={styles.headerLeagueName} numberOfLines={1}>
            {match?.league?.name || t('predictions.matchPrediction')}
          </Text>
        </View>
        <TouchableOpacity style={styles.headerInfoBtn} onPress={() => setShowInfoModal(true)}>
          <Ionicons name="information-circle-outline" size={22} color={COLORS.gray400} />
        </TouchableOpacity>
      </View>

      {/* Pitch Background Hero */}
      <View style={styles.pitchHero}>
        <ImageBackground
          source={require('../../assets/images/pitch_horizontal.png')}
          style={styles.pitchHeroBackground}
          imageStyle={styles.pitchHeroBackgroundImage}
          resizeMode="cover"
        >
          {/* Dark Overlay */}
          <View style={styles.pitchHeroOverlay} />

          {/* Home Team */}
          <View style={styles.heroTeam}>
            {match?.home?.logo && (
              <Image source={{ uri: match.home.logo }} style={styles.heroTeamLogo} resizeMode="contain" />
            )}
            <Text style={styles.heroTeamName} numberOfLines={1}>
              {match?.home?.short || match?.home?.name?.substring(0, 3).toUpperCase() || t('predictions.home')}
            </Text>
          </View>

          {/* Center - Time/Score */}
          <View style={styles.heroCenter}>
            <Text style={styles.heroTime}>{match?.time}</Text>
            <View style={styles.heroAIBadge}>
              <Ionicons name="sparkles" size={12} color={COLORS.accent} />
              <Text style={styles.heroAIText}>{t('predictions.aiPrediction')}</Text>
            </View>
          </View>

          {/* Away Team */}
          <View style={[styles.heroTeam, { alignItems: 'flex-end' }]}>
            {match?.away?.logo && (
              <Image source={{ uri: match.away.logo }} style={styles.heroTeamLogo} resizeMode="contain" />
            )}
            <Text style={styles.heroTeamName} numberOfLines={1}>
              {match?.away?.short || match?.away?.name?.substring(0, 3).toUpperCase() || t('predictions.away')}
            </Text>
          </View>
        </ImageBackground>
      </View>

      {/* Tab Navigation - Below Pitch */}
      <View style={styles.tabNavigation}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
          {getDetailTabs().map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabButton, activeTab === tab.id && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Ionicons
                name={tab.icon}
                size={16}
                color={activeTab === tab.id ? COLORS.accent : COLORS.gray500}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.tabButtonText, activeTab === tab.id && styles.tabButtonTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      {loading ? (
        <PredictionLoadingAnimation compact />
      ) : predictions ? (
        <ScrollView
          style={styles.detailScrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.detailScrollContent}
        >
          {/* TAB: Tahminler */}
          {activeTab === 'tahminler' && (
            <>
              {/* Top Pick - Highlighted */}
              {predictions.topPick && (
                <View style={styles.topPickCompact}>
                  <View style={styles.topPickCompactHeader}>
                    <Ionicons name="star" size={14} color={COLORS.warning} />
                    <Text style={styles.topPickCompactLabel}>{t('predictions.topPick')}</Text>
                    <Text style={styles.topPickCompactValue}>{predictions.topPick.betName}</Text>
                    <Text style={styles.topPickCompactConf}>%{predictions.topPick.confidence}</Text>
                  </View>
                </View>
              )}

              {/* Odds Grid */}
              <SectionHeaderWithInfo title={t('predictions.sections.bettingPredictions')} onInfoPress={() => setShowInfoModal(true)} />
              <View style={styles.oddsGrid}>
                {predictions.predictions?.slice(0, 6).map((pred, idx) => (
                  <OddsGridCard key={idx} prediction={pred} isHighlighted={idx === 0} />
                ))}
              </View>

              {/* Remaining predictions if more than 6 */}
              {predictions.predictions?.length > 6 && (
                <>
                  <SectionHeaderWithInfo title={t('predictions.sections.otherPredictions')} onInfoPress={() => setShowInfoModal(true)} />
                  <View style={styles.oddsGrid}>
                    {predictions.predictions?.slice(6).map((pred, idx) => (
                      <OddsGridCard key={idx + 6} prediction={pred} isHighlighted={false} />
                    ))}
                  </View>
                </>
              )}

              {/* Tahmin Detayları - Individual prediction reasonings */}
              {predictions.predictions?.some(p => p.reasoning) && (
                <>
                  <SectionHeaderWithInfo title={t('predictions.sections.predictionDetails')} onInfoPress={() => setShowInfoModal(true)} />
                  {predictions.predictions?.filter(p => p.reasoning).map((pred, idx) => (
                    <View key={idx} style={styles.reasoningItem}>
                      <View style={styles.reasoningItemHeader}>
                        <Text style={styles.reasoningItemLabel}>{pred.betName}</Text>
                        <Text style={[styles.reasoningItemConf, { color: getConfidenceColor(pred.confidence) }]}>
                          %{pred.confidence}
                        </Text>
                      </View>
                      <Text style={styles.reasoningItemText}>{pred.reasoning}</Text>
                    </View>
                  ))}
                </>
              )}

              {/* Explanation Text */}
              <View style={styles.explanationBox}>
                <Text style={styles.explanationText}>
                  {t('predictions.predictionExplanation')}
                </Text>
              </View>
            </>
          )}

          {/* TAB: Analiz */}
          {activeTab === 'analiz' && (
            <>
              <SectionHeaderWithInfo title={t('predictions.sections.aiMatchAnalysis')} onInfoPress={() => setShowInfoModal(true)} />

              {predictions.summary && (
                <View style={styles.analysisBox}>
                  <Text style={styles.analysisText}>{predictions.summary}</Text>
                </View>
              )}

              {predictions.topPick?.reasoning && (
                <View style={styles.analysisBox}>
                  <View style={styles.analysisBoxHeader}>
                    <Ionicons name="bulb" size={16} color={COLORS.warning} />
                    <Text style={styles.analysisBoxTitle}>{t('predictions.featuredPrediction')}</Text>
                  </View>
                  <Text style={styles.analysisText}>{predictions.topPick.reasoning}</Text>
                </View>
              )}

              {predictions.riskWarning && (
                <View style={styles.riskWarningCompact}>
                  <Ionicons name="warning" size={16} color={COLORS.danger} />
                  <Text style={styles.riskWarningCompactText}>{predictions.riskWarning}</Text>
                </View>
              )}
            </>
          )}

          {/* TAB: İstatistik */}
          {activeTab === 'istatistik' && stats && (
            <>
              <SectionHeaderWithInfo title={t('predictions.sections.predictionStats')} onInfoPress={() => setShowInfoModal(true)} />

              <View style={styles.statsOverview}>
                <View style={styles.statsOverviewItem}>
                  <Text style={styles.statsOverviewValue}>{stats.total}</Text>
                  <Text style={styles.statsOverviewLabel}>{t('predictions.stats.totalPredictions')}</Text>
                </View>
                <View style={styles.statsOverviewItem}>
                  <Text style={[styles.statsOverviewValue, { color: COLORS.accent }]}>%{stats.avgConf}</Text>
                  <Text style={styles.statsOverviewLabel}>{t('predictions.confidence')}</Text>
                </View>
              </View>

              <View style={styles.explanationBox}>
                <Text style={styles.explanationTitle}>{t('predictions.confidenceDistribution')}</Text>
                <Text style={styles.explanationText}>
                  {t('predictions.confidenceDistributionText').replace('{count}', stats.total)}
                </Text>
              </View>

              <View style={styles.statsList}>
                <StatListItem label={t('predictions.stats.highConfidence')} percentage={Math.round(stats.highConf / stats.total * 100)} count={stats.highConf} />
                <StatListItem label={t('predictions.stats.mediumConfidence')} percentage={Math.round(stats.medConf / stats.total * 100)} count={stats.medConf} />
                <StatListItem label={t('predictions.stats.lowConfidence')} percentage={Math.round(stats.lowConf / stats.total * 100)} count={stats.lowConf} />
              </View>

              <SectionHeaderWithInfo title={t('predictions.sections.riskDistribution')} onInfoPress={() => setShowInfoModal(true)} />
              <View style={styles.statsList}>
                <StatListItem label={t('predictions.stats.lowRisk')} percentage={Math.round(stats.riskCounts.dusuk / stats.total * 100)} count={stats.riskCounts.dusuk} />
                <StatListItem label={t('predictions.stats.mediumRisk')} percentage={Math.round(stats.riskCounts.orta / stats.total * 100)} count={stats.riskCounts.orta} />
                <StatListItem label={t('predictions.stats.highRisk')} percentage={Math.round((stats.riskCounts.yuksek + stats.riskCounts.cok_yuksek) / stats.total * 100)} count={stats.riskCounts.yuksek + stats.riskCounts.cok_yuksek} />
              </View>
            </>
          )}

          {/* TAB: Kadro (Lineup with Pitch Visualization) */}
          {activeTab === 'kadro' && (
            <>
              {tabLoading.kadro ? (
                <View style={styles.tabLoadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.accent} />
                  <Text style={styles.tabLoadingText}>{t('predictions.lineup.loading')}</Text>
                </View>
              ) : lineups && lineups.length > 0 ? (
                <>
                  {lineups.map((teamLineup, teamIdx) => (
                    <View key={teamIdx} style={styles.lineupTeamSection}>
                      {/* Team Header */}
                      <View style={styles.lineupTeamHeader}>
                        {teamLineup.team?.logo && (
                          <Image source={{ uri: teamLineup.team.logo }} style={styles.lineupTeamLogo} />
                        )}
                        <View style={styles.lineupTeamInfo}>
                          <Text style={styles.lineupTeamName}>{teamLineup.team?.name}</Text>
                          <Text style={styles.lineupFormation}>{t('predictions.lineup.formation')}: {teamLineup.formation ? `1-${teamLineup.formation}` : t('predictions.lineup.unknown')}</Text>
                        </View>
                      </View>

                      {/* Pitch Visualization - Horizontal pitch for lineup */}
                      <View style={styles.pitchContainer}>
                        <ImageBackground
                          source={require('../../assets/images/pitch_horizontal.png')}
                          style={styles.pitchVisualization}
                          imageStyle={styles.pitchVisualizationImage}
                          resizeMode="cover"
                        >
                          <View style={styles.pitchOverlay} />
                          {/* Render players on pitch */}
                          {teamLineup.startXI?.map((playerData, idx) => {
                            const player = playerData.player;
                            const isAwayTeam = teamIdx === 1;

                            // Grid veya formasyon tabanlı pozisyonlama
                            // YATAY SAHA: Her takım kendi kadrosunda TÜM SAHAYA yayılır
                            // API grid: "row:col" - row=hat (1=GK, 2-5=saha), col=dikey pozisyon
                            // Formasyon tabanlı SİMETRİK pozisyonlama
                            // Grid değerlerini kullanmıyoruz - formasyona göre düzgün dağıtıyoruz
                            const position = getPlayerPosition(teamLineup.formation, idx);

                            return (
                              <View
                                key={idx}
                                style={[
                                  styles.pitchPlayer,
                                  position
                                ]}
                              >
                                <View style={[
                                  styles.pitchPlayerCircle,
                                  isAwayTeam && styles.pitchPlayerCircleAway
                                ]}>
                                  <Text style={styles.pitchPlayerNumber}>{player?.number || idx + 1}</Text>
                                </View>
                                <Text style={styles.pitchPlayerName} numberOfLines={1}>
                                  {player?.name?.split(' ').pop() || t('predictions.lineup.player')}
                                </Text>
                              </View>
                            );
                          })}
                        </ImageBackground>
                      </View>

                      {/* Coach */}
                      {teamLineup.coach && (
                        <View style={styles.coachRow}>
                          <Ionicons name="person" size={16} color={COLORS.accent} />
                          <Text style={styles.coachLabel}>{t('predictions.coach')}</Text>
                          <Text style={styles.coachName}>{teamLineup.coach.name}</Text>
                        </View>
                      )}

                      {/* Substitutes */}
                      {teamLineup.substitutes && teamLineup.substitutes.length > 0 && (
                        <View style={styles.substitutesSection}>
                          <Text style={styles.substitutesTitle}>{t('predictions.lineup.substitutes')}</Text>
                          <View style={styles.substitutesList}>
                            {teamLineup.substitutes.slice(0, 7).map((sub, subIdx) => (
                              <View key={subIdx} style={styles.substituteItem}>
                                <Text style={styles.substituteNumber}>{sub.player?.number || '-'}</Text>
                                <Text style={styles.substituteName} numberOfLines={1}>{sub.player?.name}</Text>
                                <Text style={styles.substitutePos}>{sub.player?.pos}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  ))}
                </>
              ) : (
                <View style={styles.noDataContainer}>
                  <Ionicons name="people-outline" size={48} color={COLORS.gray600} />
                  <Text style={styles.noDataText}>{t('predictions.lineupNotAnnounced')}</Text>
                  <Text style={styles.noDataSubtext}>{t('predictions.lineupCheckLater')}</Text>
                </View>
              )}
            </>
          )}

          {/* TAB: H2H (Head-to-Head) */}
          {activeTab === 'h2h' && (
            <>
              {tabLoading.h2h ? (
                <View style={styles.tabLoadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.accent} />
                  <Text style={styles.tabLoadingText}>{t('predictions.h2hTab.loading')}</Text>
                </View>
              ) : h2hData && h2hData.length > 0 ? (
                <>
                  {/* H2H Summary Stats */}
                  <View style={styles.h2hSummary}>
                    <View style={styles.h2hSummaryItem}>
                      <Text style={styles.h2hSummaryValue}>
                        {h2hData.filter(m => m.teams?.home?.winner === true && m.teams?.home?.id === match?.home?.id || m.teams?.away?.winner === true && m.teams?.away?.id === match?.home?.id).length}
                      </Text>
                      <Text style={styles.h2hSummaryLabel}>{match?.home?.name?.substring(0, 3).toUpperCase() || 'EV'}</Text>
                    </View>
                    <View style={styles.h2hSummaryItem}>
                      <Text style={styles.h2hSummaryValue}>
                        {h2hData.filter(m => m.teams?.home?.winner === null).length}
                      </Text>
                      <Text style={styles.h2hSummaryLabel}>Berabere</Text>
                    </View>
                    <View style={styles.h2hSummaryItem}>
                      <Text style={styles.h2hSummaryValue}>
                        {h2hData.filter(m => m.teams?.home?.winner === true && m.teams?.home?.id === match?.away?.id || m.teams?.away?.winner === true && m.teams?.away?.id === match?.away?.id).length}
                      </Text>
                      <Text style={styles.h2hSummaryLabel}>{match?.away?.name?.substring(0, 3).toUpperCase() || 'DEP'}</Text>
                    </View>
                  </View>

                  {/* Goal Averages */}
                  <View style={styles.h2hGoalAvg}>
                    <Text style={styles.h2hGoalAvgLabel}>{t('predictions.goalsPerMatch')}</Text>
                    <Text style={styles.h2hGoalAvgValue}>
                      {(h2hData.reduce((sum, m) => sum + (m.goals?.home || 0) + (m.goals?.away || 0), 0) / h2hData.length).toFixed(1)}
                    </Text>
                  </View>

                  {/* Match List */}
                  <SectionHeaderWithInfo title={t('predictions.sections.recentMatches')} onInfoPress={() => setShowInfoModal(true)} />
                  {h2hData.slice(0, 10).map((h2hMatch, idx) => (
                    <View key={idx} style={styles.h2hMatchCard}>
                      <View style={styles.h2hMatchDate}>
                        <Text style={styles.h2hMatchDateText}>
                          {new Date(h2hMatch.fixture?.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </Text>
                        <Text style={styles.h2hMatchLeague} numberOfLines={1}>{h2hMatch.league?.name}</Text>
                      </View>
                      <View style={styles.h2hMatchTeams}>
                        <Text style={[
                          styles.h2hTeamName,
                          h2hMatch.teams?.home?.winner && styles.h2hTeamWinner
                        ]} numberOfLines={1}>
                          {h2hMatch.teams?.home?.name}
                        </Text>
                        <View style={styles.h2hScore}>
                          <Text style={styles.h2hScoreText}>
                            {h2hMatch.goals?.home} - {h2hMatch.goals?.away}
                          </Text>
                        </View>
                        <Text style={[
                          styles.h2hTeamName,
                          h2hMatch.teams?.away?.winner && styles.h2hTeamWinner
                        ]} numberOfLines={1}>
                          {h2hMatch.teams?.away?.name}
                        </Text>
                      </View>
                    </View>
                  ))}
                </>
              ) : (
                <View style={styles.noDataContainer}>
                  <Ionicons name="swap-horizontal-outline" size={48} color={COLORS.gray600} />
                  <Text style={styles.noDataText}>{t('predictions.noH2HHistory')}</Text>
                  <Text style={styles.noDataSubtext}>{t('predictions.teamsNotPlayedBefore')}</Text>
                </View>
              )}
            </>
          )}

          {/* TAB: Kart/Korner (Cards & Corners) */}
          {activeTab === 'kartkorner' && (
            <>
              {tabLoading.kartkorner ? (
                <View style={styles.tabLoadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.accent} />
                  <Text style={styles.tabLoadingText}>{t('predictions.cardCornerTab.loading')}</Text>
                </View>
              ) : cardCornerStats && cardCornerStats.length > 0 ? (
                <>
                  {/* Cards Section */}
                  <SectionHeaderWithInfo title={t('predictions.sections.cardStats')} onInfoPress={() => setShowInfoModal(true)} />
                  <View style={styles.cardCornerGrid}>
                    {cardCornerStats.map((teamStats, teamIdx) => {
                      const yellowCards = teamStats.statistics?.find(s => s.type === 'Yellow Cards')?.value || 0;
                      const redCards = teamStats.statistics?.find(s => s.type === 'Red Cards')?.value || 0;
                      const fouls = teamStats.statistics?.find(s => s.type === 'Fouls')?.value || 0;

                      return (
                        <View key={teamIdx} style={styles.cardCornerTeamCard}>
                          <View style={styles.cardCornerTeamHeader}>
                            {teamStats.team?.logo && (
                              <Image source={{ uri: teamStats.team.logo }} style={styles.cardCornerTeamLogo} />
                            )}
                            <Text style={styles.cardCornerTeamName} numberOfLines={1}>{teamStats.team?.name}</Text>
                          </View>
                          <View style={styles.cardCornerStatsRow}>
                            <View style={styles.cardCornerStatItem}>
                              <View style={[styles.cardIcon, { backgroundColor: '#FFD500' }]} />
                              <Text style={styles.cardCornerStatValue}>{yellowCards}</Text>
                              <Text style={styles.cardCornerStatLabel}>{t('predictions.yellowCard')}</Text>
                            </View>
                            <View style={styles.cardCornerStatItem}>
                              <View style={[styles.cardIcon, { backgroundColor: '#FF453A' }]} />
                              <Text style={styles.cardCornerStatValue}>{redCards}</Text>
                              <Text style={styles.cardCornerStatLabel}>{t('predictions.redCard')}</Text>
                            </View>
                            <View style={styles.cardCornerStatItem}>
                              <Ionicons name="warning" size={16} color={COLORS.gray400} />
                              <Text style={styles.cardCornerStatValue}>{fouls}</Text>
                              <Text style={styles.cardCornerStatLabel}>{t('predictions.cardCornerTab.foul')}</Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  {/* Corners Section */}
                  <SectionHeaderWithInfo title={t('predictions.sections.cornerStats')} onInfoPress={() => setShowInfoModal(true)} />
                  <View style={styles.cornerComparison}>
                    {cardCornerStats.map((teamStats, teamIdx) => {
                      const corners = teamStats.statistics?.find(s => s.type === 'Corner Kicks')?.value || 0;
                      return (
                        <View key={teamIdx} style={styles.cornerTeamItem}>
                          <Text style={styles.cornerTeamName} numberOfLines={1}>{teamStats.team?.name}</Text>
                          <View style={styles.cornerBar}>
                            <View style={[styles.cornerBarFill, { width: `${Math.min(corners * 10, 100)}%` }]} />
                          </View>
                          <Text style={styles.cornerValue}>{corners}</Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Other Stats */}
                  <SectionHeaderWithInfo title={t('predictions.sections.otherStats')} onInfoPress={() => setShowInfoModal(true)} />
                  <View style={styles.otherStatsGrid}>
                    {['Ball Possession', 'Total Shots', 'Shots on Goal', 'Offsides'].map((statType) => {
                      const homeValue = cardCornerStats[0]?.statistics?.find(s => s.type === statType)?.value || 0;
                      const awayValue = cardCornerStats[1]?.statistics?.find(s => s.type === statType)?.value || 0;
                      const statLabels = {
                        'Ball Possession': t('predictions.cardCornerTab.ballPossession'),
                        'Total Shots': t('predictions.cardCornerTab.totalShots'),
                        'Shots on Goal': t('predictions.cardCornerTab.shotsOnGoal'),
                        'Offsides': t('predictions.cardCornerTab.offsides')
                      };

                      return (
                        <View key={statType} style={styles.otherStatRow}>
                          <Text style={styles.otherStatValue}>{homeValue}</Text>
                          <Text style={styles.otherStatLabel}>{statLabels[statType] || statType}</Text>
                          <Text style={styles.otherStatValue}>{awayValue}</Text>
                        </View>
                      );
                    })}
                  </View>
                </>
              ) : (
                <View style={styles.noDataContainer}>
                  <Ionicons name="card-outline" size={48} color={COLORS.gray600} />
                  <Text style={styles.noDataText}>{t('predictions.statsNotFound')}</Text>
                  <Text style={styles.noDataSubtext}>{t('predictions.statsAfterMatch')}</Text>
                </View>
              )}
            </>
          )}

          {/* TAB: Sakat/Cezalı (Injuries & Suspensions) - Collapsible */}
          {activeTab === 'sakatlık' && (
            <>
              {tabLoading['sakatlık'] ? (
                <View style={styles.tabLoadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.accent} />
                  <Text style={styles.tabLoadingText}>{t('predictions.injuriesTab.loading')}</Text>
                </View>
              ) : (
                <>
                  {/* Always show both teams with collapsible sections */}
                  {[match?.home, match?.away].map((team, teamIdx) => {
                    const teamInjuries = injuries?.filter(i => i.team?.id === team?.id) || [];
                    const isExpanded = injuryExpanded[team?.id] !== false; // Default expanded

                    return (
                      <View key={teamIdx} style={styles.injuryTeamSection}>
                        {/* Clickable Header */}
                        <TouchableOpacity
                          style={styles.injuryTeamHeaderClickable}
                          onPress={() => setInjuryExpanded(prev => ({
                            ...prev,
                            [team?.id]: !isExpanded
                          }))}
                          activeOpacity={0.7}
                        >
                          {team?.logo && (
                            <Image source={{ uri: team.logo }} style={styles.injuryTeamLogo} />
                          )}
                          <Text style={styles.injuryTeamName}>{team?.name}</Text>
                          <View style={[
                            styles.injuryCountBadge,
                            teamInjuries.length === 0 && styles.injuryCountBadgeEmpty
                          ]}>
                            <Text style={[
                              styles.injuryCountText,
                              teamInjuries.length === 0 && styles.injuryCountTextEmpty
                            ]}>
                              {teamInjuries.length}
                            </Text>
                          </View>
                          <Ionicons
                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                            size={20}
                            color={COLORS.gray400}
                            style={styles.injuryExpandIcon}
                          />
                        </TouchableOpacity>

                        {/* Collapsible Content */}
                        {isExpanded && teamInjuries.length > 0 && (
                          <View style={styles.injuryListContainer}>
                            {teamInjuries.map((injury, injIdx) => (
                              <View key={injIdx} style={styles.injuryCard}>
                                <View style={styles.injuryPlayerInfo}>
                                  <Text style={styles.injuryPlayerName}>{injury.player?.name}</Text>
                                  <Text style={styles.injuryPlayerPos}>{injury.player?.type || 'Oyuncu'}</Text>
                                </View>
                                <View style={styles.injuryDetails}>
                                  <View style={[
                                    styles.injuryTypeBadge,
                                    { backgroundColor: injury.player?.reason?.includes('Kart') || injury.player?.reason?.includes('Suspen') ? '#FF453A20' : '#FF9F0A20' }
                                  ]}>
                                    <Ionicons
                                      name={injury.player?.reason?.includes('Kart') || injury.player?.reason?.includes('Suspen') ? 'card' : 'medkit'}
                                      size={14}
                                      color={injury.player?.reason?.includes('Kart') || injury.player?.reason?.includes('Suspen') ? '#FF453A' : '#FF9F0A'}
                                    />
                                    <Text style={[
                                      styles.injuryTypeText,
                                      { color: injury.player?.reason?.includes('Kart') || injury.player?.reason?.includes('Suspen') ? '#FF453A' : '#FF9F0A' }
                                    ]}>
                                      {injury.player?.reason?.includes('Kart') || injury.player?.reason?.includes('Suspen') ? t('predictions.injuriesTab.suspended') : t('predictions.injuriesTab.injured')}
                                    </Text>
                                  </View>
                                  <Text style={styles.injuryReason} numberOfLines={2}>{injury.player?.reason || t('predictions.injuriesTab.notSpecified')}</Text>
                                </View>
                              </View>
                            ))}
                          </View>
                        )}

                        {/* Empty state when expanded but no injuries */}
                        {isExpanded && teamInjuries.length === 0 && (
                          <View style={styles.noInjuryContainer}>
                            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                            <Text style={styles.noInjuryText}>{t('predictions.injuriesTab.noInjuries')}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </>
              )}
            </>
          )}

          {/* Minimal Disclaimer */}
          <View style={styles.detailDisclaimerMinimal}>
            <Ionicons name="information-circle-outline" size={14} color={COLORS.gray500} />
            <Text style={styles.detailDisclaimerMinimalText}>{t('predictions.entertainmentDisclaimer')}</Text>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      ) : (
        <View style={styles.detailErrorContainer}>
          <Ionicons name="alert-circle-outline" size={56} color={COLORS.gray500} />
          <Text style={styles.detailErrorText}>{t('predictions.predictionFailed')}</Text>
          <Text style={styles.detailErrorSubtext}>{t('predictions.tryAgain')}</Text>
        </View>
      )}

      {/* Info Modal */}
      <Modal visible={showInfoModal} transparent animationType="fade">
        <Pressable style={styles.infoModalOverlay} onPress={() => setShowInfoModal(false)}>
          <View style={styles.infoModalContent}>
            <Text style={styles.infoModalTitle}>{t('paywall.info')}</Text>
            <Text style={styles.infoModalText}>
              {t('predictions.detailDisclaimer')}
            </Text>
            <TouchableOpacity style={styles.infoModalBtn} onPress={() => setShowInfoModal(false)}>
              <Text style={styles.infoModalBtnText}>{t('common.ok')}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </Animated.View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PREDICTIONS SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
const PredictionsScreen = () => {
  // Safe area insets for proper header positioning
  const insets = useSafeAreaInsets();

  // PRO subscription check - hooks must be called unconditionally
  const { isPro } = useSubscription();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [matchesByLeague, setMatchesByLeague] = useState({});
  const [expandedLeagues, setExpandedLeagues] = useState({});
  const [searchText, setSearchText] = useState('');
  const searchInputRef = useRef(null);
  const [selectedDateOffset, setSelectedDateOffset] = useState(0);
  const [userCountry, setUserCountry] = useState(null);

  // Prediction Page State
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showPredictionPage, setShowPredictionPage] = useState(false);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [currentPredictions, setCurrentPredictions] = useState(null);

  // Cache State
  const [cachedMatchIds, setCachedMatchIds] = useState(new Set());

  // Disclaimer Modal State
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);

  // Rate Limit State
  const [rateLimitError, setRateLimitError] = useState(null);
  const [showRateLimitPaywall, setShowRateLimitPaywall] = useState(false);
  const [showProPaywall, setShowProPaywall] = useState(false);
  const [showRateLimitInfo, setShowRateLimitInfo] = useState(false);

  const dateOptions = [-1, 0, 1, 2, 3, 4, 5]; // 7 günlük tarih aralığı

  // Helpers
  const getDateString = (offset = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return date.toISOString().split('T')[0];
  };

  // Date Tab Formatters
  const formatDayShort = (offset) => {
    const days = [
      t('predictions.days.sun'),
      t('predictions.days.mon'),
      t('predictions.days.tue'),
      t('predictions.days.wed'),
      t('predictions.days.thu'),
      t('predictions.days.fri'),
      t('predictions.days.sat')
    ];
    const date = new Date();
    date.setDate(date.getDate() + offset);

    if (offset === 0) return t('predictions.today');
    if (offset === -1) return t('predictions.yesterday');
    if (offset === 1) return t('predictions.tomorrow');

    return days[date.getDay()];
  };

  const formatDateNum = (offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return `${date.getDate()}`;
  };

  // Locale detection
  useEffect(() => {
    try {
      const rawLocale = Localization.locale || 'tr';
      const locale = rawLocale.split(/[-_]/)[0].toLowerCase();
      const country = LOCALE_TO_COUNTRY[locale] || null;
      setUserCountry(country);
    } catch (e) {
      // Silent fail
    }
  }, []);

  // Cache kontrolü ve temizliği
  useEffect(() => {
    const initCache = async () => {
      // Eski cache'leri temizle
      await cleanOldPredictionCache();
      // Cache'deki maç ID'lerini al
      const cachedIds = await getCachedMatchIds();
      setCachedMatchIds(cachedIds);
    };
    initCache();
  }, []);

  // Maç listesi değiştiğinde cache'i güncelle
  const refreshCachedMatchIds = useCallback(async () => {
    const cachedIds = await getCachedMatchIds();
    setCachedMatchIds(cachedIds);
  }, []);

  // Fetch data
  const fetchData = useCallback(async (dateOffset = selectedDateOffset) => {
    try {
      setLoading(true);
      const dateString = getDateString(dateOffset);
      const fixtures = await footballApi.getFixturesByDate(dateString);

      if (fixtures && fixtures.length > 0) {
        const formatted = fixtures.map(f => {
          const match = footballApi.formatFixture(f);
          return match;
        });

        const grouped = {};
        formatted.forEach(match => {
          const leagueId = match.league?.id || 'unknown';
          const leagueKey = `league_${leagueId}`;
          if (!grouped[leagueKey]) {
            grouped[leagueKey] = {
              id: leagueId,
              name: match.league?.name || 'Bilinmeyen Lig',
              country: match.league?.country || '',
              flag: match.league?.flag,
              logo: match.league?.logo,
              matches: [],
            };
          }
          grouped[leagueKey].matches.push(match);
        });
        setMatchesByLeague(grouped);
      } else {
        setMatchesByLeague({});
      }
    } catch (err) {
      // Silent fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDateOffset]);

  useEffect(() => {
    fetchData(selectedDateOffset);
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [selectedDateOffset]);

  // Sorted leagues
  const sortedLeagues = useMemo(() => {
    if (Object.keys(matchesByLeague).length === 0) return [];

    return Object.entries(matchesByLeague).sort(([, a], [, b]) => {
      if (userCountry) {
        const aIsUser = a.country === userCountry;
        const bIsUser = b.country === userCountry;
        if (aIsUser && !bIsUser) return -1;
        if (!aIsUser && bIsUser) return 1;
      }
      const aPop = POPULAR_LEAGUE_IDS.indexOf(a.id);
      const bPop = POPULAR_LEAGUE_IDS.indexOf(b.id);
      const aIsPop = aPop !== -1;
      const bIsPop = bPop !== -1;
      if (aIsPop && !bIsPop) return -1;
      if (!aIsPop && bIsPop) return 1;
      if (aIsPop && bIsPop) return aPop - bPop;
      return (a.country + a.name).localeCompare(b.country + b.name);
    });
  }, [matchesByLeague, userCountry]);

  // Auto expand first league
  useEffect(() => {
    if (sortedLeagues.length > 0 && Object.keys(expandedLeagues).length === 0) {
      setExpandedLeagues({ [sortedLeagues[0][0]]: true });
    }
  }, [sortedLeagues]);

  const toggleLeague = (key) => {
    setExpandedLeagues(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDateChange = (offset) => {
    if (offset !== selectedDateOffset) {
      setSelectedDateOffset(offset);
      setMatchesByLeague({});
      setExpandedLeagues({});
    }
  };

  // Filter matches by search
  const getFilteredMatches = (matches, league) => {
    if (!searchText.trim()) return matches;

    const s = searchText.toLowerCase().trim();
    const leagueMatches = league && (
      league.name?.toLowerCase().includes(s) ||
      league.country?.toLowerCase().includes(s)
    );

    if (leagueMatches) return matches;

    return matches.filter(m =>
      m.home?.name?.toLowerCase().includes(s) ||
      m.away?.name?.toLowerCase().includes(s)
    );
  };

  // Handle prediction request
  const handleGetPrediction = async (match) => {
    // PRO check - show paywall if not subscribed
    if (!isPro) {
      setShowProPaywall(true);
      return;
    }

    setSelectedMatch(match);
    setShowPredictionPage(true);
    setPredictionLoading(true);
    setCurrentPredictions(null);
    setRateLimitError(null);

    try {
      // Edge Function handles: rate limiting + Supabase cache + Claude API
      const predictions = await getBettingPredictions(match);

      if (predictions) {
        // Check for rate limit error
        if (predictions.rateLimitExceeded) {
          setRateLimitError(predictions.rateLimitMessage);
          setShowPredictionPage(false); // Sayfayı kapat - kullanıcı detay sayfasına girmemeli
          setShowRateLimitInfo(true); // Ana seviyede info modal göster
          setPredictionLoading(false);
          return; // İşlemi durdur
        } else {
          setRateLimitError(null);
          setCurrentPredictions(predictions);
        }
      }

      // Cache güncelle (local AsyncStorage cache)
      await refreshCachedMatchIds();
    } catch (error) {
      setCurrentPredictions(null);
    } finally {
      setPredictionLoading(false);
    }
  };

  const closePredictionPage = () => {
    setShowPredictionPage(false);
    setTimeout(() => {
      setSelectedMatch(null);
      setCurrentPredictions(null);
    }, 300); // Animasyon bitmesini bekle
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>{t('predictions.title')}</Text>
        <TouchableOpacity style={styles.infoButton} onPress={() => setShowDisclaimerModal(true)}>
          <Ionicons name="help-circle-outline" size={24} color={COLORS.gray400} />
        </TouchableOpacity>
      </View>

      {/* DISCLAIMER */}
      <DisclaimerBanner />

      {/* DATE TABS */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dateTabsContainer}
        contentContainerStyle={styles.dateTabsContent}
      >
        {dateOptions.map((offset) => (
          <TouchableOpacity
            key={offset}
            style={[
              styles.dateTab,
              selectedDateOffset === offset && styles.dateTabActive
            ]}
            onPress={() => handleDateChange(offset)}
          >
            <Text style={[
              styles.dateTabDay,
              selectedDateOffset === offset && styles.dateTabDayActive
            ]}>
              {formatDayShort(offset)}
            </Text>
            <Text style={[
              styles.dateTabDate,
              selectedDateOffset === offset && styles.dateTabDateActive
            ]}>
              {formatDateNum(offset)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* SEARCH BAR */}
      <View style={styles.searchContainer}>
        <Pressable
          style={styles.searchBar}
          onPress={() => searchInputRef.current?.focus()}
        >
          <Ionicons name="search" size={18} color={COLORS.gray500} style={styles.searchIcon} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder={t('predictions.searchPlaceholder')}
            placeholderTextColor={COLORS.gray500}
            value={searchText}
            onChangeText={setSearchText}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            selectionColor={COLORS.accent}
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchText('');
                searchInputRef.current?.focus();
              }}
              style={styles.searchClearBtn}
            >
              <Ionicons name="close-circle" size={20} color={COLORS.gray500} />
            </TouchableOpacity>
          )}
        </Pressable>
      </View>

      {/* CONTENT */}
      {loading ? (
        <PredictionLoadingAnimation />
      ) : (
        <ScrollView
          style={styles.matchesScroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchData(selectedDateOffset)}
              tintColor={COLORS.accent}
            />
          }
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            {sortedLeagues.length === 0 ? (
              <View style={styles.noMatchesBox}>
                <Ionicons name="football-outline" size={40} color={COLORS.gray700} />
                <Text style={styles.noMatchesText}>{t('predictions.noMatches')}</Text>
              </View>
            ) : (
              sortedLeagues.map(([leagueKey, league]) => {
                const filteredMatches = getFilteredMatches(league.matches, league);
                if (filteredMatches.length === 0) return null;

                return (
                  <View key={leagueKey} style={styles.leagueSection}>
                    <TouchableOpacity
                      style={styles.leagueHeader}
                      onPress={() => toggleLeague(leagueKey)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.leagueInfo}>
                        <View style={styles.flagContainer}>
                          {(league.flag || league.logo) ? (
                            <Image
                              source={{ uri: league.flag || league.logo }}
                              style={styles.leagueFlag}
                              resizeMode="cover"
                            />
                          ) : (
                            <Ionicons name="football" size={16} color={COLORS.gray500} />
                          )}
                        </View>
                        <Text style={styles.leagueName} numberOfLines={1}>
                          {league.country ? `${league.country} - ${league.name}` : league.name}
                        </Text>
                      </View>
                      <View style={styles.leagueRight}>
                        <Text style={styles.matchCount}>{filteredMatches.length}</Text>
                        <Ionicons
                          name={expandedLeagues[leagueKey] ? 'chevron-up' : 'chevron-down'}
                          size={20}
                          color={COLORS.gray500}
                        />
                      </View>
                    </TouchableOpacity>

                    {expandedLeagues[leagueKey] && (
                      <View style={styles.matchesList}>
                        {filteredMatches.map((match) => (
                          <View key={match.id} style={styles.matchCard}>
                            <View style={styles.matchTimeCol}>
                              <Text style={styles.matchTimeText}>{match.time}</Text>
                            </View>

                            <View style={styles.teamsCol}>
                              <View style={styles.teamRow}>
                                <View style={styles.teamLogoContainer}>
                                  {match.home?.logo ? (
                                    <Image source={{ uri: match.home.logo }} style={styles.teamLogoSmall} resizeMode="contain" />
                                  ) : (
                                    <Ionicons name="shirt-outline" size={14} color={COLORS.gray600} />
                                  )}
                                </View>
                                <Text style={styles.teamNameText} numberOfLines={1}>
                                  {match.home?.name || 'Ev Sahibi'}
                                </Text>
                              </View>
                              <View style={styles.teamRow}>
                                <View style={styles.teamLogoContainer}>
                                  {match.away?.logo ? (
                                    <Image source={{ uri: match.away.logo }} style={styles.teamLogoSmall} resizeMode="contain" />
                                  ) : (
                                    <Ionicons name="shirt-outline" size={14} color={COLORS.gray600} />
                                  )}
                                </View>
                                <Text style={styles.teamNameText} numberOfLines={1}>
                                  {match.away?.name || t('predictions.away')}
                                </Text>
                              </View>
                            </View>

                            {cachedMatchIds.has(String(match.id)) ? (
                              <TouchableOpacity
                                style={styles.cachedButton}
                                onPress={() => handleGetPrediction(match)}
                              >
                                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                                <Text style={styles.cachedButtonText}>{t('predictions.cached')}</Text>
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity
                                style={styles.predictButton}
                                onPress={() => handleGetPrediction(match)}
                              >
                                <Ionicons name="analytics" size={16} color={COLORS.accent} />
                                <Text style={styles.predictButtonText}>{t('predictions.predictButton')}</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })
            )}
            <View style={{ height: 120 }} />
          </Animated.View>
        </ScrollView>
      )}

      {/* PREDICTION DETAIL PAGE (Yandan Açılan) */}
      <PredictionDetailPage
        visible={showPredictionPage}
        match={selectedMatch}
        predictions={currentPredictions}
        loading={predictionLoading}
        onClose={closePredictionPage}
      />

      {/* RATE LIMIT INFO MODAL - Parent seviyede, detay sayfası AÇILMADAN gösterilir */}
      <Modal visible={showRateLimitInfo} transparent animationType="none">
        <View style={styles.rateLimitModalOverlay}>
          <View style={styles.rateLimitModalContent}>
            <View style={styles.rateLimitIconCircle}>
              <Ionicons name="lock-closed" size={32} color="#FF6B35" />
            </View>
            <Text style={styles.rateLimitModalTitle}>
              {t('predictions.rateLimitModal.title')}
            </Text>
            <Text style={styles.rateLimitModalMessage}>
              {t('predictions.rateLimitModal.message')}
            </Text>
            <TouchableOpacity
              style={styles.rateLimitModalButton}
              onPress={() => {
                setShowRateLimitInfo(false);
                setShowRateLimitPaywall(true);
              }}
            >
              <Text style={styles.rateLimitModalButtonText}>
                {t('predictions.rateLimitModal.button')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* RATE LIMIT PAYWALL - Info modal kapandıktan sonra açılır */}
      {showRateLimitPaywall && (
        <PaywallScreen
          visible={showRateLimitPaywall}
          onClose={() => {
            setShowRateLimitPaywall(false);
          }}
        />
      )}

      {/* PRO PAYWALL - Tahmin detayına tıklandığında */}
      {showProPaywall && (
        <PaywallScreen
          visible={showProPaywall}
          onClose={() => {
            setShowProPaywall(false);
          }}
        />
      )}

      {/* DISCLAIMER MODAL */}
      <Modal
        visible={showDisclaimerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDisclaimerModal(false)}
      >
        <Pressable
          style={styles.disclaimerModalOverlay}
          onPress={() => setShowDisclaimerModal(false)}
        >
          <View style={styles.disclaimerModalContent}>
            <View style={styles.disclaimerModalHeader}>
              <Ionicons name="information-circle" size={28} color={COLORS.accent} />
              <Text style={styles.disclaimerModalTitle}>{t('predictions.disclaimerTitle')}</Text>
            </View>

            <Text style={styles.disclaimerModalText}>
              {t('predictions.disclaimer.paragraph1')} <Text style={styles.disclaimerBold}>{t('predictions.disclaimer.paragraph1Bold')}</Text>.
            </Text>

            <Text style={styles.disclaimerModalText}>
              {t('predictions.disclaimer.paragraph2Start')} <Text style={styles.disclaimerBold}>{t('predictions.disclaimer.paragraph2Bold')}</Text>{t('predictions.disclaimer.paragraph2End')}
            </Text>

            <Text style={styles.disclaimerModalText}>
              {t('predictions.disclaimer.paragraph3Start')} <Text style={styles.disclaimerBold}>{t('predictions.disclaimer.paragraph3Bold')}</Text>{t('predictions.disclaimer.paragraph3End')}
            </Text>

            <Text style={styles.disclaimerModalSmall}>
              {t('predictions.disclaimer.paragraph4')}
            </Text>

            <TouchableOpacity
              style={styles.disclaimerModalButton}
              onPress={() => setShowDisclaimerModal(false)}
            >
              <Text style={styles.disclaimerModalButtonText}>{t('predictions.disclaimer.iUnderstand')}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  // Header (HomeScreen ile aynı oranlar)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  infoButton: {
    padding: 4,
  },

  // Disclaimer
  disclaimerBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  disclaimerText: {
    fontSize: 11,
    color: COLORS.gray500,
    textAlign: 'center',
  },

  // Rate Limit Banner
  rateLimitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  rateLimitText: {
    color: '#FF6B35',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },

  // Date Tabs (Horizontal Scroll)
  dateTabsContainer: {
    flexGrow: 0,
    paddingHorizontal: 12,
    paddingTop: 8,
    marginBottom: 10,
  },
  dateTabsContent: {
    gap: 6,
    paddingRight: 12,
  },
  dateTab: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    minWidth: 48,
  },
  dateTabActive: {
    backgroundColor: COLORS.accentDim,
    borderColor: COLORS.accent,
  },
  dateTabDay: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.gray400,
    marginBottom: 1,
  },
  dateTabDayActive: {
    color: COLORS.accent,
  },
  dateTabDate: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  dateTabDateActive: {
    color: COLORS.accent,
  },

  // Search
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: COLORS.white,
    fontSize: 15,
    height: '100%',
  },
  searchClearBtn: {
    padding: 6,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 14,
    color: COLORS.gray500,
    fontSize: 15,
  },

  // No Matches
  noMatchesBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 50,
  },
  noMatchesText: {
    marginTop: 14,
    color: COLORS.gray500,
    fontSize: 15,
  },

  // Matches Scroll
  matchesScroll: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // League Section
  leagueSection: {
    marginBottom: 16,
  },
  leagueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
  },
  leagueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flagContainer: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  leagueFlag: {
    width: 26,
    height: 26,
  },
  leagueName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
    flex: 1,
  },
  leagueRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  matchCount: {
    fontSize: 13,
    color: COLORS.gray500,
    fontWeight: '600',
  },

  // Match Card
  matchesList: {
    gap: 10,
  },
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  matchTimeCol: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    paddingRight: 10,
    marginRight: 12,
  },
  matchTimeText: {
    fontSize: 13,
    color: COLORS.white,
    fontWeight: '700',
  },
  teamsCol: {
    flex: 1,
    gap: 8,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamLogoContainer: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  teamLogoSmall: {
    width: 20,
    height: 20,
  },
  teamNameText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray100,
    flex: 1,
  },

  // Predict Button
  predictButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentDim,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.accent,
    gap: 6,
  },
  predictButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.accent,
  },

  // Cached Button (Hazır)
  cachedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 217, 119, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.success,
    gap: 6,
  },
  cachedButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.success,
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // DETAIL PAGE STYLES (Yandan Açılan Sayfa)
  // ═══════════════════════════════════════════════════════════════════════════════
  detailPage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: SCREEN_WIDTH,
    backgroundColor: COLORS.bg,
    zIndex: 1000,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: COLORS.bg,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 12,
  },
  headerLeagueLogo: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  headerLeagueName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray300,
    maxWidth: 180,
  },
  headerInfoBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: COLORS.bg,
  },

  // Pitch Hero Section
  pitchHero: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 0,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.2)',
  },
  pitchHeroBackground: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  pitchHeroBackgroundImage: {
    borderRadius: 16,
  },
  pitchHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 16,
  },
  heroTeam: {
    flex: 1,
    alignItems: 'center',
    zIndex: 1,
  },
  heroTeamLogo: {
    width: 48,
    height: 48,
    marginBottom: 6,
  },
  heroTeamName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroCenter: {
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 1,
  },
  heroTime: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.white,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroAIBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
    gap: 4,
  },
  heroAIText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
  },

  // Match Info Card (legacy - can be removed)
  matchInfoCard: {
    backgroundColor: COLORS.card,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  matchTeamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamInfoCol: {
    flex: 1,
    alignItems: 'center',
    gap: 10,
  },
  teamLogoLarge: {
    width: 48,
    height: 48,
  },
  teamNameLarge: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    textAlign: 'center',
  },
  vsContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  vsTextLarge: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.gray500,
  },
  matchTimeLarge: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
    marginTop: 4,
  },
  leagueNameLarge: {
    fontSize: 13,
    color: COLORS.gray400,
    textAlign: 'center',
    marginTop: 16,
  },

  // Detail Disclaimer (Minimal)
  detailDisclaimerMinimal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  detailDisclaimerMinimalText: {
    fontSize: 11,
    color: COLORS.gray500,
  },

  // Detail Loading
  detailLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLoadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  detailLoadingSubtext: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.gray500,
  },

  // Detail Scroll
  detailScrollView: {
    flex: 1,
  },
  detailScrollContent: {
    padding: 16,
  },

  // Summary
  summaryBox: {
    backgroundColor: COLORS.card,
    padding: 18,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  summaryText: {
    fontSize: 14,
    color: COLORS.gray300,
    lineHeight: 22,
  },

  // Top Pick
  topPickBox: {
    backgroundColor: 'rgba(255, 213, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 213, 0, 0.3)',
    padding: 18,
    borderRadius: 14,
    marginBottom: 16,
  },
  topPickHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  topPickTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.warning,
  },
  topPickBet: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  topPickMeta: {
    marginTop: 8,
  },
  topPickConfidence: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
  },
  topPickReasoning: {
    fontSize: 13,
    color: COLORS.gray400,
    marginTop: 6,
    lineHeight: 20,
  },

  // Predictions Section
  predictionsSection: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Circular Progress
  circularProgressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  circularProgressFill: {
    position: 'absolute',
  },
  circularProgressText: {
    fontSize: 12,
    fontWeight: '800',
    zIndex: 1,
  },

  // Prediction Card
  predictionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  predictionCardFirst: {
    borderColor: COLORS.accent,
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  predictionProgress: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  predictionInfo: {
    flex: 1,
    gap: 4,
  },
  predictionName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  predictionType: {
    fontSize: 13,
    color: COLORS.gray400,
  },
  predictionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  categoryBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 5,
  },
  riskText: {
    fontSize: 11,
    fontWeight: '700',
  },
  predictionBody: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  reasoningText: {
    fontSize: 13,
    color: COLORS.gray400,
    lineHeight: 20,
  },

  // Risk Warning
  riskWarningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    padding: 14,
    borderRadius: 12,
    marginTop: 12,
    gap: 12,
  },
  riskWarningText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.danger,
    lineHeight: 20,
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // IDDAA-STYLE FRAMEWORK STYLES
  // ═══════════════════════════════════════════════════════════════════════════════

  // Tab Navigation
  tabNavigation: {
    backgroundColor: COLORS.bg,
    paddingTop: 12,
    paddingBottom: 8,
  },
  tabScrollContent: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabButtonActive: {
    backgroundColor: COLORS.accentDim,
    borderColor: COLORS.accent,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray400,
  },
  tabButtonTextActive: {
    color: COLORS.accent,
  },

  // Match Info Card Compact
  matchInfoCardCompact: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  matchTeamsRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamInfoColCompact: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  teamLogoCompact: {
    width: 40,
    height: 40,
  },
  teamNameCompact: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
    textAlign: 'center',
  },
  vsContainerCompact: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  vsTextCompact: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.gray600,
  },
  matchTimeCompact: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
    marginTop: 2,
  },

  // Top Pick Compact
  topPickCompact: {
    backgroundColor: 'rgba(255, 213, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 213, 0, 0.3)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  topPickCompactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topPickCompactLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.warning,
  },
  topPickCompactValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  topPickCompactConf: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.success,
  },

  // Odds Grid
  oddsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  oddsCard: {
    width: (SCREEN_WIDTH - 32 - 20) / 3,
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  oddsCardHighlighted: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentDim,
  },
  oddsCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.gray400,
    marginBottom: 6,
    textAlign: 'center',
  },
  oddsCardValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  oddsCardValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  oddsCardTrend: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  oddsCardSelection: {
    fontSize: 10,
    color: COLORS.gray500,
    marginTop: 6,
    textAlign: 'center',
  },

  // Section Header with Info
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gray300,
    letterSpacing: 1,
  },
  sectionInfoBtn: {
    padding: 4,
  },

  // Explanation Box
  explanationBox: {
    backgroundColor: 'rgba(120, 120, 128, 0.12)',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  explanationTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gray300,
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 12,
    color: COLORS.gray400,
    lineHeight: 18,
  },

  // Analysis Box
  analysisBox: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  analysisBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  analysisBoxTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.warning,
  },
  analysisText: {
    fontSize: 13,
    color: COLORS.gray300,
    lineHeight: 20,
  },

  // Risk Warning Compact
  riskWarningCompact: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 10,
  },
  riskWarningCompactText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.danger,
    lineHeight: 18,
  },

  // Reasoning Items
  reasoningItem: {
    backgroundColor: COLORS.card,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reasoningItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reasoningItemLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  reasoningItemConf: {
    fontSize: 14,
    fontWeight: '800',
  },
  reasoningItemText: {
    fontSize: 12,
    color: COLORS.gray400,
    lineHeight: 18,
  },

  // Stats Overview
  statsOverview: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.card,
    padding: 20,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statsOverviewItem: {
    alignItems: 'center',
  },
  statsOverviewValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.white,
  },
  statsOverviewLabel: {
    fontSize: 12,
    color: COLORS.gray500,
    marginTop: 4,
  },

  // Stats List
  statsList: {
    backgroundColor: COLORS.card,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statListDot: {
    fontSize: 14,
    color: COLORS.accent,
    marginRight: 10,
  },
  statListLabel: {
    flex: 1,
    fontSize: 13,
    color: COLORS.gray300,
  },
  statListValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
    marginRight: 8,
  },
  statListCount: {
    fontSize: 12,
    color: COLORS.gray500,
  },

  // Info Modal
  infoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  infoModalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 16,
    textAlign: 'center',
  },
  infoModalText: {
    fontSize: 14,
    color: COLORS.gray300,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  infoModalBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  infoModalBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Detail Error
  detailErrorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailErrorText: {
    marginTop: 16,
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.gray400,
  },
  detailErrorSubtext: {
    marginTop: 6,
    fontSize: 14,
    color: COLORS.gray500,
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // NEW TAB STYLES
  // ═══════════════════════════════════════════════════════════════════════════════

  // Tab Loading & No Data
  tabLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  tabLoadingText: {
    marginTop: 14,
    fontSize: 14,
    color: COLORS.gray400,
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    gap: 12,
  },
  noDataText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray400,
  },
  noDataSubtext: {
    fontSize: 13,
    color: COLORS.gray500,
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // LINEUP TAB STYLES
  // ═══════════════════════════════════════════════════════════════════════════════
  lineupTeamSection: {
    marginBottom: 20,
  },
  lineupTeamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  lineupTeamLogo: {
    width: 36,
    height: 36,
    marginRight: 12,
  },
  lineupTeamInfo: {
    flex: 1,
  },
  lineupTeamName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  lineupFormation: {
    fontSize: 13,
    color: COLORS.accent,
    marginTop: 2,
  },

  // Pitch Visualization
  pitchContainer: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.2)',
  },
  pitchVisualization: {
    height: 220, // Horizontal pitch - wider aspect ratio
    width: '100%',
    position: 'relative',
  },
  pitchVisualizationImage: {
    borderRadius: 16,
  },
  pitchOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  pitchPlayer: {
    position: 'absolute',
    alignItems: 'center',
    width: 50,
    marginLeft: -25,
    marginTop: -20,
    zIndex: 1,
  },
  pitchPlayerCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  pitchPlayerCircleAway: {
    backgroundColor: '#FF453A', // Kırmızı - deplasman takımı
  },
  pitchPlayerNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.white,
  },
  pitchPlayerName: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.white,
    textAlign: 'center',
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    maxWidth: 50,
  },

  // Coach
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  coachLabel: {
    fontSize: 13,
    color: COLORS.gray400,
  },
  coachName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },

  // Substitutes
  substitutesSection: {
    backgroundColor: COLORS.card,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  substitutesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gray300,
    marginBottom: 12,
  },
  substitutesList: {
    gap: 8,
  },
  substituteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  substituteNumber: {
    width: 28,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.accent,
  },
  substituteName: {
    flex: 1,
    fontSize: 13,
    color: COLORS.gray200,
  },
  substitutePos: {
    fontSize: 11,
    color: COLORS.gray500,
    width: 30,
    textAlign: 'right',
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // H2H TAB STYLES
  // ═══════════════════════════════════════════════════════════════════════════════
  h2hSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.card,
    padding: 20,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  h2hSummaryItem: {
    alignItems: 'center',
  },
  h2hSummaryValue: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.white,
  },
  h2hSummaryLabel: {
    fontSize: 12,
    color: COLORS.gray500,
    marginTop: 4,
  },
  h2hGoalAvg: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentDim,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  h2hGoalAvgLabel: {
    fontSize: 13,
    color: COLORS.gray300,
  },
  h2hGoalAvgValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.accent,
  },
  h2hMatchCard: {
    backgroundColor: COLORS.card,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  h2hMatchDate: {
    marginBottom: 10,
  },
  h2hMatchDateText: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  h2hMatchLeague: {
    fontSize: 11,
    color: COLORS.gray600,
    marginTop: 2,
  },
  h2hMatchTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  h2hTeamName: {
    flex: 1,
    fontSize: 13,
    color: COLORS.gray300,
  },
  h2hTeamWinner: {
    color: COLORS.white,
    fontWeight: '700',
  },
  h2hScore: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    marginHorizontal: 10,
  },
  h2hScoreText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.white,
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // CARD/CORNER TAB STYLES
  // ═══════════════════════════════════════════════════════════════════════════════
  cardCornerGrid: {
    gap: 12,
    marginBottom: 16,
  },
  cardCornerTeamCard: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardCornerTeamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  cardCornerTeamLogo: {
    width: 28,
    height: 28,
  },
  cardCornerTeamName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  cardCornerStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  cardCornerStatItem: {
    alignItems: 'center',
    gap: 6,
  },
  cardIcon: {
    width: 20,
    height: 28,
    borderRadius: 3,
  },
  cardCornerStatValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.white,
  },
  cardCornerStatLabel: {
    fontSize: 11,
    color: COLORS.gray500,
  },

  // Corner Comparison
  cornerComparison: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14,
  },
  cornerTeamItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cornerTeamName: {
    width: 80,
    fontSize: 12,
    color: COLORS.gray300,
  },
  cornerBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.bg,
    borderRadius: 4,
    overflow: 'hidden',
  },
  cornerBarFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 4,
  },
  cornerValue: {
    width: 30,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'right',
  },

  // Other Stats
  otherStatsGrid: {
    backgroundColor: COLORS.card,
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  otherStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  otherStatValue: {
    width: 50,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
  },
  otherStatLabel: {
    flex: 1,
    fontSize: 13,
    color: COLORS.gray400,
    textAlign: 'center',
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // INJURY TAB STYLES (Collapsible)
  // ═══════════════════════════════════════════════════════════════════════════════
  injuryTeamSection: {
    marginBottom: 16,
  },
  injuryTeamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  injuryTeamHeaderClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  injuryExpandIcon: {
    marginLeft: 8,
  },
  injuryListContainer: {
    marginBottom: 4,
  },
  noInjuryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 217, 119, 0.08)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    gap: 8,
  },
  noInjuryText: {
    fontSize: 13,
    color: COLORS.success,
    fontWeight: '500',
  },
  injuryCountBadgeEmpty: {
    backgroundColor: COLORS.success,
  },
  injuryCountTextEmpty: {
    color: COLORS.white,
  },
  injuryTeamLogo: {
    width: 32,
    height: 32,
    marginRight: 12,
  },
  injuryTeamName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  injuryCountBadge: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  injuryCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
  injuryCard: {
    backgroundColor: COLORS.card,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  injuryPlayerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  injuryPlayerName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
  injuryPlayerPos: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  injuryDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  injuryTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  injuryTypeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  injuryReason: {
    flex: 1,
    fontSize: 12,
    color: COLORS.gray400,
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // DISCLAIMER MODAL STYLES
  // ═══════════════════════════════════════════════════════════════════════════════
  disclaimerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  disclaimerModalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    maxWidth: 360,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  disclaimerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  disclaimerModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  disclaimerModalText: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.gray300,
    marginBottom: 12,
  },
  disclaimerBold: {
    fontWeight: '700',
    color: COLORS.white,
  },
  disclaimerModalSmall: {
    fontSize: 12,
    color: COLORS.gray500,
    marginTop: 8,
    marginBottom: 20,
    textAlign: 'center',
  },
  disclaimerModalButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  disclaimerModalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Rate Limit Info Modal
  rateLimitModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 1.0)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rateLimitModalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  rateLimitIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rateLimitModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  rateLimitModalMessage: {
    fontSize: 14,
    color: COLORS.gray400,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  rateLimitModalButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
  },
  rateLimitModalButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default PredictionsScreen;
