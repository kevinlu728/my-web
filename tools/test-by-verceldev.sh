#!/bin/bash

# Vercel Dev API测试工具
# 适用于Vercel Dev环境 (端口3000)
# 作者：陆凯
# 创建日期：2024-03-16

# ==========================================================
# 适用场景：
# 1. 部署前测试 - 在部署到Vercel平台前验证API功能
# 2. 验证Vercel配置 - 测试vercel.json中的路由规则是否正确
# 3. Serverless函数测试 - 测试API在Serverless环境中的行为
# 4. 模拟生产环境 - Vercel Dev提供最接近生产的本地环境
# ==========================================================
# 使用说明：
# - 此脚本针对Vercel Dev环境设计，使用3000端口
# - 使用npm run dev启动Vercel Dev服务器
# - 如需测试Express特有功能，请使用test-by-express.sh
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

# 定义API基础URL - 使用Vercel Dev端口
API_BASE="http://localhost:3000/api"

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
  
  # 检查Vercel CLI
  if ! command -v vercel &> /dev/null; then
    print_error "未安装Vercel CLI，请执行 npm install -g vercel 安装"
    exit 1
  fi
}

# 启动服务器函数
start_server() {
  # 检查是否有服务器进程在运行
  pid=$(lsof -t -i:3000)
  if [ -n "$pid" ]; then
    print_warning "Vercel Dev服务器已经在运行，进程ID: $pid"
    print_info "如果需要重启，请先停止服务器"
    return 0
  fi
  
  print_info "启动Vercel Dev服务器..."
  print_info "将使用 npm run dev 命令，服务将在前台运行"
  print_info "请在新终端窗口中运行以下命令:"
  echo -e "${GREEN}npm run dev${NC}"
  print_info "然后在此窗口按回车键继续..."
  read -p "服务器启动后，按回车继续..." key
  
  # 检查服务器是否成功启动
  pid=$(lsof -t -i:3000)
  if [ -n "$pid" ]; then
    print_success "Vercel Dev服务器已成功启动，进程ID: $pid"
    return 0
  else
    print_error "Vercel Dev服务器未能成功启动"
    print_info "请确保在另一个终端中运行了 npm run dev 命令"
    return 1
  fi
}

# 停止服务器函数
stop_server() {
  pid=$(lsof -t -i:3000)
  if [ -z "$pid" ]; then
    print_warning "Vercel Dev服务器未运行"
    return 0
  fi
  
  print_info "停止Vercel Dev服务器进程 $pid..."
  print_warning "请在运行Vercel Dev的终端窗口中按Ctrl+C停止服务器"
  print_info "或者输入y让此脚本尝试终止进程"
  
  read -p "是否尝试终止进程? (y/n): " should_kill
  if [ "$should_kill" = "y" ] || [ "$should_kill" = "Y" ]; then
    kill $pid
    sleep 2
    
    # 验证服务器是否已停止
    if ps -p $pid > /dev/null 2>&1; then
      print_error "服务器未能正常停止，尝试强制终止..."
      kill -9 $pid
      sleep 1
    fi
    
    if ps -p $pid > /dev/null 2>&1; then
      print_error "无法停止Vercel Dev服务器进程"
      return 1
    else
      print_success "Vercel Dev服务器已成功停止"
      return 0
    fi
  else
    print_info "请在运行Vercel Dev的终端窗口中按Ctrl+C停止服务器"
    return 0
  fi
}

# 测试GET API函数
test_get_api() {
  print_header "测试GET类型API"
  
  # 列出可测试的API
  print_info "可测试的GET API端点:"
  echo -e "  ${GREEN}1${NC}) /api/status     - 状态API"
  echo -e "  ${GREEN}2${NC}) /api/databases  - 获取数据库列表"
  echo -e "  ${GREEN}3${NC}) /api/article-content/<id> - 获取文章内容"
  echo -e "  ${GREEN}4${NC}) /api/blocks/<id>/children - 获取块内容"
  echo -e "  ${YELLOW}0${NC}) 返回主菜单"
  
  read -p "请选择要测试的API [0-4]: " api_option
  
  case $api_option in
    1) test_status_api ;;
    2) test_databases_api ;;
    3)
      read -p "请输入文章ID: " article_id
      test_content_api "$article_id" "article" ;;
    4)
      read -p "请输入块ID: " block_id
      test_content_api "$block_id" "block" ;;
    0) return ;;
    *) print_error "无效选项: $api_option" ;;
  esac
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
  else
    print_error "Status API 测试失败 (状态码: $status_code)"
    print_api "$body"
  fi
}

# 数据库列表API测试
test_databases_api() {
  print_header "测试 Databases API"
  
  response=$(curl -s -w "\n%{http_code}" "$API_BASE/databases")
  status_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$status_code" -eq 200 ]; then
    print_success "Databases API 测试成功 (状态码: $status_code)"
    format_and_print_json "$body"
  else
    print_error "Databases API 测试失败 (状态码: $status_code)"
    print_api "$body"
  fi
}

# 内容API测试
test_content_api() {
  local id="$1"
  local type="$2"
  print_header "测试 Content API (ID: $id)"
  
  response=$(curl -s -w "\n%{http_code}" "$API_BASE/article-content/$id")
  status_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$status_code" -eq 200 ]; then
    print_success "Content API 测试成功 (状态码: $status_code)"
    format_and_print_json "$body"
  else
    print_error "Content API 测试失败 (状态码: $status_code)"
    print_api "$body"
  fi
}

# 测试POST API函数
test_post_api() {
  print_header "测试POST类型API"
  
  # 列出可测试的API
  print_info "可测试的POST API端点:"
  echo -e "  ${GREEN}1${NC}) /api/articles       - 获取文章列表"
  echo -e "  ${GREEN}2${NC}) /api/database-info  - 获取数据库信息"
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
  else
    print_error "Articles API 测试失败 (状态码: $status_code)"
    print_api "$body"
  fi
}

# 数据库信息API测试(POST方式)
test_database_post_api() {
  local db_id="$1"
  print_header "测试 Database Info API (POST, ID: $db_id)"
  
  # 构建JSON请求体
  json_data="{\"databaseId\":\"$db_id\"}"
  
  response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d "$json_data" \
    "$API_BASE/database-info")
  
  status_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$status_code" -eq 200 ]; then
    print_success "Database API (POST) 测试成功 (状态码: $status_code)"
    format_and_print_json "$body"
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

# 测试Vercel路由规则
test_vercel_routes() {
  print_header "测试Vercel路由规则"
  
  print_info "此测试将检查vercel.json中定义的路由规则是否正确应用"
  print_info "测试项目:"
  echo -e "  ${GREEN}1${NC}) CSS文件MIME类型"
  echo -e "  ${GREEN}2${NC}) API路由重定向"
  echo -e "  ${GREEN}3${NC}) 静态文件服务"
  echo -e "  ${YELLOW}0${NC}) 返回主菜单"
  
  read -p "请选择要测试的项目 [0-3]: " route_option
  
  case $route_option in
    1) test_css_mime_type ;;
    2) test_api_redirects ;;
    3) test_static_files ;;
    0) return ;;
    *) print_error "无效选项: $route_option" ;;
  esac
}

# 测试CSS MIME类型
test_css_mime_type() {
  print_header "测试CSS MIME类型"
  
  response=$(curl -s -I "http://localhost:3000/styles/main.css")
  content_type=$(echo "$response" | grep -i "content-type" | cut -d' ' -f2-)
  
  if [[ "$content_type" == *"text/css"* ]]; then
    print_success "CSS MIME类型配置正确: $content_type"
  else
    print_error "CSS MIME类型配置不正确: $content_type"
    print_info "Vercel路由规则可能未正确应用"
  fi
}

# 测试API重定向
test_api_redirects() {
  print_header "测试API重定向"
  
  print_info "测试API重定向规则..."
  response=$(curl -s -I "$API_BASE/content/123?type=article-content")
  
  if [[ "$response" == *"302"* ]] || [[ "$response" == *"307"* ]]; then
    print_success "API重定向规则正确应用"
    print_info "响应:"
    echo "$response"
  else
    print_error "API重定向规则未应用"
    print_info "响应:"
    echo "$response"
  fi
}

# 测试静态文件服务
test_static_files() {
  print_header "测试静态文件服务"
  
  response=$(curl -s -I "http://localhost:3000/scripts/config/config.production.js")
  status_code=$(echo "$response" | head -n1 | cut -d' ' -f2)
  
  if [ "$status_code" -eq 200 ]; then
    print_success "静态文件服务配置正确 (状态码: $status_code)"
  else
    print_error "静态文件服务配置不正确 (状态码: $status_code)"
    print_info "响应:"
    echo "$response"
  fi
}

# 显示主菜单并处理选择
main_menu() {
  while true; do
    print_header "Vercel Dev API测试工具"
    echo -e "请选择操作:"
    echo -e "  ${GREEN}1${NC}) 启动Vercel Dev服务器"
    echo -e "  ${GREEN}2${NC}) 测试GET类型API"
    echo -e "  ${GREEN}3${NC}) 测试POST类型API" 
    echo -e "  ${GREEN}4${NC}) 测试Vercel路由规则"
    echo -e "  ${GREEN}5${NC}) 停止Vercel Dev服务器"
    echo -e "  ${GREEN}6${NC}) 验证Vercel配置文件"
    echo -e "  ${YELLOW}0${NC}) 退出"
    echo -e "${YELLOW}====================================${NC}"
    
    read -p "请输入选项 [0-6]: " option
    
    case $option in
      1) start_server ;;
      2) test_get_api ;;
      3) test_post_api ;;
      4) test_vercel_routes ;;
      5) stop_server ;;
      6) validate_vercel_config ;;
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

# 验证Vercel配置文件
validate_vercel_config() {
  print_header "验证Vercel配置文件"
  
  if [ -f "vercel.json" ]; then
    print_info "检查vercel.json文件..."
    
    # 使用jq验证JSON格式
    if [ "$has_jq" = true ]; then
      if jq empty vercel.json > /dev/null 2>&1; then
        print_success "vercel.json格式正确"
        
        # 提取版本
        version=$(jq .version vercel.json)
        print_info "Vercel配置版本: $version"
        
        # 提取构建配置数量
        builds_count=$(jq '.builds | length' vercel.json)
        print_info "构建配置数量: $builds_count"
        
        # 提取路由配置数量
        routes_count=$(jq '.routes | length' vercel.json)
        print_info "路由配置数量: $routes_count"
        
        # 检查API路由配置
        api_routes=$(jq '.routes[] | select(.dest | contains("api-routes.js"))' vercel.json)
        if [ -n "$api_routes" ]; then
          print_success "已找到API路由配置"
        else
          print_warning "未找到API路由配置，可能会影响API功能"
        fi
        
        # 检查静态文件配置
        static_builds=$(jq '.builds[] | select(.use == "@vercel/static")' vercel.json)
        if [ -n "$static_builds" ]; then
          print_success "已找到静态文件构建配置"
        else
          print_warning "未找到静态文件构建配置，可能会影响静态资源"
        fi
      else
        print_error "vercel.json格式不正确"
        exit 1
      fi
    else
      print_warning "未安装jq，无法验证vercel.json格式"
      cat vercel.json | head -n 20
      print_info "请安装jq以获得更好的验证体验"
    fi
  else
    print_error "未找到vercel.json文件"
    print_info "请确保您在项目根目录中运行此脚本"
    exit 1
  fi
}

# 主程序
clear
# 检查依赖
check_dependencies
# 显示主菜单
main_menu