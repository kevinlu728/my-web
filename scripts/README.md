# 脚本文件结构说明

## 目录结构

```
scripts/
├── components/            # UI组件相关脚本
│   ├── articleRenderer.js # 文章渲染器
│   ├── codeBlock.js       # 代码块组件
│   ├── tableBlock.js      # 表格组件
│   ├── welcomePageRenderer.js # 欢迎页面渲染组件
│   └── ...
├── core/                  # 核心功能脚本
│   ├── main.js            # 主入口文件
│   ├── router.js          # 路由管理
│   └── ...
├── managers/              # 管理器脚本
│   ├── articleManager.js  # 文章管理
│   ├── themeManager.js    # 主题管理
│   ├── categoryManager.js # 分类管理
│   └── ...
├── services/              # 服务脚本
│   ├── apiService.js      # API服务
│   ├── storageService.js  # 存储服务
│   └── ...
├── utils/                 # 工具脚本
│   ├── table-lazy-loader.js # 表格懒加载
│   ├── code-lazy-loader.js  # 代码块懒加载
│   ├── article-utils.js   # 文章相关工具函数
│   ├── article-cache.js   # 文章缓存工具
│   ├── url-utils.js       # URL参数处理工具
│   └── ...
├── config/                # 配置脚本
│   ├── constants.js       # 常量定义
│   └── ...
├── pages/                 # 页面特定脚本
│   ├── home.js            # 首页脚本
│   ├── blog.js            # 博客页脚本
│   └── ...
└── styles/                # 样式操作脚本
    ├── themeLoader.js     # 主题加载器
    └── ...
```

## 脚本文件说明

### 核心文件

- **core/main.js**: 应用程序的主入口点，负责初始化和协调其他模块
- **core/router.js**: 处理页面路由和导航

### 组件脚本

- **components/articleRenderer.js**: 负责渲染文章内容，包括处理各种内容块（文本、代码、表格等）
- **components/codeBlock.js**: 处理代码块的语法高亮和交互功能
- **components/tableBlock.js**: 处理表格的渲染和交互功能
- **components/welcomePageRenderer.js**: 渲染网站欢迎页面，展示文章分类和推荐内容

### 管理器脚本

- **managers/articleManager.js**: 管理文章的加载、缓存和展示
- **managers/themeManager.js**: 管理主题切换和持久化
- **managers/categoryManager.js**: 管理文章分类的加载、显示和交互

### 工具脚本

- **utils/table-lazy-loader.js**: 表格懒加载实现，提高页面性能
- **utils/code-lazy-loader.js**: 代码块懒加载实现，提高页面性能
- **utils/article-utils.js**: 文章相关工具函数集合
- **utils/article-cache.js**: 文章缓存管理工具
- **utils/url-utils.js**: URL参数处理工具函数

## 代码组织原则

1. **模块化**: 每个文件应该有明确的单一职责
2. **依赖注入**: 通过参数传递依赖，而不是直接引用全局变量
3. **事件驱动**: 使用自定义事件进行模块间通信
4. **懒加载**: 非关键资源采用懒加载策略提高性能

## 重构历史

### 2024-03-20

- 创建了 `article-cache.js` 专门管理文章缓存逻辑
- 提取了 `article-utils.js` 文件，整合文章相关工具函数
- 移动 `welcome-page-renderer.js` 从 `utils` 到 `components` 目录并重命名为 `welcomePageRenderer.js`
- 创建了 `url-utils.js` 工具类用于URL参数管理
- 重构了 `articleManager.js` 中的复杂方法：
  - 将 `showArticle` 拆分为多个职责清晰的小方法
  - 将 `loadMoreContent` 拆分为数据获取、处理和渲染三个独立步骤

### 2024-03-09

- 重构了表格懒加载机制，从 `observe` 方法改为 `processAllTables` 方法
- 更新了 `articleRenderer.js` 中的 `renderBlock` 函数，直接生成表格占位符HTML
- 修改了 `articleManager.js` 中的懒加载初始化逻辑，适配新的表格处理方式
- 优化了代码块和表格的加载性能

## 未来重构计划

以下是计划中的重构任务：

1. **搜索功能提取**
   - 创建独立的 `searchManager.js` 管理搜索功能
   - 从 `articleManager.js` 中提取搜索相关方法
   - 优化搜索结果的展示和交互

2. **缓存管理优化**
   - 改进缓存策略，支持部分更新而非全量更新
   - 添加缓存版本控制机制
   - 实现更智能的缓存失效策略

3. **组件生命周期管理**
   - 实现统一的组件初始化和销毁机制
   - 改进事件监听器的添加和移除逻辑，防止内存泄漏

4. **错误处理机制优化**
   - 创建全局错误处理机制
   - 改进用户友好的错误信息展示
   - 添加错误报告和日志收集功能 