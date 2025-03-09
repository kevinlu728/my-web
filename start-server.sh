#!/bin/bash

# 检查是否有服务器进程在运行
pid=$(lsof -t -i:8000)
if [ -n "$pid" ]; then
  echo "服务器已经在运行，进程ID: $pid"
  echo "如果需要重启，请先运行: kill $pid"
  exit 1
fi

# 启动服务器
echo "启动服务器..."
node server/core/server.mjs > server.log 2>&1 &
pid=$!

# 等待服务器启动
echo "等待服务器启动..."
sleep 2

# 检查服务器是否成功启动
if ps -p $pid > /dev/null; then
  echo "服务器已成功启动，进程ID: $pid"
  echo "日志文件: server.log"
  echo "测试端点: http://127.0.0.1:8000/api/hello"
  echo "要停止服务器，请运行: kill $pid"
else
  echo "服务器启动失败，请检查日志文件: server.log"
  exit 1
fi 