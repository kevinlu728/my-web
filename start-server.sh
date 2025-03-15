#!/bin/bash

# 添加颜色支持
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

print_api() {
  echo -e "${PURPLE}[API]${NC} $1"
}

# 检查是否有服务器进程在运行
pid=$(lsof -t -i:8000)
if [ -n "$pid" ]; then
  print_warning "服务器已经在运行，进程ID: $pid"
  print_info "如果需要重启，请先运行: ./stop-server.sh"
  exit 1
fi

# 检查依赖工具
if ! command -v curl &> /dev/null; then
  print_warning "未安装curl，无法执行API测试"
  has_curl=false
else
  has_curl=true
fi

# 启动服务器
print_info "启动服务器..."
node server/core/server.mjs > server.log 2>&1 &
pid=$!

# 等待服务器启动
print_info "等待服务器启动..."
sleep 3

# 检查服务器是否成功启动
if ps -p $pid > /dev/null; then
  print_success "服务器已成功启动，进程ID: $pid"
  print_info "日志文件: server.log (使用 'tail -f server.log' 可实时查看日志)"
  
  echo -e "\n${BLUE}===== API测试端点 =====${NC}"
  echo -e "常用API端点:"
  echo -e "  ${GREEN}GET${NC}  http://127.0.0.1:8000/api/hello      - 测试API连接"
  echo -e "  ${GREEN}GET${NC}  http://127.0.0.1:8000/api/status     - 查看API状态"
  echo -e "  ${GREEN}GET${NC}  http://127.0.0.1:8000/api/databases  - 获取数据库列表"
  echo -e "  ${YELLOW}POST${NC} http://127.0.0.1:8000/api/articles   - 获取文章列表"
  echo -e "  ${YELLOW}POST${NC} http://127.0.0.1:8000/api/clear-cache - 清除API缓存"
  echo -e "  ${GREEN}GET${NC}  http://127.0.0.1:8000/api/article-content/:pageId - 获取文章内容"
  echo -e "  ${GREEN}GET${NC}  http://127.0.0.1:8000/api/blocks/:blockId/children - 获取块内容"
  echo -e "\n${BLUE}=======================${NC}"
  
  # 执行简单的API测试
  if [ "$has_curl" = true ]; then
    print_info "执行API测试..."
    sleep 1
    
    # 测试Hello API
    echo -e "\n${BLUE}测试 Hello API${NC}"
    hello_response=$(curl -s -w "\n%{http_code}" http://127.0.0.1:8000/api/hello)
    hello_status=$(echo "$hello_response" | tail -n1)
    hello_body=$(echo "$hello_response" | sed '$d')
    
    if [ "$hello_status" -eq 200 ]; then
      print_success "Hello API 测试成功 (状态码: $hello_status)"
      print_api "$hello_body"
    else
      print_error "Hello API 测试失败 (状态码: $hello_status)"
      print_api "$hello_body"
    fi
    
    # 测试Status API
    echo -e "\n${BLUE}测试 Status API${NC}"
    status_response=$(curl -s -w "\n%{http_code}" http://127.0.0.1:8000/api/status)
    status_code=$(echo "$status_response" | tail -n1)
    status_body=$(echo "$status_response" | sed '$d')
    
    if [ "$status_code" -eq 200 ]; then
      print_success "Status API 测试成功 (状态码: $status_code)"
      print_api "$status_body"
    elif [ "$status_code" -eq 302 ]; then
      print_warning "Status API 返回重定向 (状态码: $status_code) - 这是正常现象"
      print_info "根据API优化设计，Status API现在重定向到Hello API以减少Serverless函数数量"
      print_api "$status_body"
    else
      print_error "Status API 测试失败 (状态码: $status_code)"
      print_api "$status_body"
    fi
    
    # 提醒用户POST接口需要手动测试
    echo -e "\n${YELLOW}注意${NC}: POST类型的API（如articles）需要使用合适的工具测试，例如:"
    echo -e "  curl -X POST -H \"Content-Type: application/json\" -d '{}' http://127.0.0.1:8000/api/articles"
    echo -e "  或使用Postman等API测试工具\n"
  fi
  
  print_info "要停止服务器，请运行: ./stop-server.sh"
else
  print_error "服务器启动失败，请检查日志文件: server.log"
  cat server.log | tail -n 20
  exit 1
fi 