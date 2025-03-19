# 服务器目录说明

本目录包含本地开发环境的服务器代码，基于Express框架构建。服务器负责提供API接口、静态文件服务，以及与Notion API的交互功能。本地开发时主要使用此目录的代码，而线上环境则使用/api目录的对应实现。

## 1. server目录和api目录的关系

**重要说明**：本项目采用双环境架构，分别为：
- `server/` 目录 - 主要用于本地开发环境，基于Express服务器
- `api/` 目录 - 主要用于Vercel线上环境，基于无服务器函数

两个目录中存在一些共享代码，核心逻辑已统一到api目录中。修改API功能时应遵循以下原则：

1. **核心服务实现修改**：
   - 只修改 `api/services/notion-service.js` 文件，这是两个环境共享的核心实现
   - **不要修改** `server/api/notion-service.mjs`，它现在只是一个包装器

2. **API路由和处理逻辑**：
   - 本地环境: 修改 `server/api/notion-api.mjs` 中的路由定义
   - Vercel环境: 修改 `api/api-routes.js` 中的处理逻辑
   - **不要修改** `server/api/routes/` 目录下的文件，它们已被弃用

## 2. 目录结构

```
server/
├── core/                      # 核心服务器功能
│   └── server.mjs             # 主服务器入口文件
├── api/                       # API相关功能
│   ├── notion-api.mjs         # Express路由定义（现用）
│   ├── notion-adapter.mjs     # 适配器，连接到api目录的实现
│   ├── notion-service.mjs     # 服务包装器（包装api/services的实现）
│   └── routes/                # 旧路由定义（已弃用）
│       ├── hello.js           # 测试路由（已弃用）
│       ├── articles.js        # 文章列表路由（已弃用）
│       ├── databases.js       # 数据库路由（已弃用）
│       └── ...                # 其他已弃用路由
└── utils/                     # 工具函数
    ├── monitoring.mjs         # 监控和日志工具
    └── static-server.mjs      # 静态文件服务器
```

## 3. 文件说明

### 核心文件

- **core/server.mjs**: 服务器的主入口点，负责初始化和启动HTTP服务器，配置中间件和路由
- **api/notion-api.mjs**: 当前使用的Express路由定义，包含所有API端点
- **api/notion-adapter.mjs**: 适配器，桥接ES模块和CommonJS模块，导入api目录的共享实现

### API调用链示例

以获取数据库列表功能为例，调用链如下：

```
客户端请求 
-> server/core/server.mjs 
-> notionApiRouter (/api/database 端点) 
-> server/api/notion-api.mjs
-> databaseHandlers.getDatabases 
-> api/internal/database-handlers.js 
-> notionService.listDatabases 
-> api/services/notion-service.js
-> Notion API
```

## 4. 开发指南

### 启动服务器

```bash
node server/core/server.mjs
```

### 添加新API端点

1. 在 `server/api/notion-api.mjs` 中添加新的路由处理
2. 同时在 `api/api-routes.js` 中添加对应的处理逻辑
3. 如果需要，在 `api/internal/` 目录下添加新的处理器
4. 在 `api/services/notion-service.js` 中添加核心服务方法

### 服务调用示例

```javascript
// 在notion-api.mjs中
import { databaseHandlers } from './notion-adapter.mjs';

router.get('/database', async (req, res) => {
  try {
    return await databaseHandlers.getDatabases(req, res);
  } catch (error) {
    console.error('数据库API错误:', error);
    return res.status(500).json({ error: '数据库操作失败' });
  }
});
```

## 5. 注意事项

- 服务器采用模块化设计，主要使用ES模块
- 核心实现已统一到api目录，本地环境通过适配器调用
- **不要直接修改** `server/api/routes/` 目录下的文件，它们已被弃用
- 始终优先修改 `api/services/notion-service.js` 中的服务实现

### 环境兼容性问题解决

在修改API相关功能时，需要注意以下几点以确保本地和线上环境的一致性：

1. **修改核心服务实现**: 
   - 只修改 `api/services/notion-service.js`
   - 修改后测试本地和线上环境的行为是否一致

2. **添加新API端点**: 
   - 修改 `server/api/notion-api.mjs` 和 `api/api-routes.js`
   - 保持两个环境的请求/响应模式一致

3. **配置变更**: 
   - 确保本地环境和Vercel环境的环境变量保持同步
   - 使用共享的配置文件，尽量避免环境特定的配置逻辑

## 6. 已知问题与重构历史

### 已知问题

1. **代码冗余**: 
   - `server/api/routes/` 目录仍然存在，但已不再使用
   - 两个环境的路由实现方式不同（Express vs Serverless）

2. **不一致的路由结构**: 
   - 本地环境使用Express路由器
   - Vercel环境使用api-routes.js
   - 这种不一致性增加了维护负担

### 重构历史

#### 2024-03-15
- 统一了API，使本地和Vercel环境共享相同的核心服务实现
- 将Notion服务核心实现移动到 `api/services/notion-service.js`
- 添加了`notion-adapter.mjs`适配器，连接本地环境到共享实现
- 重写了`notion-api.mjs`，废弃了`routes/`目录下的旧实现

#### 2024-03-09
- 优化了静态文件服务器的性能
- 改进了Notion API的错误处理
- 添加了监控和日志记录功能
- 实现了块级内容的懒加载API 