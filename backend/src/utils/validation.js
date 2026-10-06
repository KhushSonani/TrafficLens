/**
 * validation.js
 * Shared validation helpers for parsing query parameters.
 */

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;

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

function parseDate(raw, paramName) {
  if (!raw) return { value: null };
  const d = new Date(raw);
  if (isNaN(d.getTime())) {
    return { error: `${paramName} must be a valid ISO 8601 date/time; received "${raw}"` };
  }
  return { value: d };
}

function parseSensorId(raw) {
  if (!raw) return { value: null };
  const n = Number(raw);
  if (!Number.isInteger(n) || isNaN(n)) {
    return { error: `sensor_id must be an integer; received "${raw}"` };
  }
  return { value: n };
}

module.exports = {
  parseLimit,
  parseOffset,
  parseDate,
  parseSensorId
};
