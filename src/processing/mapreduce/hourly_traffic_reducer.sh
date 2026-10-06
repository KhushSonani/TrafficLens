#!/bin/bash
awk -F'\t' '
{
    key = $1
    speed = $2
    if (key != prev_key && prev_key != "") {
        print prev_key "," count "," (sum / count)
        sum = 0
        count = 0
    }
    prev_key = key
    sum += speed
    count++
}
END {
    if (prev_key != "") {
        print prev_key "," count "," (sum / count)
    }
}'
