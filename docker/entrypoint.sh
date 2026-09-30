#!/bin/bash

service ssh start

if [ "$ROLE" = "master" ]; then
    echo "Checking if NameNode needs formatting..."
    if [ -z "$(ls -A /hadoop/dfs/name)" ]; then
        echo "Formatting NameNode..."
        $HADOOP_HOME/bin/hdfs namenode -format -force
    fi
    
    echo "Starting NameNode..."
    $HADOOP_HOME/bin/hdfs --daemon start namenode
    
    echo "Starting ResourceManager..."
    $HADOOP_HOME/bin/yarn --daemon start resourcemanager
    
    echo "Waiting for NameNode to exit safemode..."
    $HADOOP_HOME/bin/hdfs dfsadmin -safemode wait
    
    echo "Creating HDFS directories..."
    $HADOOP_HOME/bin/hdfs dfs -mkdir -p /trafficlens/raw
    $HADOOP_HOME/bin/hdfs dfs -mkdir -p /trafficlens/quarantine
    $HADOOP_HOME/bin/hdfs dfs -mkdir -p /trafficlens/clean
    $HADOOP_HOME/bin/hdfs dfs -mkdir -p /trafficlens/curated
    $HADOOP_HOME/bin/hdfs dfs -mkdir -p /trafficlens/analytics
    $HADOOP_HOME/bin/hdfs dfs -mkdir -p /trafficlens/ml
    $HADOOP_HOME/bin/hdfs dfs -mkdir -p /trafficlens/export
    $HADOOP_HOME/bin/hdfs dfs -mkdir -p /spark-logs
    
    echo "Starting Spark History Server..."
    $SPARK_HOME/sbin/start-history-server.sh
    
    echo "Master started."
    tail -f /opt/hadoop/logs/* /opt/spark/logs/* /dev/null
    
elif [ "$ROLE" = "worker" ]; then
    echo "Starting DataNode..."
    $HADOOP_HOME/bin/hdfs --daemon start datanode
    
    echo "Starting NodeManager..."
    $HADOOP_HOME/bin/yarn --daemon start nodemanager
    
    echo "Worker started."
    tail -f /opt/hadoop/logs/* /opt/spark/logs/* /dev/null
    
else
    echo "Unknown ROLE: $ROLE"
    exit 1
fi
