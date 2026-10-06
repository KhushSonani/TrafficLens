/**
 * prediction.controller.js
 *
 * Handles GET /api/predictions
 *
 * Query parameters:
 *   sensor_id   - integer; filter by sensor
 *   start_time  - ISO date; timestamp >= start_time
 *   end_time    - ISO date; timestamp <= end_time
 *   limit       - positive integer, max 1000, default 100
 *   offset      - non-negative integer, default 0
 *
 * Response shape:
 *   {
 *     count  : number,   // records returned in this response
 *     total  : number,   // total matching records in DB
 *     limit  : number,
 *     offset : number,
 *     data   : [ { timestamp, sensor_id, actual_congestion, predicted_congestion,
 *                  probability_high, probability_low, probability_medium } ]
 *   }
 */

const Prediction = require('../models/Prediction');

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Parse and validate the ?limit query parameter.
 * Returns { value } or { error }
 */
function parseLimit(raw) {
  if (raw === undefined || raw === null || raw === '') {
    return { value: DEFAULT_LIMIT };
  }
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    return { error: `limit must be a positive integer; received "${raw}"` };
  }
  if (n > MAX_LIMIT) {
    return {
      error: `limit exceeds maximum allowed value of ${MAX_LIMIT}; received ${n}`,
    };
  }
  return { value: n };
}

/**
 * Parse and validate the ?offset query parameter.
 * Returns { value } or { error }
 */
function parseOffset(raw) {
  if (raw === undefined || raw === null || raw === '') {
    return { value: 0 };
  }
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) {
    return { error: `offset must be a non-negative integer; received "${raw}"` };
  }
  return { value: n };
}

/**
 * Parse and validate a date/time query parameter.
 * Returns { value: Date } or { error }
 */
function parseDate(raw, paramName) {
  if (!raw) return { value: null };
  const d = new Date(raw);
  if (isNaN(d.getTime())) {
    return { error: `${paramName} must be a valid ISO 8601 date/time; received "${raw}"` };
  }
  return { value: d };
}

/**
 * Parse and validate the ?sensor_id query parameter.
 * Returns { value: Number } or { error }
 */
function parseSensorId(raw) {
  if (!raw) return { value: null };
  const n = Number(raw);
  if (!Number.isInteger(n) || isNaN(n)) {
    return { error: `sensor_id must be an integer; received "${raw}"` };
  }
  return { value: n };
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

/**
 * GET /api/predictions
 *
 * Queries MongoDB directly — does NOT load the entire collection into memory.
 * Applies all filters as MongoDB query predicates and uses .skip()/.limit()
 * for pagination. Results are sorted by timestamp ascending.
 */
const getPredictions = async (req, res) => {
  try {
    // --- Parse and validate query parameters ---
    const validationErrors = [];

    const limitResult = parseLimit(req.query.limit);
    if (limitResult.error) validationErrors.push(limitResult.error);

    const offsetResult = parseOffset(req.query.offset);
    if (offsetResult.error) validationErrors.push(offsetResult.error);

    const sensorResult = parseSensorId(req.query.sensor_id);
    if (sensorResult.error) validationErrors.push(sensorResult.error);

    const startResult = parseDate(req.query.start_time, 'start_time');
    if (startResult.error) validationErrors.push(startResult.error);

    const endResult = parseDate(req.query.end_time, 'end_time');
    if (endResult.error) validationErrors.push(endResult.error);

    // Cross-parameter validation: start_time must not exceed end_time
    if (
      !startResult.error &&
      !endResult.error &&
      startResult.value &&
      endResult.value &&
      startResult.value > endResult.value
    ) {
      validationErrors.push(
        `start_time must not be after end_time; received start_time="${req.query.start_time}" end_time="${req.query.end_time}"`
      );
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: validationErrors,
      });
    }

    // --- Build MongoDB filter ---
    const filter = {};

    if (sensorResult.value !== null) {
      filter.sensor_id = sensorResult.value;
    }

    if (startResult.value || endResult.value) {
      filter.timestamp = {};
      if (startResult.value) filter.timestamp.$gte = startResult.value;
      if (endResult.value) filter.timestamp.$lte = endResult.value;
    }

    const limit = limitResult.value;
    const offset = offsetResult.value;

    // --- Execute queries against MongoDB ---
    // Use Promise.all to run count and data fetch in parallel
    const [total, data] = await Promise.all([
      Prediction.countDocuments(filter),
      Prediction.find(filter)
        .sort({ timestamp: 1 })
        .skip(offset)
        .limit(limit)
        .select('-_id timestamp sensor_id actual_congestion predicted_congestion probability_high probability_low probability_medium')
        .lean(), // Return plain JS objects, not Mongoose documents
    ]);

    return res.status(200).json({
      count: data.length,
      total,
      limit,
      offset,
      data,
    });
  } catch (err) {
    console.error('[prediction.controller] Database error:', err.message);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while querying the predictions database.',
    });
  }
};

module.exports = { getPredictions };
