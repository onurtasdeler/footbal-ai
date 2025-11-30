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
} from '../services/revenueCatService';

// ═══════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION CONTEXT - Global Subscription State Management
// ═══════════════════════════════════════════════════════════════════════════════

const SubscriptionContext = createContext(null);

export const SubscriptionProvider = ({ children }) => {
  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPro, setIsPro] = useState(false);
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

        // Initialize SDK
        const initialized = await initializeRevenueCat();
        setIsInitialized(initialized);

        if (initialized) {
          // Check pro status
          const hasProAccess = await checkProAccess();
          setIsPro(hasProAccess);

          // Get customer info
          const info = await getCustomerInfo();
          setCustomerInfo(info);

          // Get available packages
          const availablePackages = await getPackages();
          setPackages(availablePackages);

          // Get prices
          const [weeklyPrice, monthlyPrice] = await Promise.all([
            getPackagePrice('weekly'),
            getPackagePrice('monthly'),
          ]);

          setPrices({
            weekly: weeklyPrice,
            monthly: monthlyPrice,
          });
        }
      } catch (error) {
        console.error('[SubscriptionContext] Init error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // Listen for customer info updates
  useEffect(() => {
    if (!isInitialized) return;

    const unsubscribe = addCustomerInfoListener((info, hasProAccess) => {
      setCustomerInfo(info);
      setIsPro(hasProAccess);
      console.log('[SubscriptionContext] Customer info updated, Pro:', hasProAccess);
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
      console.error('[SubscriptionContext] Purchase error:', error);
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
      console.error('[SubscriptionContext] Restore error:', error);
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
      console.error('[SubscriptionContext] Refresh error:', error);
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
