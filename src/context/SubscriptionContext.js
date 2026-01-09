import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import RevenueCat, {
  initializeRevenueCat,
  checkProAccess,
  getPackages,
  purchaseProduct,
  restorePurchases,
  addCustomerInfoListener,
  getCustomerInfo,
  getPackagePrice,
  IS_EXPO_GO,
} from '../services/revenueCatService';
import { logError } from '../utils/errorLogger';

// ═══════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION CONTEXT - Global Subscription State Management
// ═══════════════════════════════════════════════════════════════════════════════

// DEV MODE: Set to true to bypass PRO check in Expo Go for testing
// Set to false to test paywall flow in Expo Go
// ⚠️ PRODUCTION SAFEGUARD: Bu değer sadece __DEV__ modunda true olabilir
const DEV_MODE_PRO_BYPASS_VALUE = false; // Production: false | Test: true
const DEV_MODE_PRO_BYPASS = __DEV__ ? DEV_MODE_PRO_BYPASS_VALUE : false;

const SubscriptionContext = createContext(null);

export const SubscriptionProvider = ({ children }) => {
  // In Expo Go with dev mode, simulate PRO access for testing
  const devModePro = __DEV__ && IS_EXPO_GO && DEV_MODE_PRO_BYPASS;

  // Memory leak prevention: unmount sonrası state güncellemelerini engelle
  const isMountedRef = useRef(true);

  // State
  const [isInitialized, setIsInitialized] = useState(devModePro);
  const [isPro, setIsPro] = useState(devModePro);
  const [isLoading, setIsLoading] = useState(true);
  const [packages, setPackages] = useState([]);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [prices, setPrices] = useState({
    weekly: null,
    monthly: null,
  });

  // Initialize RevenueCat on mount
  useEffect(() => {
    // Reset mounted flag on mount
    isMountedRef.current = true;

    const init = async () => {
      try {
        if (!isMountedRef.current) return;
        setIsLoading(true);

        // Skip RevenueCat in Expo Go dev mode - use simulated PRO access
        if (devModePro) {
          if (isMountedRef.current) setIsLoading(false);
          return;
        }

        // Initialize SDK
        const initialized = await initializeRevenueCat();
        if (!isMountedRef.current) return;
        setIsInitialized(initialized);

        if (initialized) {
          // Check pro status
          const hasProAccess = await checkProAccess();
          if (!isMountedRef.current) return;
          setIsPro(hasProAccess);

          // Get customer info
          const info = await getCustomerInfo();
          if (!isMountedRef.current) return;
          setCustomerInfo(info);

          // Get available packages
          const availablePackages = await getPackages();
          if (!isMountedRef.current) return;
          setPackages(availablePackages);

          // Get prices - Promise.allSettled ile kısmi hataları yönet
          const priceResults = await Promise.allSettled([
            getPackagePrice('weekly'),
            getPackagePrice('monthly'),
          ]);

          if (!isMountedRef.current) return;
          setPrices({
            weekly: priceResults[0].status === 'fulfilled' ? priceResults[0].value : null,
            monthly: priceResults[1].status === 'fulfilled' ? priceResults[1].value : null,
          });
        }
      } catch (error) {
        logError('SubscriptionContext', 'init', error);
      } finally {
        if (isMountedRef.current) setIsLoading(false);
      }
    };

    init();

    // Cleanup: unmount flag'ı ayarla
    return () => {
      isMountedRef.current = false;
    };
  }, [devModePro]);

  // Listen for customer info updates
  useEffect(() => {
    if (!isInitialized) return;

    const unsubscribe = addCustomerInfoListener((info, hasProAccess) => {
      // Unmount sonrası state güncellemesini engelle
      if (!isMountedRef.current) return;
      setCustomerInfo(info);
      setIsPro(hasProAccess);
    });

    return () => {
      unsubscribe?.();
    };
  }, [isInitialized]);

  // Purchase handler
  const purchase = useCallback(async (productType) => {
    if (!isInitialized) {
      return { success: false, error: 'RevenueCat not initialized' };
    }

    setIsLoading(true);
    try {
      const result = await purchaseProduct(productType);

      if (result.success) {
        setIsPro(result.hasProAccess);
        setCustomerInfo(result.customerInfo);
      }

      return result;
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  // Restore handler
  const restore = useCallback(async () => {
    if (!isInitialized) {
      return { success: false, error: 'RevenueCat not initialized' };
    }

    setIsLoading(true);
    try {
      const result = await restorePurchases();

      if (result.success) {
        setIsPro(result.hasProAccess);
        setCustomerInfo(result.customerInfo);
      }

      return result;
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  // Refresh subscription status
  const refreshStatus = useCallback(async () => {
    if (!isInitialized) return;

    try {
      const hasProAccess = await checkProAccess();
      setIsPro(hasProAccess);

      const info = await getCustomerInfo();
      setCustomerInfo(info);
    } catch (error) {
      logError('SubscriptionContext', 'refreshStatus', error);
    }
  }, [isInitialized]);

  // Context value
  const value = {
    // State
    isInitialized,
    isPro,
    isLoading,
    packages,
    customerInfo,
    prices,

    // Actions
    purchase,
    restore,
    refreshStatus,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

/**
 * Hook to use subscription context
 * @returns {Object} Subscription context value
 */
export const useSubscription = () => {
  const context = useContext(SubscriptionContext);

  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }

  return context;
};

/**
 * Hook to check if user has Pro access (convenience hook)
 * @returns {boolean} True if user has Pro subscription
 */
export const useIsPro = () => {
  const { isPro } = useSubscription();
  return isPro;
};

export default SubscriptionContext;
