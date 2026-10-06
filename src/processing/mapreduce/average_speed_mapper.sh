#!/bin/bash
awk -F',' '$1 != "timestamp" && NF==3 && $3 != "" {print $2 "\t" $3}'
