# 服务器文件结构说明

## 目录结构

```
server/
├── core/                      # 核心服务器功能
│   └── server.mjs             # 主服务器入口文件
├── api/                       # API相关功能
│   ├── notion-api.mjs         # Notion API 客户端
│   ├── notion-service.mjs     # Notion 服务封装
│   └── routes/                # API路由定义
│       ├── hello.js           # 测试路由
│       ├── articles.js        # 文章列表路由
│       ├── databases.js       # 数据库路由
│       ├── notion-test.js     # Notion测试路由
│       ├── article-content/   # 文章内容路由
│       │   └── [pageId].js    # 根据页面ID获取文章内容
│       └── blocks/            # 块处理路由
│           └── [blockId]/     # 块ID处理
│               └── children.js # 获取块子元素
└── utils/                     # 工具函数
    ├── monitoring.mjs         # 监控和日志工具
    └── static-server.mjs      # 静态文件服务器
```

## 服务器文件说明

### 核心文件

- **core/server.mjs**: 服务器的主入口点，负责初始化和启动HTTP服务器，配置中间件和路由

### API文件

- **api/notion-api.mjs**: Notion API的客户端封装，处理与Notion API的直接通信
- **api/notion-service.mjs**: 提供高级服务接口，封装Notion API的调用逻辑

### 路由文件

- **api/routes/articles.js**: 处理文章列表的获取和过滤
- **api/routes/article-content/[pageId].js**: 根据页面ID获取完整的文章内容
- **api/routes/blocks/[blockId]/children.js**: 获取特定块的子元素

### 工具文件

- **utils/monitoring.mjs**: 提供监控、日志记录和性能跟踪功能
- **utils/static-server.mjs**: 处理静态文件的服务，如HTML、CSS、JavaScript文件

## 服务器架构

服务器采用模块化设计，主要分为以下几个部分：

1. **HTTP服务器**: 处理客户端请求和响应
2. **API路由**: 定义各种API端点和处理逻辑
3. **Notion集成**: 与Notion API交互，获取和处理数据
4. **静态文件服务**: 提供前端静态资源

## 数据流

1. 客户端发送请求到服务器
2. 服务器根据URL路径匹配相应的路由处理器
3. 路由处理器调用相应的服务（如Notion服务）获取数据
4. 服务将数据返回给路由处理器
5. 路由处理器格式化数据并发送响应给客户端

## 开发指南

### 添加新路由

1. 在 `api/routes/` 目录下创建新的路由文件
2. 导出一个处理函数，接收 `req` 和 `res` 参数
3. 在 `core/server.mjs` 中注册新路由

### 使用Notion服务

```javascript
import { notionService } from '../notion-service.mjs';

export default async function handler(req, res) {
  try {
    const data = await notionService.someMethod();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
```

## 重构历史

### 2024-03-09

- 优化了静态文件服务器的性能
- 改进了Notion API的错误处理
- 添加了监控和日志记录功能
- 实现了块级内容的懒加载API 