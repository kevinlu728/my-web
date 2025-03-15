#!/bin/bash
# 脚本: 从环境变量加载并启动服务器
# 作者: 陆凯
# 创建时间: 2024-03-16

# 添加颜色支持
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录（脚本所在目录的上一级）
PROJECT_ROOT="$(dirname "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)")"
cd "$PROJECT_ROOT" || exit 1

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

# 检查环境变量文件
if [ ! -f .env.local ] && [ ! -f .env ]; then
  print_error "找不到环境变量文件 (.env.local 或 .env)"
  print_info "请创建.env.local文件并添加以下内容:"
  echo "NOTION_API_KEY=your_notion_integration_key"
  echo "NOTION_DATABASE_ID=your_notion_database_id"
  exit 1
fi

# 加载环境变量
if [ -f .env.local ]; then
  print_info "从.env.local加载环境变量"
  export $(grep -v '^#' .env.local | xargs)
elif [ -f .env ]; then
  print_info "从.env加载环境变量"
  export $(grep -v '^#' .env | xargs)
fi

# 验证环境变量
if [ -z "$NOTION_API_KEY" ]; then
  print_error "NOTION_API_KEY未设置"
  exit 1
else
  print_success "NOTION_API_KEY已加载"
fi

if [ -z "$NOTION_DATABASE_ID" ]; then
  print_error "NOTION_DATABASE_ID未设置"
  exit 1
else
  print_success "NOTION_DATABASE_ID已加载"
fi

# 启动服务器
print_info "正在启动服务器..."
./start-server.sh

# 如果启动失败，提供帮助信息
if [ $? -ne 0 ]; then
  print_error "服务器启动失败"
  print_info "可能需要检查以下问题:"
  echo "1. 确保环境变量正确设置"
  echo "2. 检查服务器日志 (server.log)"
  echo "3. 运行 ./debug-api.sh 进行诊断"
  exit 1
fi

# 提示测试方法
print_info "服务器启动后，可以运行以下命令测试API:"
echo "1. ./test-get-api.sh - 测试GET请求"  
echo "2. ./test-post-api.sh - 测试POST请求"
echo "3. ./debug-api.sh - 详细调试"
echo "4. curl http://127.0.0.1:8000/api/diagnose - 查看诊断信息" 