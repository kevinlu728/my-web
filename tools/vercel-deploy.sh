#!/bin/bash
# Vercel部署脚本
# 用于检查环境变量并部署到Vercel
# 2024-03-15

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
echo -e "  ${BLUE}Vercel部署工具${NC}  "
echo -e "==========================="
echo ""

# 检查Vercel CLI是否安装
echo -e "[1] ${BLUE}检查Vercel CLI${NC}"
if ! command -v vercel &> /dev/null; then
    echo -e "[${RED}错误${NC}] Vercel CLI未安装"
    echo -e "请运行 npm install -g vercel 安装"
    exit 1
fi

VERCEL_VERSION=$(vercel --version)
echo -e "✓ Vercel CLI已安装 (版本: ${VERCEL_VERSION})"
echo ""

# 检查是否登录
echo -e "[2] ${BLUE}检查Vercel登录状态${NC}"
VERCEL_TOKEN=$(vercel whoami 2>/dev/null)
if [ $? -ne 0 ]; then
    echo -e "[${YELLOW}警告${NC}] 尚未登录Vercel"
    echo -e "正在启动登录流程..."
    vercel login
else
    echo -e "✓ 已登录Vercel账户: ${VERCEL_TOKEN}"
fi
echo ""

# 运行部署检查工具
echo -e "[3] ${BLUE}运行部署前检查${NC}"
if [ -f "./tools/deployment-checker.sh" ]; then
    ./tools/deployment-checker.sh
else
    echo -e "[${RED}错误${NC}] 找不到部署检查工具"
    exit 1
fi
echo ""

# 确认部署
echo -e "[4] ${BLUE}部署确认${NC}"
echo -e "即将部署到Vercel，请检查以下内容:"
echo -e "- 环境变量已正确设置"
echo -e "- 所有API端点已优化"
echo -e "- 代码已通过测试"
echo ""
read -p "确认部署? (y/n): " confirm
if [[ $confirm != "y" && $confirm != "Y" ]]; then
    echo -e "[${YELLOW}信息${NC}] 部署已取消"
    exit 0
fi

# 创建或更新Vercel环境变量
echo -e "[5] ${BLUE}准备环境变量${NC}"
ENV_FILE=""
if [ -f ".env.local" ]; then
    ENV_FILE=".env.local"
elif [ -f ".env" ]; then
    ENV_FILE=".env"
fi

if [ -n "$ENV_FILE" ]; then
    echo -e "✓ 找到环境变量文件: ${ENV_FILE}"
    
    # 创建.vercel目录（如果不存在）
    mkdir -p .vercel
    
    # 提取环境变量
    NOTION_API_KEY_ENV=$(grep "NOTION_API_KEY" "$ENV_FILE" | cut -d '=' -f2)
    NOTION_DATABASE_ID_ENV=$(grep "NOTION_DATABASE_ID" "$ENV_FILE" | cut -d '=' -f2)
    
    # 创建Vercel环境变量文件
    echo -e "正在创建Vercel环境变量文件..."
    VERCEL_ENV_FILE=".vercel/.env.production"
    echo "NOTION_API_KEY=$NOTION_API_KEY_ENV" > "$VERCEL_ENV_FILE"
    echo "NOTION_DATABASE_ID=$NOTION_DATABASE_ID_ENV" >> "$VERCEL_ENV_FILE"
    echo -e "✓ 已创建Vercel环境变量文件: $VERCEL_ENV_FILE"
else
    echo -e "[${RED}错误${NC}] 未找到环境变量文件"
    echo -e "部署可能会失败，请确保在Vercel项目设置中添加环境变量"
fi
echo ""

# 执行部署
echo -e "[6] ${BLUE}开始部署${NC}"
echo -e "正在部署到Vercel..."
vercel --prod

# 检查部署结果
if [ $? -eq 0 ]; then
    echo -e "[${GREEN}成功${NC}] 部署完成"
    echo -e "请检查部署日志并验证线上环境是否正常工作"
else
    echo -e "[${RED}错误${NC}] 部署失败"
    echo -e "请检查错误信息并解决问题后重试"
fi
echo ""

echo -e "==========================="
echo -e "  ${BLUE}部署流程结束${NC}  "
echo -e "===========================" 