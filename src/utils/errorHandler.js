const logger = require('../config/winston.config');

/**
 * Handle different types of errors and send appropriate response
 * @param {Object} res - Express response object
 * @param {Error} error - Error object
 */
exports.handleError = (res, error) => {
    logger.error(`Error: ${error.message}`, { 
        stack: error.stack,
        name: error.name
    });

    // Handle Sequelize specific errors
    if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
            message: 'Validation error',
            errors: error.errors.map(err => ({
                field: err.path,
                message: err.message
            }))
        });
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
            message: 'Resource already exists',
            errors: error.errors.map(err => ({
                field: err.path,
                message: err.message
            }))
        });
    }

    if (error.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({
            message: 'Invalid reference',
            error: 'One or more referenced resources do not exist'
        });
    }

    // Handle custom errors
    if (error.status) {
        return res.status(error.status).json({
            message: error.message
        });
    }

    // Default error response
    return res.status(500).json({
        message: 'Internal server error'
    });
};
