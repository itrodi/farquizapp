// src/utils/auth.js
/**
 * Authentication utility functions for FarQuiz Mini App
 */

/**
 * Parse JWT token (client-side only - don't use for verification)
 * @param {string} token - JWT token
 * @returns {object|null} - Parsed payload or null if invalid
 */
export const parseJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error parsing JWT:', error);
    return null;
  }
};

/**
 * Check if JWT token is expired
 * @param {string} token - JWT token
 * @returns {boolean} - True if expired
 */
export const isTokenExpired = (token) => {
  try {
    const payload = parseJwt(token);
    if (!payload || !payload.exp) return true;
    
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch (error) {
    return true;
  }
};

/**
 * Extract user information from QuickAuth JWT
 * @param {string} token - QuickAuth JWT token
 * @returns {object|null} - User information or null
 */
export const extractUserFromQuickAuth = (token) => {
  try {
    const payload = parseJwt(token);
    if (!payload) return null;
    
    return {
      fid: payload.sub,
      address: payload.address,
      issuedAt: payload.iat,
      expiresAt: payload.exp,
      issuer: payload.iss,
      audience: payload.aud
    };
  } catch (error) {
    console.error('Error extracting user from QuickAuth token:', error);
    return null;
  }
};

/**
 * Generate a cryptographically secure nonce
 * @param {number} length - Length of the nonce (default: 16)
 * @returns {string} - Random nonce string
 */
export const generateSecureNonce = (length = 16) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  // Use crypto.getRandomValues if available (browser)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length];
    }
  } else {
    // Fallback to Math.random (less secure)
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  
  return result;
};

/**
 * Validate SIWF message structure
 * @param {string} message - SIWF message
 * @returns {boolean} - True if valid structure
 */
export const validateSIWFMessage = (message) => {
  try {
    if (!message || typeof message !== 'string') return false;
    
    const requiredFields = [
      'wants you to sign in with your Ethereum account:',
      'URI:',
      'Version:',
      'Chain ID:',
      'Nonce:',
      'Issued At:'
    ];
    
    return requiredFields.every(field => message.includes(field));
  } catch (error) {
    return false;
  }
};

/**
 * Format user display name
 * @param {object} user - User object
 * @returns {string} - Formatted display name
 */
export const formatUserDisplayName = (user) => {
  if (!user) return 'Unknown User';
  
  if (user.display_name && user.display_name.trim()) {
    return user.display_name;
  }
  
  if (user.username && user.username.trim()) {
    return user.username;
  }
  
  if (user.fid) {
    return `User ${user.fid}`;
  }
  
  return 'Anonymous User';
};

/**
 * Get user avatar URL or placeholder
 * @param {object} user - User object
 * @returns {string|null} - Avatar URL or null for placeholder
 */
export const getUserAvatarUrl = (user) => {
  if (!user) return null;
  
  if (user.pfp_url && user.pfp_url.trim()) {
    return user.pfp_url;
  }
  
  // Return null to indicate we should show a placeholder
  return null;
};

/**
 * Get user avatar placeholder text
 * @param {object} user - User object
 * @returns {string} - Single character for avatar placeholder
 */
export const getUserAvatarPlaceholder = (user) => {
  if (!user) return '?';
  
  const displayName = formatUserDisplayName(user);
  return displayName.charAt(0).toUpperCase();
};

/**
 * Store authentication data securely
 * @param {object} authData - Authentication data
 */
export const storeAuthData = (authData) => {
  try {
    const dataWithTimestamp = {
      ...authData,
      storedAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };
    
    localStorage.setItem('farquiz_auth', JSON.stringify(dataWithTimestamp));
  } catch (error) {
    console.error('Error storing auth data:', error);
  }
};

/**
 * Retrieve authentication data
 * @returns {object|null} - Auth data or null if not found/expired
 */
export const getStoredAuthData = () => {
  try {
    const stored = localStorage.getItem('farquiz_auth');
    if (!stored) return null;
    
    const authData = JSON.parse(stored);
    
    // Check if expired
    if (authData.expiresAt && authData.expiresAt < Date.now()) {
      localStorage.removeItem('farquiz_auth');
      return null;
    }
    
    return authData;
  } catch (error) {
    console.error('Error retrieving auth data:', error);
    localStorage.removeItem('farquiz_auth');
    return null;
  }
};

/**
 * Clear stored authentication data
 */
export const clearAuthData = () => {
  try {
    localStorage.removeItem('farquiz_auth');
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};

/**
 * Check if user has valid authentication
 * @returns {boolean} - True if authenticated and not expired
 */
export const isAuthenticated = () => {
  const authData = getStoredAuthData();
  return authData !== null;
};

/**
 * Debug function to log authentication state
 */
export const debugAuthState = () => {
  console.log('=== FarQuiz Auth Debug ===');
  
  const authData = getStoredAuthData();
  console.log('Stored Auth Data:', authData);
  
  if (authData?.token) {
    const tokenPayload = parseJwt(authData.token);
    console.log('Token Payload:', tokenPayload);
    console.log('Token Expired:', isTokenExpired(authData.token));
  }
  
  console.log('Is Authenticated:', isAuthenticated());
  console.log('========================');
};