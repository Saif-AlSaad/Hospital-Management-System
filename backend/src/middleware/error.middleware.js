// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Centralized Database & Application Error Handling Middleware
// Decodes PostgreSQL error codes and formats user-friendly responses
// ============================================================================

const errorHandler = (err, req, res, next) => {
  console.error(`[API ERROR] ${req.method} ${req.originalUrl}:`, err.message || err);

  // PostgreSQL Specific Error Handling
  if (err.code) {
    switch (err.code) {
      case '23505': // unique_violation
        return res.status(409).json({
          success: false,
          error: 'Unique Constraint Violation',
          message: err.detail || 'A record with this identifier or unique attribute already exists.',
          detail: err.detail,
        });

      case '23503': // foreign_key_violation
        return res.status(400).json({
          success: false,
          error: 'Referential Integrity Violation',
          message: err.detail || 'Referenced entity does not exist or cannot be removed due to dependent records.',
          detail: err.detail,
        });

      case '23514': // check_violation
        return res.status(400).json({
          success: false,
          error: 'Domain Check Constraint Violation',
          message: err.message || 'Submitted data violates validation rules (e.g. invalid date range or negative values).',
        });

      case '23502': // not_null_violation
        return res.status(400).json({
          success: false,
          error: 'Missing Required Field',
          message: `The field '${err.column}' cannot be null.`,
        });

      case 'P0001': // raise_exception from PL/pgSQL triggers or procedures
        return res.status(400).json({
          success: false,
          error: 'Business Rule Violation',
          message: err.message || 'Database business rule exception.',
        });

      case '22007': // invalid_datetime_format
      case '22008': // datetime_field_overflow
        return res.status(400).json({
          success: false,
          error: 'Invalid Date or Time Format',
          message: 'The submitted date or time values are outside permissible bounds.',
        });

      default:
        break;
    }
  }

  // Generic fallback
  return res.status(err.status || 500).json({
    success: false,
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected database or server error occurred.',
  });
};

module.exports = { errorHandler };
