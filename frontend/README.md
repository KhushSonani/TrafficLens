# TrafficLens Frontend Dashboard

This is the React frontend for the TrafficLens system. It consumes the TrafficLens Backend APIs to display analytics, timeseries data, and sensor information from the MongoDB predictions database.

## Technologies Used
- React (Vite)
- Recharts (for data visualization)
- Lucide React (for icons)
- Vanilla CSS (Semantic styling)

## Setup and Installation

1. Ensure the TrafficLens Backend is running (port 5000) and connected to MongoDB.
2. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

## Development

Start the development server:

```bash
npm run dev
```

The application will be accessible at `http://localhost:5173`.

## Environment Configuration

By default, the dashboard connects to `http://localhost:5000/api`. You can configure this via the `VITE_API_BASE_URL` environment variable.

## Features
- **Summary Statistics:** Total predictions, active sensors, and overall accuracy.
- **Congestion Distribution:** Donut chart of global congestion ratios.
- **Timeseries Analysis:** Dynamic line chart of traffic trends, filterable by specific sensors.
- **Sensor Analytics:** Paginated table detailing specific congestion metrics and percentages per sensor.
