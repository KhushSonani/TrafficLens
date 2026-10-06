#!/bin/bash
# congestion_hotspot_reducer.sh
#
# Receives sorted input from mapper:
#   sensor_id<TAB>hour,avg_speed
#
# Loads reference_speeds.tsv (distributed via -files) as a lookup table.
# For each (sensor_id, hour) record:
#   congestion_score = 1 - (current_speed / reference_speed)
#   classification:  < 0.3 => LOW, < 0.6 => MEDIUM, >= 0.6 => HIGH
#
# Output (TSV):
#   hour,sensor_id,reference_speed,current_speed,congestion_score,congestion_class

awk -F'\t' '
BEGIN {
    # Load reference speeds from the distributed lookup file
    ref_file = "reference_speeds.tsv"
    while ((getline line < ref_file) > 0) {
        n = split(line, parts, "\t")
        if (n == 2) {
            ref[parts[1]] = parts[2] + 0
        }
    }
    close(ref_file)
}
{
    sensor_id = $1
    rest = $2
    # rest = "hour,avg_speed"
    n = split(rest, parts, ",")
    if (n < 2) next
    # hour may contain a space like "2012-03-01 00"; split on last comma
    avg_speed = parts[n] + 0
    hour = ""
    for (i = 1; i < n; i++) {
        if (i > 1) hour = hour ","
        hour = hour parts[i]
    }

    # Skip if no reference speed for this sensor
    if (!(sensor_id in ref)) next
    ref_speed = ref[sensor_id] + 0

    # Guard against zero reference speed
    if (ref_speed == 0) next

    score = 1 - (avg_speed / ref_speed)

    # Classify
    if (score < 0.3) {
        class = "LOW"
    } else if (score < 0.6) {
        class = "MEDIUM"
    } else {
        class = "HIGH"
    }

    printf "%s,%s,%.4f,%.4f,%.4f,%s\n", hour, sensor_id, ref_speed, avg_speed, score, class
}
'
