/**
 * Utility functions for formatting dates and times
 */

/**
 * Format a date string into dd-MMM-YYYY format
 * @param {Date|string} date - The date to format
 * @returns {string|null} Formatted date string or null if input is invalid
 */
exports.formatDate = (date) => {
  if (!date) return null;
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    
    const day = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleString("en-US", { month: "short" });
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return null;
  }
};

/**
 * Format a date into HH:MM:SS time format
 * @param {Date|string} date - The date to format
 * @returns {string|null} Formatted time string or null if input is invalid
 */
exports.formatTime = (date) => {
  if (!date) return null;
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    
    return d.toTimeString().split(" ")[0];
  } catch (error) {
    console.error('Error formatting time:', error);
    return null;
  }
};

/**
 * Get current timestamp in ISO format
 * @returns {string} Current timestamp in ISO format
 */
exports.getCurrentTimestamp = () => {
  return new Date().toISOString();
};

/**
 * Calculate difference in days between two dates
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date (defaults to current date if not provided)
 * @returns {number} Difference in days
 */
exports.daysDifference = (date1, date2 = new Date()) => {
  try {
    const d1 = new Date(date1);
    const d2 = date2 instanceof Date ? date2 : new Date(date2);
    
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
      throw new Error('Invalid date(s) provided');
    }
    
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (error) {
    console.error('Error calculating date difference:', error);
    return null;
  }
};
