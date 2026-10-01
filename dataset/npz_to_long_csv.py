#!/usr/bin/env python3
"""Convert PEMS04's time x sensor x feature array to the project CSV schema."""

import argparse
import csv
from datetime import datetime, timedelta
import os
import tempfile

import numpy as np


FEATURE_NAMES = ("flow", "occupancy", "speed")
EXPECTED_SENSORS = 307
EXPECTED_FEATURES = 3
INTERVAL = timedelta(minutes=5)


def convert(input_path, output_path, start, sensor_limit=None, days=None):
    with np.load(input_path, allow_pickle=False) as archive:
        if "data" not in archive.files:
            raise ValueError(f"{input_path} does not contain a 'data' array")
        data = archive["data"]

    if data.ndim != 3 or data.shape[2] != EXPECTED_FEATURES:
        raise ValueError(f"expected (time, sensors, 3), got {data.shape}")
    if sensor_limit is not None and not 1 <= sensor_limit <= data.shape[1]:
        raise ValueError("--sensor-limit must be between 1 and the sensor count")
    if days is not None and days < 1:
        raise ValueError("--days must be positive")

    sensor_count = sensor_limit or data.shape[1]
    time_count = data.shape[0]
    if days is not None:
        time_count = min(time_count, days * 24 * 12)

    output_parent = os.path.dirname(os.path.abspath(output_path))
    os.makedirs(output_parent, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix="traffic-", suffix=".csv", dir=output_parent)
    os.close(fd)
    rows = 0
    try:
        with open(temporary, "w", newline="", encoding="utf-8") as handle:
            writer = csv.writer(handle, lineterminator="\n")
            writer.writerow(("sensor_id", "ts", *FEATURE_NAMES))
            timestamp = start
            for time_index in range(time_count):
                for sensor_index in range(sensor_count):
                    values = data[time_index, sensor_index]
                    writer.writerow(
                        (
                            str(sensor_index),
                            timestamp.isoformat(timespec="minutes"),
                            *(format(float(value), ".15g") for value in values),
                        )
                    )
                    rows += 1
                timestamp += INTERVAL
        os.replace(temporary, output_path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    print(
        f"wrote {output_path}: rows={rows}, sensors={sensor_count}, "
        f"timesteps={time_count}, start={start.isoformat(timespec='minutes')}"
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--in", dest="input_path", default="dataset/pems04.npz")
    parser.add_argument("--out", default="dataset/pems04_long.csv")
    parser.add_argument("--start", default="2018-01-01T00:00")
    parser.add_argument("--sensor-limit", type=int)
    parser.add_argument("--days", type=int)
    args = parser.parse_args()
    start = datetime.fromisoformat(args.start)
    convert(args.input_path, args.out, start, args.sensor_limit, args.days)


if __name__ == "__main__":
    main()