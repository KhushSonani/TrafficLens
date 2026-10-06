# TrafficLens Backend Analytics API

This document describes the analytics endpoints provided by the TrafficLens backend, designed to support the React dashboard. These APIs utilize MongoDB aggregation pipelines directly against the `predictions` collection (Student 2 ML output).

All endpoints are prefixed with `/api/analytics`.

---

## 1. Summary

**Endpoint:** `GET /api/analytics/summary`

**Purpose:** Returns global summary statistics from the predictions database.

**Query Parameters:** None

**Response Structure:**
```json
{
  "total_predictions": 118197,
  "total_sensors": 207,
  "congestion_distribution": {
    "LOW": 94174,
    "MEDIUM": 8548,
    "HIGH": 15475
  },
  "prediction_accuracy": 0.9901
}
```

**Implementation Details:**
- **Aggregation Logic:** Uses a single MongoDB aggregation pipeline with `$group` on `null` to calculate sums and unique elements (`$addToSet`). 
- **Fields Used:** `sensor_id`, `actual_congestion`, `predicted_congestion`

---

## 2. Congestion Distribution

**Endpoint:** `GET /api/analytics/congestion-distribution`

**Purpose:** Returns the distribution of `predicted_congestion` classes across the entire dataset.

**Query Parameters:** None

**Response Structure:**
```json
{
  "data": [
    {
      "class": "LOW",
      "count": 94174,
      "percentage": 79.67
    },
    {
      "class": "MEDIUM",
      "count": 8548,
      "percentage": 7.23
    },
    {
      "class": "HIGH",
      "count": 15475,
      "percentage": 13.09
    }
  ]
}
```

**Implementation Details:**
- **Aggregation Logic:** Groups by `$predicted_congestion` and counts occurrences. Converts counts to percentages based on the total collection document count.
- **Fields Used:** `predicted_congestion`

---

## 3. Sensor Analytics

**Endpoint:** `GET /api/analytics/sensors`

**Purpose:** Returns aggregated statistics on a per-sensor basis.

**Query Parameters:**
- `limit` (optional): Number of records to return. Default: 100, Max: 1000.
- `offset` (optional): Number of records to skip. Default: 0.

**Response Structure:**
```json
{
  "count": 100,
  "total": 207,
  "limit": 100,
  "offset": 0,
  "data": [
    {
      "sensor_id": 716328,
      "total_predictions": 571,
      "low_count": 482,
      "medium_count": 39,
      "high_count": 50,
      "high_congestion_percentage": 8.75
    }
  ]
}
```

**Implementation Details:**
- **Aggregation Logic:** Groups by `$sensor_id` and counts occurrences of each congestion level conditionally.
- **Pagination:** Uses `$skip` and `$limit` within the aggregation pipeline, supported by a parallel `distinct` count query.
- **Fields Used:** `sensor_id`, `predicted_congestion`

---

## 4. Timeseries Analytics

**Endpoint:** `GET /api/analytics/timeseries`

**Purpose:** Returns prediction counts grouped into 5-minute time buckets based on data timestamps.

**Query Parameters:**
- `start_time` (optional): ISO 8601 string. Filter records >= `start_time`.
- `end_time` (optional): ISO 8601 string. Filter records <= `end_time`.
- `sensor_id` (optional): Integer. Filter by a specific sensor.
- `limit` (optional): Number of records to return. Default: 100, Max: 1000.
- `offset` (optional): Number of records to skip. Default: 0.

**Response Structure:**
```json
{
  "count": 5,
  "total": 571,
  "limit": 5,
  "offset": 0,
  "data": [
    {
      "timestamp": "2012-06-03T23:30:00.000Z",
      "total_predictions": 207,
      "low_count": 206,
      "medium_count": 0,
      "high_count": 1,
      "high_congestion_percentage": 0.48
    }
  ]
}
```

**Implementation Details:**
- **Aggregation Logic:** Matches documents against provided filters, then groups by `$timestamp` (which natively acts as a 5-minute bucket for the METR-LA dataset).
- **Pagination / Filtering:** Applies `$match` before grouping. `$skip` and `$limit` are applied post-sort.
- **Fields Used:** `timestamp`, `sensor_id`, `predicted_congestion`

---

## Error Handling

Invalid query parameters yield an HTTP `400 Bad Request` containing an `error` array with specific details. Unhandled server or database exceptions return an HTTP `500 Internal Server Error` without exposing stack traces.
