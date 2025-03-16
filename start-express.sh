#!/bin/bash

# Express服务器启动脚本
# 功能：启动Express服务器（端口8000）
# 作者：陆凯
# 修改日期：2024-03-16

# 添加颜色支持
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
  echo -e "${BLUE}[信息]${NC} $1"
}

print_success() {
  echo -e "${GREEN}[成功]${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}[警告]${NC} $1"
}

print_error() {
  echo -e "${RED}[错误]${NC} $1"
}

# 检查是否有服务器进程在运行
pid=$(lsof -t -i:8000)
if [ -n "$pid" ]; then
  print_warning "Express服务器已经在运行，进程ID: $pid"
  print_info "如果需要重启，请先运行: ./stop-express.sh"
  exit 1
fi

# 启动服务器
print_info "启动Express服务器 (端口8000)..."
node server/core/server.mjs > express.log 2>&1 &
pid=$!

# 等待服务器启动
print_info "等待服务器启动..."
sleep 2

# 检查服务器是否成功启动
if ps -p $pid > /dev/null; then
  print_success "Express服务器已成功启动，进程ID: $pid"
  print_info "日志文件: express.log (使用 'tail -f express.log' 可实时查看日志)"
  print_info "服务器地址: http://127.0.0.1:8000"
  print_info "如需测试API，请运行: ./tools/test-by-express.sh"
  print_info "要停止服务器，请运行: ./stop-express.sh"
else
  print_error "服务器启动失败，请检查日志文件: express.log"
  cat express.log | tail -n 10
  exit 1
fi 