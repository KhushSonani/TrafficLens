#!/usr/bin/env python3
"""Download real hourly observations for NOAA station 724940-23234."""

import argparse
import csv
import io
import json
import urllib.request
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

STATION = "72494023234"
SOURCE_URL = "https://www.ncei.noaa.gov/data/global-hourly/access/{year}/{station}.csv"
LOCAL_ZONE = ZoneInfo("America/Los_Angeles")


def parse_measurement(value, scale=1.0):
    if not value or value.split(",", 1)[0].endswith("9999"):
        return None
    try:
        return int(value.split(",", 1)[0]) / scale
    except (TypeError, ValueError):
        return None


def precipitation_mm(value):
    if not value:
        return None
    for group in value.split():
        fields = group.split(",")
        if len(fields) >= 2 and fields[0] in {"01", "02", "03", "04", "06"}:
            try:
                return int(fields[1]) / 10.0
            except ValueError:
                return None
    return None


def download_year(year):
    url = SOURCE_URL.format(year=year, station=STATION)
    with urllib.request.urlopen(url, timeout=60) as response:
        return response.read().decode("utf-8")


def collect_rows(start, end):
    rows_by_hour = {}
    for year in range(start.year, end.year + 1):
        reader = csv.DictReader(io.StringIO(download_year(year)))
        for raw in reader:
            observed = datetime.fromisoformat(raw["DATE"].replace("Z", "+00:00"))
            local = observed.astimezone(LOCAL_ZONE).replace(tzinfo=None)
            if not (start <= local.date() <= end):
                continue
            hour = local.replace(minute=0, second=0, microsecond=0)
            rows_by_hour[hour] = {
                "hour_ts": hour.strftime("%Y-%m-%dT%H:%M"),
                "temp_c": parse_measurement(raw.get("TMP"), 10),
                "precip_mm": precipitation_mm(raw.get("AA1")),
                "visibility_km": parse_measurement(raw.get("VIS"), 1000),
            }
    return [rows_by_hour[hour] for hour in sorted(rows_by_hour)]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", default="2018-01-01", help="First local date, inclusive")
    parser.add_argument("--end", default="2018-02-28", help="Last local date, inclusive")
    parser.add_argument("--output", default="dataset/weather_hourly.csv")
    args = parser.parse_args()
    start = date.fromisoformat(args.start)
    end = date.fromisoformat(args.end)
    if end < start:
        raise SystemExit("--end must not precede --start")

    rows = collect_rows(start, end)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=["hour_ts", "temp_c", "precip_mm", "visibility_km"])
        writer.writeheader()
        writer.writerows(rows)
    print(json.dumps({"source": f"NOAA Global Hourly {STATION}", "rows": len(rows), "output": str(output)}))


if __name__ == "__main__":
    main()