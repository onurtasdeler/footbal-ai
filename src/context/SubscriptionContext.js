import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

// ═══════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION CONTEXT - Global Subscription State Management
// ═══════════════════════════════════════════════════════════════════════════════

// DEV MODE: Set to true to bypass PRO check in Expo Go for testing
// Set to false to test paywall flow in Expo Go
const DEV_MODE_PRO_BYPASS = false; // Production: false | Test: true

const SubscriptionContext = createContext(null);

export const SubscriptionProvider = ({ children }) => {
  // In Expo Go with dev mode, simulate PRO access for testing
  const devModePro = __DEV__ && IS_EXPO_GO && DEV_MODE_PRO_BYPASS;

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
    const init = async () => {
      try {
        setIsLoading(true);
        console.log('=== SubscriptionContext Init Start ===');

        // Skip RevenueCat in Expo Go dev mode - use simulated PRO access
        if (devModePro) {
          console.log('Dev mode PRO bypass active');
          setIsLoading(false);
          return;
        }

        // Initialize SDK
        const initialized = await initializeRevenueCat();
        setIsInitialized(initialized);
        console.log('RevenueCat initialized:', initialized);

        if (initialized) {
          // Check pro status
          const hasProAccess = await checkProAccess();
          console.log('Pro access check result:', hasProAccess);
          setIsPro(hasProAccess);

          // Get customer info
          const info = await getCustomerInfo();
          setCustomerInfo(info);
          console.log('Customer info loaded');

          // Get available packages
          const availablePackages = await getPackages();
          setPackages(availablePackages);
          console.log('Packages loaded:', availablePackages?.length || 0);

          // Get prices
          const [weeklyPrice, monthlyPrice] = await Promise.all([
            getPackagePrice('weekly'),
            getPackagePrice('monthly'),
          ]);

          setPrices({
            weekly: weeklyPrice,
            monthly: monthlyPrice,
          });
          console.log('Prices loaded - weekly:', weeklyPrice?.price, 'monthly:', monthlyPrice?.price);
        }
        console.log('=== SubscriptionContext Init Complete ===');
      } catch (error) {
        console.log('SubscriptionContext init error:', error);
      } finally {
        setIsLoading(false);
        console.log('isLoading set to false');
      }
    };

    init();
  }, [devModePro]);

  // Listen for customer info updates
  useEffect(() => {
    if (!isInitialized) return;

    const unsubscribe = addCustomerInfoListener((info, hasProAccess) => {
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
      // Silent fail
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
