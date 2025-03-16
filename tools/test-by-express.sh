#!/bin/bash

# Express API测试工具
# 适用于Express服务器环境 (端口8000)
# 作者：陆凯
# 创建日期：2024-03-16
# 修改日期：2024-03-16

# ==========================================================
# 适用场景：
# 1. API功能测试 - 测试各API端点的功能和响应
# 2. 本地功能开发 - 开发新API或修改现有API时的快速测试
# 3. 集成测试 - 测试API与数据库等外部服务的集成
# 4. 当需要Express特有功能时(如自定义中间件、路由等)
# ==========================================================
# 使用说明：
# - 此脚本针对Express服务器设计，使用8000端口
# - 使用./start-server.sh启动Express服务器
# - 如需测试Vercel部署配置或路由规则，请使用test-by-verceldev.sh
# ==========================================================

# 添加颜色支持
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 项目根目录（脚本所在目录的上一级）
PROJECT_ROOT="$(dirname "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)")"
cd "$PROJECT_ROOT" || exit 1

# 定义API基础URL
API_BASE="http://127.0.0.1:8000/api"

# 打印带颜色的消息函数
print_info() { echo -e "${BLUE}[信息]${NC} $1"; }
print_success() { echo -e "${GREEN}[成功]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[警告]${NC} $1"; }
print_error() { echo -e "${RED}[错误]${NC} $1"; }
print_api() { echo -e "${PURPLE}[API]${NC} $1"; }
print_debug() { echo -e "${CYAN}[调试]${NC} $1"; }
print_header() { echo -e "\n${YELLOW}========== $1 ==========${NC}\n"; }

# 检查依赖工具
check_dependencies() {
  # 检查curl
  if ! command -v curl &> /dev/null; then
    print_error "未安装curl，无法执行API测试"
    exit 1
  fi
  
  # 检查jq（可选）
  if command -v jq &> /dev/null; then
    has_jq=true
    print_success "检测到jq工具，将用于格式化JSON输出"
  else
    has_jq=false
    print_warning "未检测到jq工具，JSON输出将不会被格式化"
    print_info "建议安装jq: brew install jq (Mac) 或 apt install jq (Linux)"
  fi
}

# 启动服务器函数
start_server() {
  # 检查是否有服务器进程在运行
  pid=$(lsof -t -i:8000)
  if [ -n "$pid" ]; then
    print_warning "服务器已经在运行，进程ID: $pid"
    print_info "如果需要重启，请先停止服务器"
    return 0
  fi
  
  print_info "启动服务器..."
  ./start-server.sh
  # 使用lsof获取PID而不是$!
  pid=$(lsof -t -i:8000)
  sleep 1
  
  # 等待服务器启动
  print_info "等待服务器启动..."
  sleep 3
  
  # 检查服务器是否成功启动
  if ps -p $pid > /dev/null; then
    print_success "服务器已成功启动，进程ID: $pid"
    print_info "日志文件: server.log (使用选项4可查看日志)"
    return 0
  else
    print_error "服务器启动失败，请检查日志文件"
    cat server.log | tail -n 20
    return 1
  fi
}

# 停止服务器函数
stop_server() {
  pid=$(lsof -t -i:8000)
  if [ -z "$pid" ]; then
    print_warning "服务器未运行"
    return 0
  fi
  
  print_info "停止服务器进程 $pid..."
  ./stop-server.sh
  
  # 等待服务器停止
  print_info "等待服务器停止..."
  sleep 2
  
  # 验证服务器是否已停止
  if ps -p $pid > /dev/null 2>&1; then
    print_error "服务器未能正常停止，尝试强制终止..."
    kill -9 $pid
    sleep 1
  fi
  
  if ps -p $pid > /dev/null 2>&1; then
    print_error "无法停止服务器进程"
    return 1
  else
    print_success "服务器已正常停止"
    
    # 询问是否清除日志文件
    read -p "是否清除日志文件？(y/n): " clean_logs
    if [ "$clean_logs" = "y" ] || [ "$clean_logs" = "Y" ]; then
      if [ -f "server.log" ]; then
        rm server.log
        print_success "日志文件已清除"
      fi
    else
      print_info "保留日志文件"
    fi
    
    print_info "服务器已成功停止"
    return 0
  fi
}

# 测试GET API函数
test_get_api() {
  print_header "测试GET类型API"
  
  # 列出可测试的API
  print_info "可测试的GET API端点:"
  echo -e "  ${GREEN}1${NC}) /api/hello      - 测试与状态API"
  echo -e "  ${GREEN}2${NC}) /api/databases  - 获取数据库列表"
  echo -e "  ${GREEN}3${NC}) /api/database?id=<database_id> - 获取特定数据库"
  echo -e "  ${GREEN}4${NC}) /api/content/<id>?type=article - 获取文章内容"
  echo -e "  ${GREEN}5${NC}) /api/content/<id>?type=block - 获取块内容"
  echo -e "  ${GREEN}6${NC}) /api/status     - 状态API (重定向到hello)"
  echo -e "  ${YELLOW}0${NC}) 返回主菜单"
  
  read -p "请选择要测试的API [0-6]: " api_option
  
  case $api_option in
    1) test_hello_api ;;
    2) test_databases_api ;;
    3) 
      read -p "请输入数据库ID: " db_id
      test_database_api "$db_id" ;;
    4)
      read -p "请输入文章ID: " article_id
      test_content_api "$article_id" "article" ;;
    5)
      read -p "请输入块ID: " block_id
      test_content_api "$block_id" "block" ;;
    6) test_status_api ;;
    0) return ;;
    *) print_error "无效选项: $api_option" ;;
  esac
}

# Hello API测试
test_hello_api() {
  print_header "测试 Hello API"
  
  response=$(curl -s -w "\n%{http_code}" "$API_BASE/hello")
  status_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$status_code" -eq 200 ]; then
    print_success "Hello API 测试成功 (状态码: $status_code)"
    format_and_print_json "$body"
  else
    print_error "Hello API 测试失败 (状态码: $status_code)"
    print_api "$body"
  fi
}

# Status API测试
test_status_api() {
  print_header "测试 Status API"
  
  response=$(curl -s -w "\n%{http_code}" "$API_BASE/status")
  status_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$status_code" -eq 200 ]; then
    print_success "Status API 测试成功 (状态码: $status_code)"
    format_and_print_json "$body"
  elif [ "$status_code" -eq 302 ]; then
    print_warning "Status API 返回重定向 (状态码: $status_code) - 这是正常现象"
    print_info "根据API优化设计，Status API现在重定向到Hello API以减少Serverless函数数量"
    print_api "$body"
    
    # 跟随重定向
    print_info "跟随重定向..."
    follow_response=$(curl -s -L "$API_BASE/status")
    print_success "重定向后的响应:"
    format_and_print_json "$follow_response"
  else
    print_error "Status API 测试失败 (状态码: $status_code)"
    print_api "$body"
  fi
}

# 数据库列表API测试
test_databases_api() {
  print_header "测试 Databases API"
  
  response=$(curl -s -w "\n%{http_code}" "$API_BASE/database")
  status_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$status_code" -eq 200 ]; then
    print_success "Databases API 测试成功 (状态码: $status_code)"
    format_and_print_json "$body"
  elif [ "$status_code" -eq 302 ]; then
    handle_redirection "$API_BASE/database" "$body" "$status_code"
  else
    print_error "Databases API 测试失败 (状态码: $status_code)"
    print_api "$body"
  fi
}

# 特定数据库API测试
test_database_api() {
  local db_id="$1"
  print_header "测试 Database API (ID: $db_id)"
  
  response=$(curl -s -w "\n%{http_code}" "$API_BASE/database?id=$db_id")
  status_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$status_code" -eq 200 ]; then
    print_success "Database API 测试成功 (状态码: $status_code)"
    format_and_print_json "$body"
  elif [ "$status_code" -eq 302 ]; then
    handle_redirection "$API_BASE/database?id=$db_id" "$body" "$status_code"
  else
    print_error "Database API 测试失败 (状态码: $status_code)"
    print_api "$body"
  fi
}

# 内容API测试
test_content_api() {
  local id="$1"
  local type="$2"
  print_header "测试 Content API (ID: $id, 类型: $type)"
  
  response=$(curl -s -w "\n%{http_code}" "$API_BASE/content/$id?type=$type")
  status_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$status_code" -eq 200 ]; then
    print_success "Content API 测试成功 (状态码: $status_code)"
    format_and_print_json "$body"
  elif [ "$status_code" -eq 302 ]; then
    handle_redirection "$API_BASE/content/$id?type=$type" "$body" "$status_code"
  else
    print_error "Content API 测试失败 (状态码: $status_code)"
    print_api "$body"
  fi
}

# 处理重定向
handle_redirection() {
  local url="$1"
  local body="$2"
  local status_code="$3"
  
  print_warning "API返回重定向 (状态码: $status_code)"
  print_info "这是API优化的结果，某些端点被合并和重定向以减少Serverless函数数量"
  print_api "$body"
  
  print_info "跟随重定向..."
  follow_response=$(curl -s -L "$url")
  print_success "重定向后的响应:"
  format_and_print_json "$follow_response"
}

# 测试POST API函数
test_post_api() {
  print_header "测试POST类型API"
  
  # 列出可测试的API
  print_info "可测试的POST API端点:"
  echo -e "  ${GREEN}1${NC}) /api/articles       - 获取文章列表"
  echo -e "  ${GREEN}2${NC}) /api/database       - 获取数据库信息(POST方式)"
  echo -e "  ${YELLOW}0${NC}) 返回主菜单"
  
  read -p "请选择要测试的API [0-2]: " api_option
  
  case $api_option in
    1) test_articles_api ;;
    2) 
      read -p "请输入数据库ID: " db_id
      test_database_post_api "$db_id" ;;
    0) return ;;
    *) print_error "无效选项: $api_option" ;;
  esac
}

# 文章列表API测试
test_articles_api() {
  print_header "测试 Articles API"
  
  # 构建JSON请求体
  read -p "请输入获取文章的数量限制 [默认10]: " limit
  limit=${limit:-10}
  
  json_data="{\"limit\":$limit}"
  
  response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d "$json_data" \
    "$API_BASE/articles")
  
  status_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$status_code" -eq 200 ]; then
    print_success "Articles API 测试成功 (状态码: $status_code)"
    format_and_print_json "$body"
  elif [ "$status_code" -eq 302 ]; then
    handle_redirection "$API_BASE/articles" "$body" "$status_code"
  else
    print_error "Articles API 测试失败 (状态码: $status_code)"
    print_api "$body"
  fi
}

# 数据库信息API测试(POST方式)
test_database_post_api() {
  local db_id="$1"
  print_header "测试 Database API (POST, ID: $db_id)"
  
  # 构建JSON请求体
  json_data="{\"databaseId\":\"$db_id\"}"
  
  response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d "$json_data" \
    "$API_BASE/database")
  
  status_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$status_code" -eq 200 ]; then
    print_success "Database API (POST) 测试成功 (状态码: $status_code)"
    format_and_print_json "$body"
  elif [ "$status_code" -eq 302 ]; then
    handle_redirection "$API_BASE/database" "$body" "$status_code"
  else
    print_error "Database API (POST) 测试失败 (状态码: $status_code)"
    print_api "$body"
  fi
}

# 格式化并打印JSON
format_and_print_json() {
  if [ "$has_jq" = true ]; then
    echo "$1" | jq
  else
    print_api "$1"
  fi
}

# 查看服务器日志
view_server_logs() {
  if [ -f "server.log" ]; then
    print_header "服务器日志"
    echo -e "按 ${RED}Ctrl+C${NC} 退出日志查看\n"
    sleep 1
    tail -f server.log
  else
    print_error "服务器日志文件不存在，请先启动服务器"
  fi
}

# 运行部署检查
run_deployment_check() {
  print_header "Vercel部署检查"
  
  if [ -f "./deployment-checker.sh" ]; then
    ./deployment-checker.sh
  else
    print_error "找不到部署检查脚本 (deployment-checker.sh)"
  fi
}

# 显示主菜单并处理选择
main_menu() {
  while true; do
    print_header "API测试工具 - 统一版本"
    echo -e "请选择操作："
    echo -e "  ${GREEN}1${NC}) 启动服务器"
    echo -e "  ${GREEN}2${NC}) 测试GET类型API"
    echo -e "  ${GREEN}3${NC}) 测试POST类型API" 
    echo -e "  ${GREEN}4${NC}) 查看服务器日志"
    echo -e "  ${GREEN}5${NC}) 停止服务器"
    echo -e "  ${GREEN}6${NC}) 运行Vercel部署检查"
    echo -e "  ${GREEN}0${NC}) 退出"
    echo -e "${YELLOW}===================================${NC}"
    
    read -p "请输入选项 [0-6]: " option
    
    case $option in
      1) start_server ;;
      2) test_get_api ;;
      3) test_post_api ;;
      4) view_server_logs ;;
      5) stop_server ;;
      6) run_deployment_check ;;
      0) 
        print_info "退出测试工具"
        exit 0 ;;
      *)
        print_error "无效选项: $option" ;;
    esac
    
    # 在每个操作后暂停，等待用户按任意键继续
    echo
    read -p "按回车键继续..." key
    clear
  done
}

# 主程序
clear
# 检查依赖
check_dependencies
# 显示主菜单
main_menu 