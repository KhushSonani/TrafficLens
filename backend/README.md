# TrafficLens Backend API (MERN)

This directory contains the Express/Node.js backend for the TrafficLens project (Student 3 deliverable).

## Stack

- **Node.js** — runtime
- **Express.js** — HTTP API framework
- **MongoDB** — prediction data store
- **Mongoose** — ODM / schema validation

---

## Prerequisites

- Node.js v14+
- npm
- MongoDB running locally (`mongodb://localhost:27017`) or via Docker

---

## Installation

From the `backend` directory, install dependencies:

```bash
cd backend
npm install
```

---

## Environment Setup

Copy the example configuration and edit as needed:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | Express server port |
| `MONGODB_URI` | `mongodb://localhost:27017/trafficlens` | MongoDB connection string |
| `PREDICTIONS_CSV_PATH` | `output/predictions.csv` | Path to Student 2 CSV output (relative to project root) |

---

## Data Ingestion (Task 2)

Populate the MongoDB `predictions` collection from the Student 2 ML output:

```bash
npm run import-predictions
```

The script:
1. Connects to MongoDB
2. Reads `output/predictions.csv`
3. Validates every field (timestamp, sensor_id, congestion classes, probabilities, probability sum)
4. Bulk-upserts records in batches of 5,000 using `bulkWrite()`
5. Reports valid / invalid / upserted / updated counts
6. Verifies the MongoDB collection count matches valid input rows

Running the script multiple times is safe — upsert logic prevents duplicate records.

---

## Running the Server

Start the Express API:

```bash
npm run dev       # development (nodemon)
npm start         # production
```

---

## API Endpoints

### Health Check

```
GET /api/health
```

Response:
```json
{
  "status": "ok",
  "message": "TrafficLens Backend is running.",
  "database": "connected"
}
```

---

### Analytics (Task 3)

The following analytics endpoints are built to support the React Dashboard. Detailed documentation is in [`docs/backend-analytics-api.md`](../docs/backend-analytics-api.md).

- `GET /api/analytics/summary` — Global statistics, accuracy, total predictions, total sensors
- `GET /api/analytics/congestion-distribution` — LOW/MEDIUM/HIGH percentage distribution
- `GET /api/analytics/sensors` — Aggregated congestion statistics per sensor
- `GET /api/analytics/timeseries` — Timeseries aggregation of congestion data, grouped in 5-minute intervals

---

### Predictions

```
GET /api/predictions
```

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `sensor_id` | integer | Filter by sensor ID |
| `start_time` | ISO 8601 date | `timestamp >= start_time` |
| `end_time` | ISO 8601 date | `timestamp <= end_time` |
| `limit` | integer (1–1000, default 100) | Page size |
| `offset` | integer (≥ 0, default 0) | Page offset |

**Example requests:**

```bash
# All predictions (first page)
curl http://localhost:5000/api/predictions

# Filter by sensor
curl "http://localhost:5000/api/predictions?sensor_id=716942"

# Time range
curl "http://localhost:5000/api/predictions?start_time=2012-06-04T05:00:00Z&end_time=2012-06-04T06:00:00Z"

# Combined filter with pagination
curl "http://localhost:5000/api/predictions?sensor_id=716942&start_time=2012-06-04T05:00:00Z&limit=50&offset=0"
```

**Response:**
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

**Error responses:**

| Status | Cause |
|---|---|
| `400` | Invalid query parameter (bad sensor_id, invalid date, start > end, limit > 1000) |
| `500` | Database query failure or unexpected server error |

---

## Directory Structure

```
backend/
├── .env.example                  # Environment variable template
├── README.md
├── package.json
├── scripts/
│   └── importPredictions.js      # CSV → MongoDB ingestion script
└── src/
    ├── app.js                    # Express app setup and route registration
    ├── server.js                 # Entry point — DB connect + server start
    ├── config/
    │   └── db.js                 # Mongoose connection helper
    ├── controllers/
    │   ├── health.controller.js  # GET /api/health
    │   └── prediction.controller.js  # GET /api/predictions
    ├── models/
    │   └── Prediction.js         # Mongoose schema + indexes
    └── routes/
        ├── health.routes.js
        └── prediction.routes.js
```

---

## MongoDB Indexes

| Index | Fields | Type | Purpose |
|---|---|---|---|
| 1 | `sensor_id` + `timestamp` | Unique compound | Prevent duplicate records; upsert filter key |
| 2 | `timestamp` | Single-field | Optimise `start_time` / `end_time` range queries |

For full API documentation see [`docs/backend-predictions-api.md`](../docs/backend-predictions-api.md).
