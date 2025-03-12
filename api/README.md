# Vercel API 部署说明

本目录包含为 Vercel 部署准备的 API 函数。这些函数基于原有的 `server/api` 目录中的代码，但进行了必要的调整以适应 Vercel 的无服务器函数环境。

## 文件结构

- `notion-service.js` - Notion API 服务封装
- `hello.js` - 测试 API 端点
- `articles.js` - 文章列表 API 端点
- `article-content/[pageId].js` - 文章内容 API 端点
- `blocks/[blockId]/children.js` - 块子块 API 端点
- `database-info.js` - 数据库信息 API 端点
- `databases.js` - 数据库列表 API 端点
- `clear-cache.js` - 清除缓存 API 端点

## 环境变量

在 Vercel 上部署时，需要设置以下环境变量：

- `NOTION_API_KEY` - Notion API 密钥
- `NOTION_DATABASE_ID` - 默认的 Notion 数据库 ID

## 部署步骤

1. 确保已经安装了 Vercel CLI：`npm install -g vercel`
2. 在项目根目录运行：`vercel`
3. 按照提示完成部署
4. 在 Vercel 仪表盘中设置环境变量

## 本地开发

使用 Vercel CLI 进行本地开发：

```bash
vercel dev
```

## 注意事项

- 这些 API 函数是为 Vercel 的无服务器环境设计的，与原有的 Express 服务器有所不同
- 每个 API 函数都是独立的，不共享内存状态
- 缓存在函数调用之间不会持久化，仅在单次函数执行期间有效 