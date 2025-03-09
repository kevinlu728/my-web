#!/bin/bash

# 检查是否有服务器进程在运行
pid=$(lsof -t -i:8000)
if [ -z "$pid" ]; then
  echo "没有服务器进程在运行"
  exit 0
fi

# 停止服务器
echo "停止服务器进程 $pid..."
kill $pid

# 等待服务器停止
echo "等待服务器停止..."
sleep 2

# 检查服务器是否已停止
if ps -p $pid > /dev/null; then
  echo "服务器没有正常停止，尝试强制停止..."
  kill -9 $pid
  sleep 1
  
  if ps -p $pid > /dev/null; then
    echo "无法停止服务器进程 $pid"
    exit 1
  else
    echo "服务器已强制停止"
  fi
else
  echo "服务器已正常停止"
fi 