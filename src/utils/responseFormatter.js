/**
 * API Response Handler Class
 * 
 * Standardizes all API response structures across the application using OOP approach
 * 
 * @author FeedAQ Academy
 * @version 2.0
 */

const { randomUUID } = require('crypto');
 
/**
 * ApiResponse Class
 * Handles all API response generation with a fluent interface
 */
class ApiResponse {
  /**
   * Create an ApiResponse instance
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  constructor(req, res) {
    this.req = req;
    this.res = res;
    this.startTime = Date.now();
    this.requestId = req.requestId || req.headers['x-request-id'] || `req_${randomUUID().substring(0, 12)}`;
    this.statusCode = 200;
    this.message = '';
    this.data = null;
    this.meta = null;
    this.warnings = [];
    this.errorInfo = null;
    this.source = null;
  }

  /**
   * Set the HTTP status code
   * @param {number} code - HTTP status code
   * @returns {ApiResponse} - Returns this for chaining
   */
  status(code) {
    this.statusCode = code;
    return this;
  }

  /**
   * Set the response message
   * @param {string} msg - Response message
   * @returns {ApiResponse} - Returns this for chaining
   */
  withMessage(msg) {
    this.message = msg;
    return this;
  }

  /**
   * Set the data data
   * @param {*} data - data data
   * @returns {ApiResponse} - Returns this for chaining
   */
  withData(data) {
    this.data = data;
    return this;
  }

  /**
   * Set metadata for tracking and debugging
   * @param {Object} meta - Metadata object
   * @returns {ApiResponse} - Returns this for chaining
   */
  withMeta(meta) {
    this.meta = meta;
    return this;
  }

  /**
   * Add a warning
   * @param {string} code - Warning code
   * @param {string} message - Warning message
   * @param {string} source - Warning source
   * @param {string} severity - Warning severity (low, medium, high)
   * @returns {ApiResponse} - Returns this for chaining
   */
  addWarning(code, message, source = null, severity = 'medium') {
    this.warnings.push({
      code,
      message,
      ...(source && { source }),
      severity
    });
    return this;
  }

  /**
   * Set error information
   * @param {Error|string} error - Error object or message
   * @param {string} code - Error code
   * @param {string} source - Error source
   * @param {Object} details - Additional error details
   * @returns {ApiResponse} - Returns this for chaining
   */
  withError(error, code = null, source = null, details = null) {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = error.stack || null;
    
    this.errorInfo = {
      code: code || `ERROR_${this.statusCode}`,
      message: errorMessage,
      ...(details && { details }),
      ...(source && { source }),
      ...(errorStack && process.env.NODE_ENV === 'development' && { stack: errorStack })
    };
    
    this.source = source;
    return this;
  }

  /**
   * Generate and send success response
   */
  success() {
    const durationMs = Date.now() - this.startTime;
    
    const response = {
      status: this.statusCode,
      success: true,
      message: this.message || 'Success',
        data: this.data,
        ...(this.meta && { meta: this.meta }),
      ...(this.warnings.length > 0 && { warnings: this.warnings }),
      error: null,
      trace: {
        requestId: this.requestId,
        durationMs
      }
    };

    this.res.status(this.statusCode).json(response);
  }

  /**
   * Generate and send partial success response (206)
   * @param {Array} availableFields - List of successfully fetched fields
   * @param {Array} missingFields - List of missing/failed fields
   */
  partial(availableFields = [], missingFields = []) {
    const durationMs = Date.now() - this.startTime;
    
    const response = {
      status: 206,
      success: true,
      message: this.message || 'Partial success',
        data: this.data,
        meta: {
          partial: true,
          availableFields,
          missingFields,
          timestamp: new Date().toISOString()
        },
      warnings: this.warnings,
      error: null,
      trace: {
        requestId: this.requestId,
        durationMs
      }
    };

    this.res.status(206).json(response);
  }

  /**
   * Generate and send error response
   */
  error() {
    const durationMs = Date.now() - this.startTime;
    
    const response = {
      status: this.statusCode,
      success: false,
      message: this.message || 'An error occurred',
      data: null,
      warnings: [],
      error: this.errorInfo || {
        code: `ERROR_${this.statusCode}`,
        message: this.message || 'An error occurred',
        ...(this.source && { source: this.source })
      },
      ...(this.meta && { meta: this.meta }),
      trace: {
        requestId: this.requestId,
        durationMs
      }
    };

    this.res.status(this.statusCode).json(response);
  }

 
  /**
   * Static method to create instance (for cleaner syntax)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {ApiResponse} - New ApiResponse instance
   */
  static create(req, res) {
    return new ApiResponse(req, res);
  }
}

/**
 * Express middleware to generate request ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function requestIdMiddleware(req, res, next) {
  req.requestId = req.headers['x-request-id'] || `req_${randomUUID().substring(0, 12)}`;
  res.setHeader('X-Request-Id', req.requestId);
  next();
}

module.exports = {
  ApiResponse,
  requestIdMiddleware
};
