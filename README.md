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
- **双环境测试**：支持Express和Vercel Dev两种测试环境

## 快速开始

### 本地开发

1. 克隆此仓库
2. 安装依赖：`npm install`
3. 创建环境变量文件：`.env.local`
```
NOTION_API_KEY=your_notion_api_key
NOTION_DATABASE_ID=your_notion_database_id
```
4. 启动Express服务器：`./start-express.sh` 或启动Vercel Dev环境：`./start-verceldev.sh`
5. 访问 Express环境：http://localhost:8000 或 Vercel Dev环境：http://localhost:3000

### 测试环境选择

项目提供两种测试环境：

#### Express环境 (端口8000)
- 适用于：本地开发、API功能测试、使用测试工具
- 启动方式：`./start-express.sh`
- 停止方式：`./stop-express.sh`
- 测试工具：`./tools/test-by-express.sh`

#### Vercel Dev环境 (端口3000)
- 适用于：部署前测试、验证Vercel配置、路由测试
- 启动方式：`./start-verceldev.sh`
- 停止方式：`./stop-verceldev.sh`
- 测试工具：`./tools/test-by-verceldev.sh`

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
│   ├── test-by-express.sh    # Express环境API测试工具
│   ├── test-by-verceldev.sh  # Vercel Dev环境API测试工具
│   └── deployment-checker.sh # 部署前检查工具
├── start-express.sh          # 启动Express服务器脚本
├── stop-express.sh           # 停止Express服务器脚本
├── start-verceldev.sh        # 启动Vercel Dev服务器脚本
├── stop-verceldev.sh         # 停止Vercel Dev服务器脚本
├── vercel.json               # Vercel配置
└── tech-blog.html            # 博客页面
```

## 主要工具脚本

### 服务器管理脚本
- **start-express.sh**: 启动Express开发服务器（端口8000）
- **stop-express.sh**: 停止Express开发服务器
- **start-verceldev.sh**: 启动Vercel Dev环境（端口3000）
- **stop-verceldev.sh**: 停止Vercel Dev环境

### 测试工具
- **tools/test-by-express.sh**: Express环境API测试工具，用于测试各个API端点
- **tools/test-by-verceldev.sh**: Vercel Dev环境API测试工具，用于测试Vercel配置和路由规则
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

## API测试说明

### Express环境测试
适用于本地开发和API功能测试：

```bash
# 启动Express服务器
./start-express.sh

# 运行测试工具
./tools/test-by-express.sh

# 测试完成后停止服务器
./stop-express.sh
```

### Vercel Dev环境测试
适用于部署前测试和验证Vercel配置：

```bash
# 启动Vercel Dev服务器
./start-verceldev.sh

# 运行测试工具
./tools/test-by-verceldev.sh

# 测试完成后停止服务器
./stop-verceldev.sh
```

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
使用提供的脚本启动服务器：
```bash
# Express环境（端口8000）
./start-express.sh

# 或者 Vercel Dev环境（端口3000）
./start-verceldev.sh
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
