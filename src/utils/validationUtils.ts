/**
 * Validation utility functions
 */

/**
 * Validate Rwandan phone number format
 * Format: +2507XXXXXXXX
 */
export const isValidRwandanPhone = (phone: string): boolean => {
  const regex = /^\+2507[0-9]{8}$/;
  return regex.test(phone);
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * Validate password strength
 * Requirements: min 8 chars, uppercase, lowercase, number
 */
export const isValidPassword = (password: string): boolean => {
  if (password.length < 8) return false;
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  
  return hasUpperCase && hasLowerCase && hasNumber;
};

/**
 * Validate time format (HH:MM or HH:MM:SS)
 */
export const isValidTimeFormat = (time: string): boolean => {
  const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
  return regex.test(time);
};

/**
 * Validate booking code format
 */
export const isValidBookingCode = (code: string): boolean => {
  const regex = /^BK[A-Z0-9]+$/;
  return regex.test(code);
};

/**
 * Validate seat number
 */
export const isValidSeatNumber = (
  seatNumber: number,
  totalSeats: number
): boolean => {
  return seatNumber > 0 && seatNumber <= totalSeats;
};

/**
 * Validate price
 */
export const isValidPrice = (price: number): boolean => {
  return price > 0 && Number.isFinite(price);
};

/**
 * Validate distance
 */
export const isValidDistance = (distance: number): boolean => {
  return distance > 0 && Number.isFinite(distance);
};

/**
 * Validate duration (in minutes)
 */
export const isValidDuration = (duration: number): boolean => {
  return duration > 0 && duration < 1440 && Number.isInteger(duration); // Less than 24 hours
};

/**
 * Sanitize string input
 */
export const sanitizeString = (input: string): string => {
  return input.trim().replace(/\s+/g, ' ');
};

/**
 * Validate ID parameter
 */
export const isValidId = (id: any): boolean => {
  const numId = Number(id);
  return Number.isInteger(numId) && numId > 0;
};

/**
 * Check if value is empty
 */
export const isEmpty = (value: any): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

/**
 * Validate booking status
 */
export const isValidBookingStatus = (status: string): boolean => {
  const validStatuses = ['confirmed', 'cancelled', 'completed'];
  return validStatuses.includes(status);
};

/**
 * Validate bus status
 */
export const isValidBusStatus = (status: string): boolean => {
  const validStatuses = ['active', 'inactive', 'maintenance'];
  return validStatuses.includes(status);
};

/**
 * Validate user role
 */
export const isValidUserRole = (role: string): boolean => {
  const validRoles = ['passenger', 'admin'];
  return validRoles.includes(role);
};