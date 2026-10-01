# PEMS04 Data Dictionary

## Source and verification

- Source: [ASTGNN PEMS04](https://github.com/guoshnBJTU/ASTGNN/tree/main/data/PEMS04)
- Download URL: `https://raw.githubusercontent.com/guoshnBJTU/ASTGNN/main/data/PEMS04/PEMS04.npz`
- Verified SHA-256: `95a3c9b720fffdb85f0330d09bfab41b0b3cad0ca86c0d7d5f3accacb4ac999a`
- Verified file size: `32956284` bytes
- Verified array: `data`, shape `(16992, 307, 3)`, dtype `float64`
- Verified total observations: `16992 * 307 = 5216544`
- Verified ranges: `flow` 0.0..919.0 (mean 211.7007794815878), `occupancy` 0.0..0.7716 (mean 0.05283676606580909), `speed` 3.0..85.2 mph (mean 63.47060711076145)
- Verified zero counts: `flow` 82,935; `occupancy` 83,044; `speed` 0
- The source directory contains an adjacency CSV, not station latitude/longitude metadata. Lat/lon is therefore **not available from this source**; TrafficLens uses sensor IDs only and makes no map assumptions.

## Long CSV schema

| Column | Meaning | Unit/status |
|---|---|---|
| `sensor_id` | PEMS04 sensor index | string, `0` through `306` |
| `ts` | local reading timestamp | 5-minute interval, ISO local time |
| `flow` | observed traffic flow | vehicles per 5 minutes; source feature index 0 |
| `occupancy` | detector occupancy | ratio; source feature index 1 |
| `speed` | observed vehicle speed | mph; source feature index 2 |

The verified array has no NaNs. Flow and occupancy contain zeros; speed has no zero values in this artifact. A zero is preserved in the raw CSV. Stage 2 validation decides how missing-sensor patterns are handled.

The source contains no timestamps. The conversion uses the project-required start assumption `2018-01-01T00:00` in `America/Los_Angeles`, at 5-minute intervals. This produces 59 days (`16992 / (24 * 12)`) ending at `2018-02-28T23:55`; the calendar start is an assumption attached by the project, not metadata encoded in the NPZ.

## Weather decision (OPEN-4)

Use NOAA ISD-Lite for one Bay Area station, San Francisco International Airport (WBAN/USAF `724940/23234`), with hourly observations covering the traffic date range. ISD-Lite provides temperature, precipitation and visibility fields; convert its visibility to nullable `visibility_km` and its UTC timestamps to `America/Los_Angeles` before joining. The station/date download and HDFS ingestion belong to D2-M1; this records the source decision without adding weather data here.