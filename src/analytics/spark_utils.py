"""Shared Spark session construction for local runs and YARN submissions."""

import os

from pyspark.sql import SparkSession


TIMEZONE = "America/Los_Angeles"


def get_spark(app_name, shuffle_partitions=None):
    """Build a Spark session with the project-wide timezone and shuffle setting."""
    partitions = shuffle_partitions or os.environ.get("SPARK_SHUFFLE_PARTITIONS", "200")
    builder = SparkSession.builder.appName(app_name)
    master = os.environ.get("SPARK_MASTER")
    if master:
        builder = builder.master(master)
    return (
        builder.config("spark.sql.session.timeZone", TIMEZONE)
        .config("spark.sql.shuffle.partitions", str(partitions))
        .getOrCreate()
    )