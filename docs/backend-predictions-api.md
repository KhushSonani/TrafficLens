# TrafficLens — Backend Predictions API Documentation

**Project:** TrafficLens  
**Branch:** `backend-development`  
**Student:** Student 3 (Smit79)  
**Task:** Task 2 — MongoDB Prediction Ingestion and REST API

---

## 1. Purpose

Task 2 implements the data pipeline layer that bridges the Student 2 ML output
and the future React dashboard:

```
Student 2 ML output
  output/predictions.csv
        │
        ▼
  Node.js ingestion script
  (backend/scripts/importPredictions.js)
        │
        ▼
  MongoDB (trafficlens database, predictions collection)
        │
        ▼
  Express REST API
  GET /api/predictions
        │
        ▼
  React Dashboard (Task 3 — not yet started)
```

---

## 2. Architecture

The backend follows a layered MVC-style structure:

```
backend/
├── scripts/
│   └── importPredictions.js       ← CSV → MongoDB ingestion
└── src/
    ├── app.js                     ← Express setup + route mounting
    ├── server.js                  ← Entry point
    ├── config/
    │   └── db.js                  ← Mongoose connection
    ├── controllers/
    │   ├── health.controller.js   ← GET /api/health
    │   └── prediction.controller.js ← GET /api/predictions
    ├── models/
    │   └── Prediction.js          ← Schema + indexes
    └── routes/
        ├── health.routes.js
        └── prediction.routes.js
```

---

## 3. MongoDB Database

| Property | Value |
|---|---|
| Database name | `trafficlens` |
| Default URI | `mongodb://localhost:27017/trafficlens` |
| Connection env var | `MONGODB_URI` |
| Credentials | Never hard-coded; loaded from `.env` |

---

## 4. Collection

| Property | Value |
|---|---|
| Collection name | `predictions` (Mongoose default from model name `Prediction`) |
| Source | `output/predictions.csv` (Student 2 ML pipeline output) |

---

## 5. Prediction Schema

Each document in the `predictions` collection represents one prediction record:

| Field | BSON Type | Required | Constraints |
|---|---|---|---|
| `timestamp` | Date | Yes | Valid date |
| `sensor_id` | Number (int) | Yes | Valid integer |
| `actual_congestion` | String | Yes | `LOW`, `MEDIUM`, or `HIGH` |
| `predicted_congestion` | String | Yes | `LOW`, `MEDIUM`, or `HIGH` |
| `probability_high` | Number | Yes | 0 ≤ value ≤ 1 |
| `probability_low` | Number | Yes | 0 ≤ value ≤ 1 |
| `probability_medium` | Number | Yes | 0 ≤ value ≤ 1 |

> The Mongoose `__v` version key is disabled (`versionKey: false`) to keep API responses clean.

---

## 6. Indexes

| # | Index | Type | Purpose |
|---|---|---|---|
| 1 | `{ sensor_id: 1, timestamp: 1 }` | Unique compound | One document per (sensor, time); upsert filter |
| 2 | `{ timestamp: 1 }` | Single-field | Efficient `start_time` / `end_time` range queries |

**Index 1 justification:** A prediction is uniquely identified by the combination
of sensor and timestamp. This index prevents duplicate records during ingestion
and is used as the filter key for the `bulkWrite` upsert operation.

**Index 2 justification:** The API supports `start_time` / `end_time` filtering
on the `timestamp` field. Without this index, every time-range query would
require a full collection scan across 118,197+ documents.

---

## 7. CSV Ingestion

### Source file

| Property | Value |
|---|---|
| Default path | `../output/predictions.csv` (relative to backend/) |
| Environment variable | `PREDICTIONS_CSV_PATH` |
| CSV rows (header + data) | 118,198 lines |
| Data records | 118,197 |
| Columns | `timestamp`, `sensor_id`, `actual_congestion`, `predicted_congestion`, `probability_high`, `probability_low`, `probability_medium` |

### Running the ingestion

```bash
cd backend
npm run import-predictions
```

### Ingestion strategy

The script uses Mongoose `bulkWrite()` in batches of **5,000 documents** with `upsert: true`.

This means:
- Records not yet in the database are **inserted**.
- Records already present (same `sensor_id` + `timestamp`) are **updated**.
- The script is **idempotent** — safe to run multiple times.
- Memory usage is bounded by the batch size, not the full dataset.

---

## 8. Validation

Each CSV row is validated before ingestion. Invalid rows are **skipped and reported** — they are never silently discarded.

### Per-field validation

| Field | Validation rules |
|---|---|
| `timestamp` | Must be present; must parse to a valid JavaScript `Date` |
| `sensor_id` | Must be present; must be a valid integer |
| `actual_congestion` | Must be present; must be `LOW`, `MEDIUM`, or `HIGH` |
| `predicted_congestion` | Must be present; must be `LOW`, `MEDIUM`, or `HIGH` |
| `probability_high` | Must be present; must be numeric; must satisfy 0 ≤ value ≤ 1 |
| `probability_low` | Must be present; must be numeric; must satisfy 0 ≤ value ≤ 1 |
| `probability_medium` | Must be present; must be numeric; must satisfy 0 ≤ value ≤ 1 |

### Cross-field validation

| Rule | Tolerance |
|---|---|
| `probability_high + probability_low + probability_medium ≈ 1.0` | ±0.02 (floating-point tolerance) |

### Reporting

The script outputs:
- Total rows parsed from CSV
- Valid records count
- Invalid records count
- For each invalid record (up to 20): row number and reason(s)
- A summary of error categories if more than 50 malformed records exist

---

## 9. API Endpoint

```
GET /api/predictions
```

Base URL: `http://localhost:5000`

Full URL: `http://localhost:5000/api/predictions`

---

## 10. Query Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `sensor_id` | integer | No | — | Filter records to this sensor ID |
| `start_time` | ISO 8601 date/time | No | — | Return records where `timestamp >= start_time` |
| `end_time` | ISO 8601 date/time | No | — | Return records where `timestamp <= end_time` |
| `limit` | integer (1–1000) | No | 100 | Maximum records to return |
| `offset` | integer (≥ 0) | No | 0 | Number of records to skip |

### Validation rules

| Parameter | Invalid example | Response |
|---|---|---|
| `sensor_id=abc` | Non-integer | HTTP 400 |
| `start_time=hello` | Non-parseable date | HTTP 400 |
| `end_time=hello` | Non-parseable date | HTTP 400 |
| `start_time > end_time` | Reversed range | HTTP 400 |
| `limit=5000` | Exceeds maximum 1000 | HTTP 400 |
| `limit=-1` | Non-positive | HTTP 400 |
| `offset=-5` | Negative | HTTP 400 |

---

## 11. Pagination

- **Default limit:** 100 records per request
- **Maximum limit:** 1,000 records per request
- **Default offset:** 0

If `limit=5000` is requested, the API responds with HTTP 400 rather than silently capping the value.

Results are always sorted by `timestamp` ascending before pagination is applied.

---

## 12. Response Format

### Success (HTTP 200)

```json
{
  "count": 100,
  "total": 118197,
  "limit": 100,
  "offset": 0,
  "data": [
    {
      "timestamp": "2012-06-04T05:00:00.000Z",
      "sensor_id": 716942,
      "actual_congestion": "LOW",
      "predicted_congestion": "LOW",
      "probability_high": 0.0,
      "probability_low": 1.0,
      "probability_medium": 0.0
    }
  ]
}
```

| Field | Description |
|---|---|
| `count` | Number of records returned in this response |
| `total` | Total matching records in the database for these filters |
| `limit` | Applied limit |
| `offset` | Applied offset |
| `data` | Array of prediction records |

> MongoDB `_id` is excluded from all responses.

---

## 13. Error Responses

### HTTP 400 — Invalid query parameters

```json
{
  "error": "Invalid query parameters",
  "details": [
    "sensor_id must be an integer; received \"abc\"",
    "limit exceeds maximum allowed value of 1000; received 5000"
  ]
}
```

### HTTP 500 — Server / database error

```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred while querying the predictions database."
}
```

> Stack traces and internal details are never exposed to clients.

---

## 14. Example Requests

```bash
# Default page
curl http://localhost:5000/api/predictions

# Filter by sensor
curl "http://localhost:5000/api/predictions?sensor_id=716942"

# Filter by start time
curl "http://localhost:5000/api/predictions?start_time=2012-06-04T05:00:00Z"

# Filter by end time
curl "http://localhost:5000/api/predictions?end_time=2012-06-04T06:00:00Z"

# Combined sensor + time range
curl "http://localhost:5000/api/predictions?sensor_id=716942&start_time=2012-06-04T05:00:00Z&end_time=2012-06-04T06:00:00Z"

# Pagination
curl "http://localhost:5000/api/predictions?limit=50&offset=100"

# Invalid sensor — expects HTTP 400
curl "http://localhost:5000/api/predictions?sensor_id=abc"

# Reversed time range — expects HTTP 400
curl "http://localhost:5000/api/predictions?start_time=2012-06-05T00:00:00Z&end_time=2012-06-04T00:00:00Z"

# Limit exceeds maximum — expects HTTP 400
curl "http://localhost:5000/api/predictions?limit=5000"
```

---

## 15. Example Responses

### GET /api/predictions (default)

```json
{
  "count": 100,
  "total": 118197,
  "limit": 100,
  "offset": 0,
  "data": [
    {
      "timestamp": "2012-06-04T05:00:00.000Z",
      "sensor_id": 716942,
      "actual_congestion": "LOW",
      "predicted_congestion": "LOW",
      "probability_high": 0.0,
      "probability_low": 1.0,
      "probability_medium": 0.0
    }
  ]
}
```

### GET /api/predictions?sensor_id=abc (invalid)

```json
{
  "error": "Invalid query parameters",
  "details": [
    "sensor_id must be an integer; received \"abc\""
  ]
}
```

### GET /api/predictions?start_time=hello (invalid)

```json
{
  "error": "Invalid query parameters",
  "details": [
    "start_time must be a valid ISO 8601 date/time; received \"hello\""
  ]
}
```

---

## 16. Actual Validation Results

### MongoDB availability

**MongoDB was NOT installed or running** on the development machine during Task 2 implementation.

- `mongod` binary: not found in PATH
- MongoDB service: not registered
- Port 27017: not listening

As a result, the following could NOT be performed and are NOT reported:

- ❌ Actual CSV ingestion into MongoDB
- ❌ MongoDB collection document count
- ❌ Index verification via MongoDB shell
- ❌ Duplicate key uniqueness test (live DB)
- ❌ Live API endpoint responses

The following were performed and validated:

- ✅ CSV file exists: `output/predictions.csv`
- ✅ CSV line count: **118,198 lines** (1 header + **118,197 data rows**)
- ✅ CSV columns match expected schema: `timestamp`, `sensor_id`, `actual_congestion`, `predicted_congestion`, `probability_high`, `probability_low`, `probability_medium`
- ✅ Sample data verified (first 5 rows manually reviewed)
- ✅ Validation logic implemented and reviewed
- ✅ bulkWrite ingestion code implemented
- ✅ Route registration verified (`/api/predictions` mounted)
- ✅ Express server startup logic unchanged from Task 1
- ✅ `.gitignore` already excludes `.env` and `node_modules`

Database-backed test results (ingestion count, API responses, index verification) will be updated once MongoDB is available.

---

## 17. MongoDB Environment Requirements

| Requirement | Value |
|---|---|
| MongoDB version | 4.x or higher recommended |
| Connection string | Set via `MONGODB_URI` environment variable |
| Default URI | `mongodb://localhost:27017/trafficlens` |
| Authentication | Not required for local development; configure via URI if needed |
| Minimum RAM | ~512 MB recommended for 118k document collection |

### Setting up MongoDB locally

**Option A — MongoDB Community Server (direct install):**

```bash
# macOS (Homebrew)
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Ubuntu/Debian
sudo apt install mongodb
sudo systemctl start mongodb
```

**Option B — Docker:**

```bash
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  mongo:6
```

After MongoDB is running:

```bash
cd backend
cp .env.example .env
npm install
npm run import-predictions   # ingest predictions.csv → MongoDB
npm run dev                  # start the API server
```
