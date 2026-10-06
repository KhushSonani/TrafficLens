#!/bin/bash
# congestion_hotspot_mapper.sh
#
# Input: hourly_traffic output (S1-5), format:
#   YYYY-MM-DD HH,sensor_id,reading_count,avg_speed<TAB>
#   (note: S1-5 output has a trailing tab from the reducer)
#
# Emits: sensor_id<TAB>hour,avg_speed
# The reducer joins with per-sensor reference speed from S1-4.

awk -F',' 'NF>=4 {
    # Strip any trailing whitespace/tab from field 4 (avg_speed)
    gsub(/[[:space:]]/, "", $4)
    if ($4 != "" && $4+0 == $4) {
        hour = $1
        sensor_id = $2
        avg_speed = $4
        print sensor_id "\t" hour "," avg_speed
    }
}'
