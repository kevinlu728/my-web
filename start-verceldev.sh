#!/bin/bash

# Vercel Dev服务器启动脚本
# 功能：启动Vercel Dev服务器（端口3000）
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
if [ -n "$pid" ]; then
  print_warning "Vercel Dev服务器已经在运行，进程ID: $pid"
  print_info "如果需要重启，请先运行: ./stop-verceldev.sh"
  exit 1
fi

# 检查是否安装了Vercel CLI
if ! command -v vercel &> /dev/null; then
  print_error "未安装Vercel CLI，请运行 'npm install -g vercel' 安装"
  exit 1
fi

# 启动服务器
print_info "启动Vercel Dev服务器 (端口3000)..."
npm run dev > verceldev.log 2>&1 &
pid=$!

# 等待服务器启动
print_info "等待服务器启动..."
sleep 5

# 检查服务器是否成功启动
if ps -p $pid > /dev/null && lsof -t -i:3000 &> /dev/null; then
  print_success "Vercel Dev服务器已成功启动，进程ID: $pid"
  print_info "日志文件: verceldev.log (使用 'tail -f verceldev.log' 可实时查看日志)"
  print_info "服务器地址: http://localhost:3000"
  print_info "如需测试API，请运行: ./tools/test-by-verceldev.sh"
  print_info "要停止服务器，请运行: ./stop-verceldev.sh"
else
  print_error "Vercel Dev服务器启动失败，请检查日志文件: verceldev.log"
  cat verceldev.log | tail -n 10
  # 如果进程仍在运行但没有监听端口，杀掉它
  if ps -p $pid > /dev/null; then
    print_warning "终止失败的启动进程..."
    kill $pid
  fi
  exit 1
fi 