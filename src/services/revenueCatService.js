import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ═══════════════════════════════════════════════════════════════════════════════
// REVENUECAT SERVICE - Goalwise Pro Subscription Management
// ═══════════════════════════════════════════════════════════════════════════════

// Get API key from app.json extra config
// For production: Update the key in app.json extra.revenueCatApiKey
// Test keys: start with "test_" (sandbox environment)
// Production keys: start with "appl_" (iOS) or "goog_" (Android)
const getApiKey = () => {
  return Constants.expoConfig?.extra?.revenueCatApiKey || 'test_GClyPBcnkdxiPCUwdJUxmnpDHgH';
};

// RevenueCat Configuration
const REVENUECAT_CONFIG = {
  get apiKey() {
    return getApiKey();
  },
  entitlementId: 'Goalwise Pro', // Entitlement identifier in RevenueCat dashboard
  productIds: {
    weekly: 'goalwise_pro_weekly',
    monthly: 'goalwise_pro_monthly',
  },
};

// Initialization state
let isInitialized = false;

// Check if running in Expo Go (not a native build)
const isExpoGo = Constants.appOwnership === 'expo';

/**
 * Initialize RevenueCat SDK
 * Should be called once at app startup
 * Skips initialization in Expo Go to prevent error logs
 */
export const initializeRevenueCat = async () => {
  // Skip RevenueCat in Expo Go - it doesn't work properly anyway
  if (isExpoGo) {
    return false;
  }

  if (isInitialized) {
    return true;
  }

  try {
    // Suppress all logs
    Purchases.setLogLevel(LOG_LEVEL.ERROR);

    await Purchases.configure({
      apiKey: REVENUECAT_CONFIG.apiKey,
    });

    isInitialized = true;
    return true;
  } catch (error) {
    // Silent fail
    return false;
  }
};

/**
 * Get current customer info
 * @returns {Promise<Object|null>} Customer info or null on error
 */
export const getCustomerInfo = async () => {
  if (isExpoGo) return null;
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    return null;
  }
};

/**
 * Check if user has active Pro subscription
 * @returns {Promise<boolean>} True if user has active Pro entitlement
 */
export const checkProAccess = async () => {
  if (isExpoGo) return false;
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const entitlements = customerInfo?.entitlements?.active;
    const hasProAccess = entitlements?.[REVENUECAT_CONFIG.entitlementId]?.isActive === true;
    return hasProAccess;
  } catch (error) {
    return false;
  }
};

/**
 * Get available offerings/packages
 * @returns {Promise<Object|null>} Offerings or null on error
 */
export const getOfferings = async () => {
  if (isExpoGo) return null;
  try {
    const offerings = await Purchases.getOfferings();
    if (offerings?.current) {
      return offerings;
    }
    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Get available packages from current offering
 * @returns {Promise<Array>} Array of packages
 */
export const getPackages = async () => {
  if (isExpoGo) return [];
  try {
    const offerings = await getOfferings();
    if (offerings?.current?.availablePackages) {
      return offerings.current.availablePackages;
    }
    return [];
  } catch (error) {
    return [];
  }
};

/**
 * Purchase a package
 * @param {Object} packageToPurchase - RevenueCat package object
 * @returns {Promise<Object>} Purchase result with success status and customerInfo
 */
export const purchasePackage = async (packageToPurchase) => {
  if (isExpoGo) return { success: false, error: 'Not available in Expo Go' };
  try {
    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
    const hasProAccess = customerInfo?.entitlements?.active?.[REVENUECAT_CONFIG.entitlementId]?.isActive === true;

    return {
      success: true,
      customerInfo,
      hasProAccess,
    };
  } catch (error) {
    if (error.userCancelled) {
      return {
        success: false,
        cancelled: true,
        error: null,
      };
    }

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
  if (isExpoGo) return { success: false, error: 'Not available in Expo Go' };
  try {
    const packages = await getPackages();
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
      return {
        success: false,
        error: 'Ürün bulunamadı',
      };
    }

    return await purchasePackage(packageToPurchase);
  } catch (error) {
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
  if (isExpoGo) return { success: false, error: 'Not available in Expo Go' };
  try {
    const customerInfo = await Purchases.restorePurchases();
    const hasProAccess = customerInfo?.entitlements?.active?.[REVENUECAT_CONFIG.entitlementId]?.isActive === true;

    return {
      success: true,
      customerInfo,
      hasProAccess,
    };
  } catch (error) {
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
  if (isExpoGo) return null;
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo?.managementURL || null;
  } catch (error) {
    return null;
  }
};

/**
 * Set user ID for RevenueCat (for identifying users across devices)
 * @param {string} userId - Unique user identifier
 */
export const setUserId = async (userId) => {
  if (isExpoGo) return;
  try {
    await Purchases.logIn(userId);
  } catch (error) {
    // Silent fail
  }
};

/**
 * Log out current user (for when user logs out of your app)
 */
export const logOutUser = async () => {
  if (isExpoGo) return;
  try {
    await Purchases.logOut();
  } catch (error) {
    // Silent fail
  }
};

/**
 * Add listener for customer info updates
 * @param {Function} callback - Called when customer info changes
 * @returns {Function} Unsubscribe function
 */
export const addCustomerInfoListener = (callback) => {
  if (isExpoGo) return () => {};
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
  if (isExpoGo) return null;
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
    return null;
  }
};

// Export config for reference
export const REVENUE_CAT_CONFIG = REVENUECAT_CONFIG;

// Export Expo Go detection
export const IS_EXPO_GO = isExpoGo;

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
