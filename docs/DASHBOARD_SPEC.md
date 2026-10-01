# DASHBOARD_SPEC.md

Owner: M3. Streamlit multipage app in `src/serving/dashboard/`. Reads MongoDB only (never Spark/HDFS). Build against mocks first (`src/serving/mocks/`), then real data. Every page shows an empty-state message if its collection is empty. Sidebar shows data source (mock/real) and last loaded time.

## 1. Overview
- Purpose: one-screen summary. KPIs: number of sensors, days covered, average congestion score, share of High intervals, top hotspot sensor.
- Charts: average score by hour of day (weekday vs weekend line); level distribution bar.
- Tables: top-5 hotspots.
- Filters: none.
- Queries: `traffic_summary(hourly)`, `congestion_results` (top 5), `locations` count.
- Interaction: read-only; links to other pages.

## 2. Analytics
- Purpose: hourly/peak/per-location patterns and trends.
- KPIs: peak-hour average speed, off-peak average speed.
- Charts: hourly speed/flow/occupancy profile; daily trend line; per-sensor bar (avg score).
- Filters: sensor (or All), weekday/weekend, metric selector.
- Tables: per-location table, sortable.
- Queries: `traffic_summary` by `summary_type` and `location_id`.
- Interaction: choose a sensor → charts update.

## 3. Hotspots
- Purpose: recurrent congestion at peak hours.
- KPIs: number of hotspots, highest `high_peak_share`.
- Charts: bar of top-N sensors by `high_peak_share`.
- Filters: N (5–50), min peak intervals.
- Tables: ranked hotspot table (rank, sensor, share, peak intervals, mean score). If `locations` has lat/lon, show them as columns only (no map).
- Queries: `congestion_results` sort desc, limit N.
- Interaction: N slider; click-select sensor to see its level shares.

## 4. Weather Impact
- Purpose: how weather changes congestion vs the sensor's normal for that hour-of-week.
- KPIs: mean delta for rain, mean delta for fog (if data present).
- Charts: delta by weather category (bar); delta by hour-of-week for a sensor (line); `n` shown as a caption.
- Filters: sensor (or All), weather category.
- Tables: rows with `n`, `mean_score`, `baseline_score`, `delta`.
- Queries: `impact_analysis.find({location_id, weather})`.
- Interaction: caption states "observational, not causal". First page cut if late.

## 5. Prediction
- Purpose: show precomputed next-hour predictions and model quality.
- KPIs: RF accuracy, weighted F1, persistence baseline accuracy, majority baseline accuracy.
- Charts: predicted class probabilities bar for the chosen combination; confusion matrix heatmap; per-class recall bars.
- Filters: sensor, hour_of_week (day + hour selectors), weather.
- Tables: metrics comparison RF vs baselines.
- Queries: `predictions.find_one({location_id, hour_of_week, weather})`, `model_metrics`.
- Interaction: change filters → lookup, no computation. If RF is cut, page shows K-Means metrics only and a note.
