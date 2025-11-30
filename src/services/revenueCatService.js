import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';

// ═══════════════════════════════════════════════════════════════════════════════
// REVENUECAT SERVICE - Goalwise Pro Subscription Management
// ═══════════════════════════════════════════════════════════════════════════════

// RevenueCat Configuration
const REVENUECAT_CONFIG = {
  apiKey: 'test_GClyPBcnkdxiPCUwdJUxmnpDHgH',
  entitlementId: 'Goalwise Pro', // Entitlement identifier in RevenueCat dashboard
  productIds: {
    weekly: 'goalwise_pro_weekly',
    monthly: 'goalwise_pro_monthly',
  },
};

// Initialization state
let isInitialized = false;

/**
 * Initialize RevenueCat SDK
 * Should be called once at app startup
 */
export const initializeRevenueCat = async () => {
  if (isInitialized) {
    console.log('[RevenueCat] Already initialized');
    return true;
  }

  try {
    // Enable debug logs in development
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    // Configure RevenueCat with API key
    await Purchases.configure({
      apiKey: REVENUECAT_CONFIG.apiKey,
    });

    isInitialized = true;
    console.log('[RevenueCat] Successfully initialized');
    return true;
  } catch (error) {
    console.error('[RevenueCat] Initialization error:', error);
    return false;
  }
};

/**
 * Get current customer info
 * @returns {Promise<Object|null>} Customer info or null on error
 */
export const getCustomerInfo = async () => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    console.error('[RevenueCat] Error getting customer info:', error);
    return null;
  }
};

/**
 * Check if user has active Pro subscription
 * @returns {Promise<boolean>} True if user has active Pro entitlement
 */
export const checkProAccess = async () => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const entitlements = customerInfo?.entitlements?.active;

    // Check for Goalwise Pro entitlement
    const hasProAccess = entitlements?.[REVENUECAT_CONFIG.entitlementId]?.isActive === true;

    console.log('[RevenueCat] Pro access:', hasProAccess);
    return hasProAccess;
  } catch (error) {
    console.error('[RevenueCat] Error checking pro access:', error);
    return false;
  }
};

/**
 * Get available offerings/packages
 * @returns {Promise<Object|null>} Offerings or null on error
 */
export const getOfferings = async () => {
  try {
    const offerings = await Purchases.getOfferings();

    if (offerings?.current) {
      console.log('[RevenueCat] Current offering:', offerings.current.identifier);
      return offerings;
    }

    console.log('[RevenueCat] No offerings available');
    return null;
  } catch (error) {
    console.error('[RevenueCat] Error getting offerings:', error);
    return null;
  }
};

/**
 * Get available packages from current offering
 * @returns {Promise<Array>} Array of packages
 */
export const getPackages = async () => {
  try {
    const offerings = await getOfferings();

    if (offerings?.current?.availablePackages) {
      return offerings.current.availablePackages;
    }

    return [];
  } catch (error) {
    console.error('[RevenueCat] Error getting packages:', error);
    return [];
  }
};

/**
 * Purchase a package
 * @param {Object} packageToPurchase - RevenueCat package object
 * @returns {Promise<Object>} Purchase result with success status and customerInfo
 */
export const purchasePackage = async (packageToPurchase) => {
  try {
    console.log('[RevenueCat] Purchasing package:', packageToPurchase.identifier);

    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);

    // Check if purchase granted Pro entitlement
    const hasProAccess = customerInfo?.entitlements?.active?.[REVENUECAT_CONFIG.entitlementId]?.isActive === true;

    console.log('[RevenueCat] Purchase successful, Pro access:', hasProAccess);

    return {
      success: true,
      customerInfo,
      hasProAccess,
    };
  } catch (error) {
    // Handle user cancellation
    if (error.userCancelled) {
      console.log('[RevenueCat] User cancelled purchase');
      return {
        success: false,
        cancelled: true,
        error: null,
      };
    }

    console.error('[RevenueCat] Purchase error:', error);
    return {
      success: false,
      cancelled: false,
      error: error.message || 'Purchase failed',
    };
  }
};

/**
 * Purchase a product by ID (weekly/monthly)
 * @param {string} productType - 'weekly' or 'monthly'
 * @returns {Promise<Object>} Purchase result
 */
export const purchaseProduct = async (productType) => {
  try {
    const packages = await getPackages();

    // Find matching package
    let packageToPurchase = null;

    for (const pkg of packages) {
      const identifier = pkg.identifier?.toLowerCase();
      const productId = pkg.product?.identifier?.toLowerCase();

      if (productType === 'weekly') {
        if (identifier?.includes('weekly') || productId?.includes('weekly') || pkg.packageType === 'WEEKLY') {
          packageToPurchase = pkg;
          break;
        }
      } else if (productType === 'monthly') {
        if (identifier?.includes('monthly') || productId?.includes('monthly') || pkg.packageType === 'MONTHLY') {
          packageToPurchase = pkg;
          break;
        }
      }
    }

    if (!packageToPurchase) {
      console.error('[RevenueCat] Package not found for:', productType);
      return {
        success: false,
        error: 'Ürün bulunamadı',
      };
    }

    return await purchasePackage(packageToPurchase);
  } catch (error) {
    console.error('[RevenueCat] Error purchasing product:', error);
    return {
      success: false,
      error: error.message || 'Purchase failed',
    };
  }
};

/**
 * Restore previous purchases
 * @returns {Promise<Object>} Restore result with success status
 */
export const restorePurchases = async () => {
  try {
    console.log('[RevenueCat] Restoring purchases...');

    const customerInfo = await Purchases.restorePurchases();
    const hasProAccess = customerInfo?.entitlements?.active?.[REVENUECAT_CONFIG.entitlementId]?.isActive === true;

    console.log('[RevenueCat] Restore complete, Pro access:', hasProAccess);

    return {
      success: true,
      customerInfo,
      hasProAccess,
    };
  } catch (error) {
    console.error('[RevenueCat] Restore error:', error);
    return {
      success: false,
      error: error.message || 'Restore failed',
    };
  }
};

/**
 * Get subscription management URL (for Customer Center)
 * @returns {Promise<string|null>} Management URL or null
 */
export const getManagementURL = async () => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo?.managementURL || null;
  } catch (error) {
    console.error('[RevenueCat] Error getting management URL:', error);
    return null;
  }
};

/**
 * Set user ID for RevenueCat (for identifying users across devices)
 * @param {string} userId - Unique user identifier
 */
export const setUserId = async (userId) => {
  try {
    await Purchases.logIn(userId);
    console.log('[RevenueCat] User ID set:', userId);
  } catch (error) {
    console.error('[RevenueCat] Error setting user ID:', error);
  }
};

/**
 * Log out current user (for when user logs out of your app)
 */
export const logOutUser = async () => {
  try {
    await Purchases.logOut();
    console.log('[RevenueCat] User logged out');
  } catch (error) {
    console.error('[RevenueCat] Error logging out:', error);
  }
};

/**
 * Add listener for customer info updates
 * @param {Function} callback - Called when customer info changes
 * @returns {Function} Unsubscribe function
 */
export const addCustomerInfoListener = (callback) => {
  const listener = Purchases.addCustomerInfoUpdateListener((customerInfo) => {
    const hasProAccess = customerInfo?.entitlements?.active?.[REVENUECAT_CONFIG.entitlementId]?.isActive === true;
    callback(customerInfo, hasProAccess);
  });

  return () => {
    listener.remove();
  };
};

/**
 * Get formatted price for a package type
 * @param {string} packageType - 'weekly' or 'monthly'
 * @returns {Promise<Object|null>} Price info or null
 */
export const getPackagePrice = async (packageType) => {
  try {
    const packages = await getPackages();

    for (const pkg of packages) {
      const identifier = pkg.identifier?.toLowerCase();
      const productId = pkg.product?.identifier?.toLowerCase();

      const isMatch = packageType === 'weekly'
        ? (identifier?.includes('weekly') || productId?.includes('weekly') || pkg.packageType === 'WEEKLY')
        : (identifier?.includes('monthly') || productId?.includes('monthly') || pkg.packageType === 'MONTHLY');

      if (isMatch) {
        return {
          price: pkg.product?.priceString || '',
          priceValue: pkg.product?.price || 0,
          currencyCode: pkg.product?.currencyCode || 'TRY',
          identifier: pkg.identifier,
        };
      }
    }

    return null;
  } catch (error) {
    console.error('[RevenueCat] Error getting package price:', error);
    return null;
  }
};

// Export config for reference
export const REVENUE_CAT_CONFIG = REVENUECAT_CONFIG;

export default {
  initialize: initializeRevenueCat,
  getCustomerInfo,
  checkProAccess,
  getOfferings,
  getPackages,
  purchasePackage,
  purchaseProduct,
  restorePurchases,
  getManagementURL,
  setUserId,
  logOutUser,
  addCustomerInfoListener,
  getPackagePrice,
  config: REVENUECAT_CONFIG,
};
