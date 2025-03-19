# Vercel API 目录说明

本目录包含为 Vercel 部署准备的无服务器函数API。这些函数负责处理线上环境的API请求，与本地开发环境的Express服务器功能对应，但采用了Vercel无服务器函数的架构。核心服务实现与本地环境共享，以确保功能一致性。

## 1. server目录和api目录的关系

**重要说明**：本项目采用双环境架构：
- `server/` 目录 - 主要用于本地开发环境，基于Express服务器
- `api/` 目录（当前目录）- 主要用于Vercel线上环境，基于无服务器函数

两个目录共享核心服务实现，但路由处理方式不同。在修改API功能时，应注意以下原则：

1. **核心服务实现修改**：
   - 只修改 `api/services/notion-service.js` 文件
   - 这是两个环境共享的基础代码，所有更改都应在此文件中进行

2. **API端点修改**：
   - Vercel环境: 修改 `api/api-routes.js` 文件，这是API路由的集中处理器
   - 本地环境: 修改 `server/api/notion-api.mjs` 中的路由定义
   - **不要尝试修改独立的端点文件**，因为这些文件不再使用

## 2. 目录结构

```
api/
├── services/                    # 核心服务实现（两环境共享）
│   └── notion-service.js        # Notion API 服务核心实现
├── internal/                    # 内部处理器（两环境共享）
│   ├── article-handlers.js      # 文章相关处理器
│   ├── database-handlers.js     # 数据库相关处理器
│   ├── content-handlers.js      # 内容相关处理器
│   └── ...                      # 其他处理器
├── config/                      # 配置文件（两环境共享）
│   └── notion-config.js         # Notion API 配置
├── utils/                       # 工具函数（两环境共享）
│   └── ...                      # 各种工具函数
├── api-routes.js                # API路由主处理器（重要！）
├── direct-api.js                # 直接API访问实现
├── notion-service.js            # 兼容层，导入并重新导出services中的实现
├── notion-config.js             # Notion配置（根目录版本）
├── hello.js                     # 测试API端点
└── package.json                 # API目录的包描述文件
```

## 3. 文件说明

### 核心文件

- **services/notion-service.js**: Notion API 服务核心实现，两个环境共享的基础代码
- **internal/**: 包含所有API处理逻辑的处理器，按功能域组织
- **api-routes.js**: API路由主处理器，包含所有API端点的路由逻辑
- **notion-service.js**: 兼容层，导入并重新导出 services/notion-service.js 的实现

### API处理方式

与`server`目录的Express路由不同，`api`目录采用了**集中式路由**:

- **api-routes.js**: 此文件实现了所有API端点的处理逻辑，利用internal目录中的处理器

### API调用链示例

以获取数据库列表功能为例，在Vercel环境中的调用链如下：

```
客户端请求 
-> Vercel函数处理 
-> api/api-routes.js (路径匹配：/api/database) 
-> api/internal/database-handlers.js (getDatabases函数)
-> notionService.listDatabases
-> api/services/notion-service.js
-> Notion API
```

对比本地环境的调用链：

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

### 本地开发

使用 Vercel CLI 测试无服务器函数：

```bash
vercel dev
```

或者使用主服务器开发（推荐，功能更完整）：

```bash
node server/core/server.mjs
```

### 修改现有功能

1. **首先确定修改的性质**:
   - 如果是核心Notion服务功能，修改 `api/services/notion-service.js`
   - 如果是API接口行为，则需要修改:
     - Vercel环境: `api/api-routes.js` 或相应的 `api/internal/` 处理器
     - 本地环境: `server/api/notion-api.mjs` 

2. **测试两个环境**:
   - 本地服务器环境: `node server/core/server.mjs`
   - Vercel无服务器环境: `vercel dev`

### 添加新功能

1. 如需添加新的API端点:
   - 在 `api/services/notion-service.js` 中添加新的服务方法
   - 在 `api/internal/` 目录下创建或修改相应的处理器函数
   - 在 `api/api-routes.js` 中添加新的路由匹配
   - 在 `server/api/notion-api.mjs` 中添加对应的Express路由

2. **处理器实现示例**:
```javascript
// 在api/internal/custom-handlers.js中
const { notionService } = require('../services/notion-service');

async function newFeature(req, res) {
  try {
    const result = await notionService.newServiceMethod();
    return { success: true, data: result };
  } catch (error) {
    throw error;
  }
}

module.exports = { newFeature };
```

### 部署步骤

1. 确保已经安装了 Vercel CLI：`npm install -g vercel`
2. 在项目根目录运行：`vercel`
3. 按照提示完成部署
4. 在 Vercel 仪表盘中设置环境变量

## 5. 注意事项

- 这些 API 函数是为 Vercel 的无服务器环境设计的，与Express服务器有所不同
- 每个 API 函数都是独立的，不共享内存状态
- 缓存在函数调用之间不会持久化，仅在单次函数执行期间有效
- **本地和线上环境的主要差异**:
  - 本地环境: Express路由，在 `server/api/notion-api.mjs` 中定义
  - 线上环境: 集中式路由，在 `api/api-routes.js` 中处理
  - 尽管路由定义方式不同，但两者使用相同的核心实现和处理器

### 环境变量

在 Vercel 上部署时，需要设置以下环境变量：

- `NOTION_API_KEY` - Notion API 密钥
- `NOTION_DATABASE_ID` - 默认的 Notion 数据库 ID

## 6. 已知问题与重构历史

### 已知问题

1. **路由实现不一致**: 
   - 本地环境: Express路由器，在单个文件中定义所有路由
   - Vercel环境: 集中式处理，在api-routes.js中
   - 这种差异增加了维护复杂性，但共享核心实现减轻了这个问题

2. **配置管理分散**:
   - 配置信息分布在多个位置（.env文件、config目录、环境变量）
   - 未来可考虑统一配置管理

### 重构历史

#### 2024-03-15
- 统一了API，使本地和Vercel环境共享相同的核心服务实现
- 将Notion服务核心实现移动到 `api/services/notion-service.js`
- 创建internal目录，组织共享处理器
- 实现了本地环境通过适配器调用共享实现

#### 2024-03-09
- 优化了错误处理和缓存机制
- 改进了Notion API的响应处理
- 实现了块级内容的懒加载API 