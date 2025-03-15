#!/bin/bash
# Deployment Checker Script
# 用于检查和优化Vercel Serverless函数
# 2024-03-16

# 添加颜色支持
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录（脚本所在目录的上一级）
PROJECT_ROOT="$(dirname "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)")"
cd "$PROJECT_ROOT" || exit 1

# 打印标题
echo -e "==========================="
echo -e "  ${BLUE}Vercel部署前检查工具${NC}  "
echo -e "==========================="
echo ""

# 检查环境变量
echo -e "[1] ${BLUE}检查环境变量${NC}"
if [ -z "$NOTION_API_KEY" ]; then
  echo -e "[${RED}错误${NC}] NOTION_API_KEY 环境变量未设置"
  echo -e "推荐操作: 执行 export NOTION_API_KEY='你的密钥'"
else
  echo -e "✓ NOTION_API_KEY 环境变量已设置"
fi

if [ -z "$NOTION_DATABASE_ID" ]; then
  echo -e "[${RED}错误${NC}] NOTION_DATABASE_ID 环境变量未设置"
  echo -e "推荐操作: 执行 export NOTION_DATABASE_ID='你的数据库ID'"
else
  echo -e "✓ NOTION_DATABASE_ID 环境变量已设置"
fi
echo ""

# 检查.env文件
echo -e "[2] ${BLUE}检查.env文件${NC}"
if [ -f ".env" ] || [ -f ".env.local" ]; then
  echo -e "✓ 找到.env文件"
  
  ENV_FILE=""
  if [ -f ".env.local" ]; then
    ENV_FILE=".env.local"
  else
    ENV_FILE=".env"
  fi
  
  # 检查是否包含必要的环境变量
  if grep -q "NOTION_API_KEY" "$ENV_FILE" && grep -q "NOTION_DATABASE_ID" "$ENV_FILE"; then
    echo -e "✓ .env文件包含所需的环境变量"
    
    # 提取环境变量
    NOTION_API_KEY_ENV=$(grep "NOTION_API_KEY" "$ENV_FILE" | cut -d '=' -f2)
    NOTION_DATABASE_ID_ENV=$(grep "NOTION_DATABASE_ID" "$ENV_FILE" | cut -d '=' -f2)
    
    echo -e "[${GREEN}信息${NC}] 为Vercel部署创建环境变量配置..."
    
    # 创建或更新Vercel环境变量文件
    VERCEL_ENV_FILE=".vercel/.env.production"
    echo "NOTION_API_KEY=$NOTION_API_KEY_ENV" > "$VERCEL_ENV_FILE"
    echo "NOTION_DATABASE_ID=$NOTION_DATABASE_ID_ENV" >> "$VERCEL_ENV_FILE"
    echo -e "✓ 已创建Vercel环境变量文件: $VERCEL_ENV_FILE"
    
    # 提醒用户
    echo -e "[${YELLOW}注意${NC}] 部署到Vercel时，请确保以下环境变量已设置:"
    echo -e "  - NOTION_API_KEY"
    echo -e "  - NOTION_DATABASE_ID"
    echo -e "您可以在Vercel项目设置中，或使用CLI部署时添加这些环境变量"
  else
    echo -e "[${RED}错误${NC}] .env文件缺少必要的环境变量"
    echo -e "推荐操作: 确保.env或.env.local文件包含以下变量:"
    echo -e "  NOTION_API_KEY=your_api_key"
    echo -e "  NOTION_DATABASE_ID=your_database_id"
  fi
else
  echo -e "[${RED}错误${NC}] 未找到.env或.env.local文件"
  echo -e "推荐操作: 创建.env.local文件并包含以下内容:"
  echo -e "  NOTION_API_KEY=your_api_key"
  echo -e "  NOTION_DATABASE_ID=your_database_id"
fi
echo ""

# 检查API文件数量
echo -e "[3] ${BLUE}检查API文件数量${NC}"
API_COUNT=$(find api -name "*.js" | wc -l)
SERVER_API_COUNT=$(find server/api -name "*.js" -o -name "*.mjs" | wc -l)
TOTAL_API_COUNT=$((API_COUNT + SERVER_API_COUNT))

echo -e "API目录文件数: \t$API_COUNT"
echo -e "Server/API目录文件数: \t$SERVER_API_COUNT"

if [ $TOTAL_API_COUNT -gt 12 ]; then
  echo -e "[${YELLOW}警告${NC}] API文件总数超过了Vercel Hobby计划的12个Serverless函数限制"
  echo -e "推荐操作: 合并或删除一些API文件"
else
  echo -e "✓ API文件数量在Vercel Hobby计划限制内"
fi
echo ""

# 检查依赖
echo -e "[4] ${BLUE}检查依赖${NC}"
if [ -f "package.json" ]; then
  echo -e "✓ 找到依赖项"
  
  # 检查是否包含必要的依赖
  if grep -q "@notionhq/client" "package.json"; then
    echo -e "✓ 找到Notion Client依赖"
  else
    echo -e "[${YELLOW}警告${NC}] 未找到Notion Client依赖"
    echo -e "推荐操作: 添加 @notionhq/client 依赖"
  fi
else
  echo -e "[${YELLOW}警告${NC}] 未找到package.json文件"
  echo -e "推荐操作: 创建package.json文件并添加必要的依赖"
fi
echo ""

# 检查部署配置
echo -e "[5] ${BLUE}检查部署配置${NC}"
if [ -f "vercel.json" ]; then
  echo -e "✓ 找到vercel.json配置文件"
  
  # 检查是否有API路由配置
  if grep -q "\"api" "vercel.json"; then
    echo -e "✓ 找到API路由配置"
  else
    echo -e "[${YELLOW}警告${NC}] 未找到API路由配置"
    echo -e "推荐操作: 在vercel.json中添加API路由配置"
  fi
else
  echo -e "[${YELLOW}警告${NC}] 未找到vercel.json文件"
  echo -e "推荐操作: 创建vercel.json文件并添加必要的配置"
fi
echo ""

# 基本功能测试
echo -e "[6] ${BLUE}基本功能测试${NC}"
echo -e "测试hello API..."
if command -v curl &> /dev/null; then
  RESPONSE=$(curl -s http://localhost:8000/api/hello)
  echo "$RESPONSE"
  if [ $? -eq 0 ] && [ -n "$RESPONSE" ]; then
    echo -e "✓ hello API 正常"
  else
    echo -e "[${RED}错误${NC}] hello API 异常"
  fi
  
  echo -e "测试文章列表API..."
  RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d '{}' http://localhost:8000/api/articles)
  if [ $? -eq 0 ] && [ -n "$RESPONSE" ] && ! echo "$RESPONSE" | grep -q "error"; then
    echo -e "✓ 文章列表API 正常"
  else
    echo -e "[${RED}错误${NC}] 文章列表API 异常"
  fi
else
  echo -e "[${YELLOW}警告${NC}] 未安装curl，无法测试API"
fi
echo ""

# 部署建议
echo -e "[7] ${BLUE}部署建议${NC}"
echo -e "[${GREEN}提示${NC}] 确保在Vercel上设置了以下环境变量:"
echo -e "  - NOTION_API_KEY"
echo -e "  - NOTION_DATABASE_ID"
echo ""

echo -e "[${GREEN}提示${NC}] 部署命令:"
echo -e "  $ vercel --prod"
echo ""

echo -e "检查完成!" 