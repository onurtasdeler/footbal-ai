/**
 * Cache Service for AI Match Analysis
 * Stores AI analysis results until match finishes
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'ai_analysis_';
const MATCH_FINISHED_STATUSES = ['FT', 'AET', 'PEN', 'CANC', 'ABD', 'AWD', 'WO'];

const cacheService = {
  /**
   * Get cached analysis for a fixture
   * @param {number} fixtureId - Match fixture ID
   * @returns {object|null} - Cached analysis data or null
   */
  async getAnalysis(fixtureId) {
    try {
      const key = `${CACHE_PREFIX}${fixtureId}`;
      const cached = await AsyncStorage.getItem(key);

      if (!cached) return null;

      const data = JSON.parse(cached);

      // Check if match has finished (cache expired)
      if (MATCH_FINISHED_STATUSES.includes(data.matchStatus)) {
        await this.removeAnalysis(fixtureId);
        return null;
      }

      return data.analysisData;
    } catch (error) {
      console.error('Cache getAnalysis error:', error);
      return null;
    }
  },

  /**
   * Save analysis to cache
   * @param {number} fixtureId - Match fixture ID
   * @param {object} analysisData - AI analysis response
   * @param {string} matchDate - Match date/time string
   * @param {string} matchStatus - Current match status (NS, LIVE, FT, etc.)
   */
  async saveAnalysis(fixtureId, analysisData, matchDate, matchStatus = 'NS') {
    try {
      const key = `${CACHE_PREFIX}${fixtureId}`;
      const cacheData = {
        fixtureId,
        analysisData,
        cachedAt: Date.now(),
        matchDate,
        matchStatus,
        expiresWhen: 'match_finished',
      };

      await AsyncStorage.setItem(key, JSON.stringify(cacheData));
      return true;
    } catch (error) {
      console.error('Cache saveAnalysis error:', error);
      return false;
    }
  },

  /**
   * Update match status in cache
   * @param {number} fixtureId - Match fixture ID
   * @param {string} newStatus - New match status
   */
  async updateMatchStatus(fixtureId, newStatus) {
    try {
      const key = `${CACHE_PREFIX}${fixtureId}`;
      const cached = await AsyncStorage.getItem(key);

      if (!cached) return false;

      const data = JSON.parse(cached);
      data.matchStatus = newStatus;

      // If match finished, we could remove it or keep for history
      if (MATCH_FINISHED_STATUSES.includes(newStatus)) {
        await this.removeAnalysis(fixtureId);
        return true;
      }

      await AsyncStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Cache updateMatchStatus error:', error);
      return false;
    }
  },

  /**
   * Remove specific analysis from cache
   * @param {number} fixtureId - Match fixture ID
   */
  async removeAnalysis(fixtureId) {
    try {
      const key = `${CACHE_PREFIX}${fixtureId}`;
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Cache removeAnalysis error:', error);
      return false;
    }
  },

  /**
   * Check if analysis exists in cache
   * @param {number} fixtureId - Match fixture ID
   * @returns {boolean}
   */
  async hasAnalysis(fixtureId) {
    const analysis = await this.getAnalysis(fixtureId);
    return analysis !== null;
  },

  /**
   * Clear all expired caches (finished matches)
   */
  async clearExpired() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const analysisKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));

      for (const key of analysisKeys) {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          const data = JSON.parse(cached);
          if (MATCH_FINISHED_STATUSES.includes(data.matchStatus)) {
            await AsyncStorage.removeItem(key);
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Cache clearExpired error:', error);
      return false;
    }
  },

  /**
   * Clear all AI analysis caches
   */
  async clearAll() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const analysisKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));

      if (analysisKeys.length > 0) {
        await AsyncStorage.multiRemove(analysisKeys);
      }

      return true;
    } catch (error) {
      console.error('Cache clearAll error:', error);
      return false;
    }
  },

  /**
   * Get cache statistics
   * @returns {object} - Cache stats
   */
  async getStats() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const analysisKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));

      let totalSize = 0;
      const analyses = [];

      for (const key of analysisKeys) {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          totalSize += cached.length;
          const data = JSON.parse(cached);
          analyses.push({
            fixtureId: data.fixtureId,
            cachedAt: new Date(data.cachedAt).toLocaleString(),
            matchStatus: data.matchStatus,
          });
        }
      }

      return {
        count: analysisKeys.length,
        totalSizeKB: (totalSize / 1024).toFixed(2),
        analyses,
      };
    } catch (error) {
      console.error('Cache getStats error:', error);
      return { count: 0, totalSizeKB: '0', analyses: [] };
    }
  },
};

export default cacheService;
