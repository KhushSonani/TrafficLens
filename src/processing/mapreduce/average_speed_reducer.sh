#!/bin/bash
awk '
{
    sensor = $1
    speed = $2
    if (sensor != prev_sensor && prev_sensor != "") {
        print prev_sensor "\t" (sum / count)
        sum = 0
        count = 0
    }
    prev_sensor = sensor
    sum += speed
    count++
}
END {
    if (prev_sensor != "") {
        print prev_sensor "\t" (sum / count)
    }
}'
