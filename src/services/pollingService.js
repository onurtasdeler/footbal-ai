/**
 * Polling Service - Akıllı API Polling Yönetimi
 * AppState entegrasyonu ve dinamik polling aralıkları
 */

import { AppState } from 'react-native';

// ═══════════════════════════════════════════════════════════════════════════════
// POLLING CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

// Polling aralıkları (milisaniye)
export const POLLING_INTERVALS = {
  // Canlı maç durumları
  LIVE_CRITICAL: 15000,      // 15 saniye - 85+ dakika, kritik anlar
  LIVE_IMPORTANT: 20000,     // 20 saniye - 75-84 dakika
  LIVE_ACTIVE: 30000,        // 30 saniye - normal canlı maç
  LIVE_HALFTIME: 120000,     // 2 dakika - devre arası

  // Genel durumlar
  MATCH_NOT_STARTED: 60000,  // 1 dakika - başlamamış maç
  MATCH_FINISHED: null,       // Polling yok - bitmiş maç

  // Liste sayfaları
  LIVE_LIST: 30000,          // 30 saniye - canlı maç listesi
  TODAY_FIXTURES: 60000,     // 1 dakika - bugünün maçları

  // Background mode - daha az sıklıkta
  BACKGROUND_MULTIPLIER: 3,   // Background'da 3x daha yavaş
};

// Maç durumu kodları
const MATCH_STATUSES = {
  NOT_STARTED: ['NS', 'TBD'],
  LIVE: ['1H', '2H', 'ET', 'BT', 'P'],
  HALFTIME: ['HT'],
  FINISHED: ['FT', 'AET', 'PEN'],
  IRREGULAR: ['SUSP', 'INT', 'PST', 'CANC', 'ABD', 'AWD', 'WO'],
};

// ═══════════════════════════════════════════════════════════════════════════════
// APP STATE MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

class AppStateManager {
  constructor() {
    this.currentState = AppState.currentState;
    this.listeners = new Set();
    this.subscription = null;
    this.isInitialized = false;
  }

  initialize() {
    if (this.isInitialized) return;

    this.subscription = AppState.addEventListener('change', this._handleAppStateChange);
    this.isInitialized = true;

  }

  _handleAppStateChange = (nextAppState) => {
    const previousState = this.currentState;
    this.currentState = nextAppState;


    // Notify all listeners
    this.listeners.forEach(callback => {
      try {
        callback(nextAppState, previousState);
      } catch (error) {
        // Silent fail
      }
    });
  };

  subscribe(callback) {
    this.listeners.add(callback);
    // Initialize if not already
    this.initialize();

    return () => {
      this.listeners.delete(callback);
    };
  }

  isActive() {
    return this.currentState === 'active';
  }

  isBackground() {
    return this.currentState === 'background' || this.currentState === 'inactive';
  }

  cleanup() {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    this.listeners.clear();
    this.isInitialized = false;
  }
}

// Singleton instance
export const appStateManager = new AppStateManager();

// ═══════════════════════════════════════════════════════════════════════════════
// SMART POLLING MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

class SmartPollingManager {
  constructor() {
    this.activePolls = new Map(); // id -> { interval, callback, options }
    this.appStateUnsubscribe = null;
  }

  /**
   * Akıllı polling başlat
   * @param {string} id - Unique polling ID
   * @param {Function} callback - Polling callback fonksiyonu
   * @param {Object} options - Polling seçenekleri
   */
  start(id, callback, options = {}) {
    const {
      baseInterval = POLLING_INTERVALS.LIVE_ACTIVE,
      getMatchStatus = null,   // () => { status, minute }
      pauseInBackground = true,
      runImmediately = true,
    } = options;

    // Önceki polling varsa durdur
    this.stop(id);

    const pollData = {
      callback,
      baseInterval,
      getMatchStatus,
      pauseInBackground,
      intervalId: null,
      isPaused: false,
    };

    this.activePolls.set(id, pollData);

    // AppState listener ekle
    if (!this.appStateUnsubscribe) {
      this.appStateUnsubscribe = appStateManager.subscribe(this._handleAppStateChange);
    }

    // İlk çağrıyı yap
    if (runImmediately) {
      this._executeCallback(id);
    }

    // Polling başlat
    this._startInterval(id);


    return () => this.stop(id);
  }

  /**
   * Polling durdur
   * @param {string} id - Polling ID
   */
  stop(id) {
    const pollData = this.activePolls.get(id);
    if (pollData) {
      if (pollData.intervalId) {
        clearInterval(pollData.intervalId);
      }
      this.activePolls.delete(id);

    }

    // Tüm polling'ler durmuşsa AppState listener'ı kaldır
    if (this.activePolls.size === 0 && this.appStateUnsubscribe) {
      this.appStateUnsubscribe();
      this.appStateUnsubscribe = null;
    }
  }

  /**
   * Tüm polling'leri durdur
   */
  stopAll() {
    this.activePolls.forEach((_, id) => this.stop(id));
  }

  /**
   * Polling aralığını güncelle
   * @param {string} id - Polling ID
   */
  updateInterval(id) {
    const pollData = this.activePolls.get(id);
    if (!pollData) return;

    // Mevcut interval'ı temizle ve yeniden başlat
    if (pollData.intervalId) {
      clearInterval(pollData.intervalId);
    }
    this._startInterval(id);
  }

  _startInterval(id) {
    const pollData = this.activePolls.get(id);
    if (!pollData || pollData.isPaused) return;

    const interval = this._calculateInterval(pollData);

    pollData.intervalId = setInterval(() => {
      this._executeCallback(id);
    }, interval);

    pollData.currentInterval = interval;

  }

  _executeCallback(id) {
    const pollData = this.activePolls.get(id);
    if (!pollData || pollData.isPaused) return;

    try {
      pollData.callback();
    } catch (error) {
      // Silent fail
    }
  }

  _calculateInterval(pollData) {
    let interval = pollData.baseInterval;

    // Maç durumuna göre akıllı interval hesapla
    if (pollData.getMatchStatus) {
      try {
        const { status, minute } = pollData.getMatchStatus();
        interval = getSmartPollingInterval(status, minute);
      } catch (error) {
        // getMatchStatus hata verirse base interval kullan
      }
    }

    // Background'da ise multiplier uygula
    if (appStateManager.isBackground() && pollData.pauseInBackground) {
      interval *= POLLING_INTERVALS.BACKGROUND_MULTIPLIER;
    }

    return interval;
  }

  _handleAppStateChange = (nextState, previousState) => {
    const isNowActive = nextState === 'active';
    const wasActive = previousState === 'active';

    if (isNowActive && !wasActive) {
      // Background'dan active'e geçiş - polling'leri hızlandır
      this.activePolls.forEach((pollData, id) => {
        if (pollData.isPaused) {
          pollData.isPaused = false;
        }
        this.updateInterval(id);
        // Hemen bir güncelleme yap
        this._executeCallback(id);
      });
    } else if (!isNowActive && wasActive) {
      // Active'den background'a geçiş - polling'leri yavaşlat veya durdur
      this.activePolls.forEach((pollData, id) => {
        if (pollData.pauseInBackground) {
          // Yavaşlat (durdurma yerine)
          this.updateInterval(id);
        }
      });
    }
  };
}

// Singleton instance
export const pollingManager = new SmartPollingManager();

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Maç durumuna göre akıllı polling aralığı hesapla
 * @param {string} status - Maç durumu kodu
 * @param {number} minute - Maç dakikası
 * @returns {number} - Polling aralığı (ms)
 */
export const getSmartPollingInterval = (status, minute = 0) => {
  // Bitmiş maç - polling yok
  if (MATCH_STATUSES.FINISHED.includes(status) ||
      MATCH_STATUSES.IRREGULAR.includes(status)) {
    return null;
  }

  // Başlamamış maç
  if (MATCH_STATUSES.NOT_STARTED.includes(status)) {
    return POLLING_INTERVALS.MATCH_NOT_STARTED;
  }

  // Devre arası
  if (MATCH_STATUSES.HALFTIME.includes(status)) {
    return POLLING_INTERVALS.LIVE_HALFTIME;
  }

  // Canlı maç - dakikaya göre
  if (MATCH_STATUSES.LIVE.includes(status)) {
    if (minute >= 85) {
      return POLLING_INTERVALS.LIVE_CRITICAL;
    }
    if (minute >= 75) {
      return POLLING_INTERVALS.LIVE_IMPORTANT;
    }
    return POLLING_INTERVALS.LIVE_ACTIVE;
  }

  // Default
  return POLLING_INTERVALS.LIVE_ACTIVE;
};

/**
 * Maç durumu canlı mı kontrol et
 * @param {string} status - Maç durumu kodu
 * @returns {boolean}
 */
export const isMatchLive = (status) => {
  return MATCH_STATUSES.LIVE.includes(status) ||
         MATCH_STATUSES.HALFTIME.includes(status);
};

/**
 * Maç bitmiş mi kontrol et
 * @param {string} status - Maç durumu kodu
 * @returns {boolean}
 */
export const isMatchFinished = (status) => {
  return MATCH_STATUSES.FINISHED.includes(status) ||
         MATCH_STATUSES.IRREGULAR.includes(status);
};

/**
 * Polling istatistiklerini al
 */
export const getPollingStats = () => {
  const stats = {
    activePolls: pollingManager.activePolls.size,
    polls: [],
    appState: appStateManager.currentState,
  };

  pollingManager.activePolls.forEach((pollData, id) => {
    stats.polls.push({
      id,
      interval: pollData.currentInterval,
      isPaused: pollData.isPaused,
    });
  });

  return stats;
};

// ═══════════════════════════════════════════════════════════════════════════════
// REACT HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useCallback } from 'react';

/**
 * Akıllı polling için React hook
 * @param {string} id - Unique polling ID
 * @param {Function} callback - Polling callback
 * @param {Object} options - Polling seçenekleri
 */
export const useSmartPolling = (id, callback, options = {}) => {
  const {
    enabled = true,
    baseInterval = POLLING_INTERVALS.LIVE_ACTIVE,
    getMatchStatus = null,
    pauseInBackground = true,
    deps = [],
  } = options;

  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const stableCallback = useCallback(() => {
    callbackRef.current();
  }, []);

  useEffect(() => {
    if (!enabled) {
      pollingManager.stop(id);
      return;
    }

    const unsubscribe = pollingManager.start(id, stableCallback, {
      baseInterval,
      getMatchStatus,
      pauseInBackground,
      runImmediately: true,
    });

    return () => {
      unsubscribe();
    };
  }, [id, enabled, baseInterval, ...deps]);
};

/**
 * AppState için React hook
 * @param {Function} onForeground - App öne geldiğinde
 * @param {Function} onBackground - App arkaya gittiğinde
 */
export const useAppState = (onForeground, onBackground) => {
  const onForegroundRef = useRef(onForeground);
  const onBackgroundRef = useRef(onBackground);

  onForegroundRef.current = onForeground;
  onBackgroundRef.current = onBackground;

  useEffect(() => {
    const unsubscribe = appStateManager.subscribe((nextState, previousState) => {
      const isNowActive = nextState === 'active';
      const wasActive = previousState === 'active';

      if (isNowActive && !wasActive && onForegroundRef.current) {
        onForegroundRef.current();
      } else if (!isNowActive && wasActive && onBackgroundRef.current) {
        onBackgroundRef.current();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  POLLING_INTERVALS,
  pollingManager,
  appStateManager,
  getSmartPollingInterval,
  isMatchLive,
  isMatchFinished,
  getPollingStats,
  useSmartPolling,
  useAppState,
};
