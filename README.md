# 个人技术博客

基于Notion API的轻量级个人技术博客系统，无需数据库，使用Notion作为CMS系统。

## 特性

- **无后端数据库**：使用Notion作为内容管理系统
- **轻量级**：无需复杂的前端框架
- **响应式设计**：适配不同设备屏幕
- **统一API架构**：优化后的API架构适合Vercel部署
- **Notion内容渲染**：支持Notion中的大部分块类型
- **代码高亮**：支持多种编程语言的语法高亮
- **图片懒加载**：优化页面加载性能

## 快速开始

### 本地开发

1. 克隆此仓库
2. 安装依赖：`npm install`
3. 创建环境变量文件：`.env.local`
```
NOTION_API_KEY=your_notion_api_key
NOTION_DATABASE_ID=your_notion_database_id
```
4. 启动服务器：`./start-server.sh`
5. 访问 http://localhost:8000

### Vercel部署

1. Fork此仓库
2. 在Vercel中导入项目
3. 设置环境变量：
   - `NOTION_API_KEY`
   - `NOTION_DATABASE_ID`
4. 部署项目

> **注意**：本项目已优化API架构，使用单一入口点处理所有API请求，适合在Vercel Hobby计划中部署（限制12个Serverless Functions）

## 项目结构

```
my-web/
├── api/                      # API目录
│   ├── api-routes.js         # 统一API入口点
│   ├── config/               # API配置文件
│   ├── internal/             # 内部处理逻辑
│   ├── services/             # 服务层
│   └── utils/                # 工具函数
├── assets/                   # 静态资源
├── scripts/                  # 客户端JavaScript
│   ├── components/           # UI组件
│   ├── config/               # 客户端配置
│   ├── managers/             # 管理器类
│   ├── services/             # 服务类
│   └── utils/                # 工具函数
├── server/                   # 服务器代码
│   ├── api/                  # 服务器API路由
│   ├── core/                 # 核心服务器代码
│   └── utils/                # 服务器工具函数
├── styles/                   # CSS样式
├── tools/                    # 工具脚本
│   ├── api-test-tool.sh      # API测试工具
│   └── deployment-checker.sh # 部署前检查工具
├── start-server.sh           # 启动服务器脚本
├── stop-server.sh            # 停止服务器脚本
├── vercel.json               # Vercel配置
└── tech-blog.html            # 博客页面
```

## 主要工具脚本

- **start-server.sh**: 启动本地开发服务器
- **stop-server.sh**: 停止本地开发服务器
- **tools/api-test-tool.sh**: 统一API测试工具，用于测试各个API端点
- **tools/deployment-checker.sh**: 部署前检查工具，确保配置正确

## API架构

本项目使用统一的API入口点处理所有请求，以优化Vercel部署：

- `/api/hello` - 检查API状态
- `/api/articles` - 获取文章列表
- `/api/article-content/:pageId` - 获取文章内容
- `/api/blocks/:blockId/children` - 获取块内容
- `/api/database-info` - 获取数据库信息
- `/api/databases` - 获取数据库列表
- `/api/clear-cache` - 清除缓存

## 贡献

欢迎提交Issue或Pull Request。

## 许可

MIT License

## 功能特点

- 响应式设计，支持移动端和桌面端
- 集成 Notion API，动态加载博客内容
- 粒子效果背景
- 聊天机器人界面
- 调试面板（开发模式）

## 开发环境设置

### 1. 克隆项目
```bash
git clone <your-repository-url>
cd my-web
```

### 2. 配置 Notion API
1. 访问 [Notion Integrations](https://www.notion.so/my-integrations) 创建一个新的集成
2. 复制生成的 API 密钥
3. 在 Notion 中分享你的数据库给这个集成

### 3. 设置开发环境配置
1. 进入 `scripts/config` 目录
2. 复制配置模板文件：
   ```bash
   cp config.development.js.example config.development.js
   ```
3. 编辑 `config.development.js`，填入你的 Notion API 密钥和数据库 ID

### 4. 运行项目
- 使用任何 HTTP 服务器运行项目，例如：
  ```bash
  # 使用 Python 的简单 HTTP 服务器
  python -m http.server 8000
  
  # 或使用 Node.js 的 http-server
  npx http-server
  ```
- 访问 `http://localhost:8000` 查看网站

## 项目结构

```
my-web/
├── assets/           # 静态资源（图片等）
├── scripts/
│   ├── config/      # 配置文件
│   ├── components/  # 组件脚本
│   ├── services/    # 服务层（API 调用等）
│   ├── managers/    # 管理层（业务逻辑）
│   ├── utils/       # 工具函数
│   └── core/        # 核心脚本
├── styles/          # CSS 样式文件
└── *.html           # HTML 页面
```

## 配置文件说明

项目使用不同的配置文件管理开发和生产环境：

- `config.js` - 主配置文件，根据环境选择配置
- `config.production.js` - 生产环境配置
- `config.development.js` - 开发环境配置（不提交到 Git）
- `config.development.js.example` - 开发环境配置示例

## 注意事项

1. 不要提交 `config.development.js` 到 Git 仓库
2. 确保 Notion API 密钥的安全性
3. 在生产环境部署前，确保正确配置 `config.production.js`

## 调试模式

网站包含一个调试面板，可以：
- 查看和修改数据库 ID
- 测试 API 连接
- 查看数据库信息
- 刷新文章列表

要启用调试模式，点击页面左侧的调试模式开关。

## 贡献指南

1. Fork 项目
2. 创建特性分支
3. 提交改动
4. 发起 Pull Request

## API测试脚本

项目提供了以下脚本来帮助测试API：

### 综合测试工具

使用综合测试工具：

```bash
./test-api.sh
```

这个工具提供了交互式菜单，可以选择：
1. 启动服务器
2. 测试GET API端点
3. 测试POST API端点
4. 查看服务器日志
5. 停止服务器

### 单独使用测试脚本

#### 启动服务器

```bash
./start-server.sh
```

这个脚本会启动本地服务器，并显示可用的API端点。

#### 测试GET类型API

```bash
./test-get-api.sh
```

这个脚本会测试所有GET类型的API端点，如`/api/hello`、`/api/status`等。

#### 测试POST类型API

```bash
./test-post-api.sh
```

这个脚本会测试所有POST类型的API端点，如`/api/articles`、`/api/clear-cache`等。

#### 停止服务器

```bash
./stop-server.sh
```

这个脚本会停止运行中的服务器，并询问是否需要清除日志文件。

### 手动API测试

您也可以使用curl或Postman等工具手动测试API：

#### GET请求示例

```bash
curl http://127.0.0.1:8000/api/hello
```

#### POST请求示例

```bash
curl -X POST -H "Content-Type: application/json" -d '{}' http://127.0.0.1:8000/api/articles
```

注意：POST接口需要使用正确的请求方法和Content-Type头，否则会返回405错误（方法不允许）。
