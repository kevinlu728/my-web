#!/bin/bash

# Vercel Dev服务器停止脚本
# 功能：停止Vercel Dev服务器（端口3000）
# 作者：陆凯
# 创建日期：2024-03-16

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

# 检查是否有Vercel Dev服务器进程在运行
pid=$(lsof -t -i:3000)
if [ -z "$pid" ]; then
  print_info "没有Vercel Dev服务器进程在运行"
  exit 0
fi

# 停止服务器
print_info "停止Vercel Dev服务器进程 $pid..."
kill $pid

# 等待服务器停止
print_info "等待服务器停止..."
sleep 2

# 检查服务器是否已停止
if lsof -t -i:3000 &> /dev/null; then
  print_warning "服务器没有正常停止，尝试强制停止..."
  # 获取最新的PID
  pid=$(lsof -t -i:3000)
  kill -9 $pid
  sleep 1
  
  if lsof -t -i:3000 &> /dev/null; then
    print_error "无法停止Vercel Dev服务器进程 $pid"
    print_info "请手动终止Vercel Dev进程（例如使用'pkill node'）"
    exit 1
  else
    print_success "Vercel Dev服务器已强制停止"
  fi
else
  print_success "Vercel Dev服务器已正常停止"
fi

# 询问是否清除日志
read -p "是否清除日志文件？(y/n): " clear_logs
if [[ $clear_logs == "y" || $clear_logs == "Y" ]]; then
  if [ -f "verceldev.log" ]; then
    rm verceldev.log
    print_success "日志文件已清除"
  else
    print_info "没有找到日志文件"
  fi
else
  print_info "保留日志文件"
fi

print_info "Vercel Dev服务器已成功停止" 