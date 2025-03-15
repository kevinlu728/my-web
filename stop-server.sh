#!/bin/bash

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
if [ -z "$pid" ]; then
  print_info "没有服务器进程在运行"
  exit 0
fi

# 停止服务器
print_info "停止服务器进程 $pid..."
kill $pid

# 等待服务器停止
print_info "等待服务器停止..."
sleep 2

# 检查服务器是否已停止
if ps -p $pid > /dev/null; then
  print_warning "服务器没有正常停止，尝试强制停止..."
  kill -9 $pid
  sleep 1
  
  if ps -p $pid > /dev/null; then
    print_error "无法停止服务器进程 $pid"
    exit 1
  else
    print_success "服务器已强制停止"
  fi
else
  print_success "服务器已正常停止"
fi

# 询问是否清除日志
read -p "是否清除日志文件？(y/n): " clear_logs
if [[ $clear_logs == "y" || $clear_logs == "Y" ]]; then
  if [ -f "server.log" ]; then
    rm server.log
    print_success "日志文件已清除"
  else
    print_info "没有找到日志文件"
  fi
else
  print_info "保留日志文件"
fi

print_info "服务器已成功停止" 