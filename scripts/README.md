# 脚本文件结构说明

## 目录结构

```
scripts/
├── blog/                       # 博客频道功能
│   ├── articleManager.js       # 文章管理器
│   ├── articleRenderer.js      # 文章渲染器
│   ├── articlePaginationManager.js # 文章分页管理器
│   ├── articleCacheManager.js  # 文章缓存管理器
│   ├── categoryManager.js      # 分类管理器
│   ├── articleSearchManager.js # 文章搜索管理器
│   ├── codeLazyLoader.js       # 代码块懒加载器
│   ├── mathLazyLoader.js       # 数学公式懒加载器
│   ├── tableLazyLoader.js      # 表格懒加载器
│   ├── imageLazyLoader.js      # 图片懒加载器
│   ├── tableOfContents.js      # 目录管理器
│   ├── tech-blog.js            # 技术博客页面入口
│   └── ...
├── components/                 # UI组件相关脚本
│   ├── chatWidget.js           # 聊天窗口组件
│   ├── contactModals.js        # 联系方式弹窗组件
│   ├── debugPanel.js           # 调试面板组件
│   ├── navigation.js           # 导航菜单组件
│   ├── particleBackground.js   # 粒子背景组件
│   ├── scrollbar.js            # 滚动条管理组件
│   └── ...
├── config/                     # 配置文件
│   ├── config.js               # 配置主文件
│   ├── config.development.js   # 开发环境配置
│   ├── config.production.js    # 生产环境配置
│   ├── resources.js            # 资源配置
│   └── aiConfig.js             # AI服务配置
│   └── ...
├── home/                       # 首页功能
│   ├── home.js                 # 首页页面入口
│   └── ...
├── life/                       # 生活频道功能
│   ├── photoManager.js         # 照片管理器  
│   ├── photoRenderer.js        # 照片渲染器
│   ├── photoWall.js            # 照片墙组件
│   ├── life.js                 # 生活频道页面入口
│   └── ...
├── resources/                  # 资源管理
│   ├── gridjsLoader.js         # 表格资源
│   ├── katexLoader.js          # 数学公式资源
│   ├── prismLoader.js          # 代码高亮资源
│   ├── resourceChecker.js      # 资源检查器
│   ├── resourceEvent.js        # 资源事件管理器
│   ├── resourceManager.js      # 资源管理器
│   ├── resourceTimeout.js      # 资源超时管理器
│   ├── scriptResourceLoader.js # 脚本资源加载器
│   ├── styleResourceLoader.js  # 样式资源加载器
│   └── ...
├── services/                   # API服务客户端
│   ├── aiService.js            # AI服务
│   ├── notionAPIService.js     # Notion API服务
│   └── ...
├── utils/                      # 工具类函数
│   ├── logger.js               # 日志工具
│   ├── common-utils.js         # 通用工具函数
│   ├── dom-utils.js            # DOM操作工具
│   ├── article-utils.js        # 文章相关工具函数
│   ├── url-utils.js            # URL参数管理工具
│   └── ...
```

## 主要模块说明

### 1. API服务客户端 (services/)

- 负责前端应用与后端API之间的通信
- 支持标准API和直接API两种实现方式
- 具有自动重试、超时处理和API实现切换功能
- 支持多数据库切换，区分技术博客和生活频道数据源

### 2. 博客频道 (blog/)

- 文章管理器：文章数据获取、过滤、渲染和状态管理
- 分页管理器：处理文章的"加载更多"功能和滚动检测
- 缓存管理器：优化数据加载性能，管理文章缓存
- 分类管理器：处理文章分类、筛选和状态同步
- 搜索管理器：提供文章搜索和结果高亮功能
- 懒加载系统：针对代码块、公式、表格和图片的延迟加载
- 目录导航：自动生成和处理文章目录

### 3. 生活频道 (life/)

- 照片管理器：处理照片数据的获取和状态管理
- 照片墙组件：实现照片的网格布局和瀑布流展示
- 照片预览：支持照片放大和轮播
- 照片懒加载：优化图片加载性能
- 页面入口：整合各组件的主控制器

### 4. UI组件 (components/)

- 聊天组件：处理网站右下角聊天窗口
- 导航菜单：响应式导航栏
- 调试面板：开发环境调试工具
- 模态窗口：联系方式和二维码弹窗
- 粒子背景：网站背景特效
- 滚动条管理：自定义滚动行为和样式

### 5. 工具函数 (utils/)

- 日志工具：统一的日志记录
- DOM工具：简化DOM操作
- 通用工具：常用功能封装

## 开发规范

1. **命名约定**
   - 组件文件使用小驼峰命名（例如：debugPanel.js）
   - 组件初始化函数使用init前缀（例如：initNavigation()）
   - 管理器类使用单例模式导出（例如：articleManager）

2. **模块化原则**
   - 单一职责：每个模块只负责一个功能
   - 明确接口：通过export/import清晰定义模块边界
   - 降低耦合：避免模块间的直接依赖

3. **性能优化策略**
   - 延迟加载：非关键资源采用懒加载
   - 资源复用：避免重复创建相同资源
   - 分级渲染：优先渲染关键内容

## 重构与优化计划

1. **资源加载优化**
   - 改进资源检查和超时管理
   - 优化加载状态的展示和用户体验

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

5. **生活频道开发**
   - 基于Notion独立数据库构建
   - 照片墙功能实现
   - 与技术博客共享基础架构但独立管理内容


## 重构历史

### 2024-03-26

- 完成了文章管理器的大型模块化重构:
  - 创建了 `articlePaginationManager.js` 模块，专门管理文章分页和加载更多功能
  - 创建了 `articleCacheManager.js` 模块，专门管理文章缓存操作
  - 创建了 `articleSearchManager.js` 模块，专门管理搜索功能
  - 重构了 `articleManager.js`，移除了分页、缓存和搜索相关功能，转为调用对应的专业模块
  - 优化了模块间的数据传递，使用回调函数和事件机制代替直接引用
  - 提高了整体代码的可维护性和测试性

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

### 2024-05-01
- **分离资源检查逻辑**：创建了`resource-checker.js`模块，专门负责检查本地资源是否存在并维护不存在资源的记录。这一重构使得资源检查逻辑更加集中和可维护。
- **分离资源超时管理**：创建了`resource-timeout.js`模块，专门处理资源加载超时逻辑。该模块支持根据资源优先级设置不同的超时时间，使用事件通知系统资源超时，并提供回调机制执行自定义逻辑。通过依赖注入模式与`ResourceManager`集成，有效降低了`resourceManager.js`的复杂度，提高了代码的模块化和可测试性。

### 2024-05-15
- **日志系统环境感知优化**：增强了`logger.js`模块，使其能够根据配置文件自动调整日志级别。添加了与`config.js`的集成，在开发环境中使用详细日志，在生产环境中自动降低日志级别，提高性能和安全性。
