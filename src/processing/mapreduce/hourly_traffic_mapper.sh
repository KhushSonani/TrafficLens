#!/bin/bash
awk -F',' '$1 != "timestamp" && NF==3 && $3 != "" {
    hour = substr($1, 1, 13)
    print hour "," $2 "\t" $3
}'
