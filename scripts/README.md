# 脚本文件结构说明

## 目录结构

```
scripts/
├── components/            # UI组件相关脚本
│   ├── articleRenderer.js # 文章渲染器
│   ├── codeBlock.js       # 代码块组件
│   ├── tableBlock.js      # 表格组件
│   └── ...
├── core/                  # 核心功能脚本
│   ├── main.js            # 主入口文件
│   ├── router.js          # 路由管理
│   └── ...
├── managers/              # 管理器脚本
│   ├── articleManager.js  # 文章管理
│   ├── themeManager.js    # 主题管理
│   └── ...
├── services/              # 服务脚本
│   ├── apiService.js      # API服务
│   ├── storageService.js  # 存储服务
│   └── ...
├── utils/                 # 工具脚本
│   ├── table-lazy-loader.js # 表格懒加载
│   ├── code-lazy-loader.js  # 代码块懒加载
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

### 管理器脚本

- **managers/articleManager.js**: 管理文章的加载、缓存和展示
- **managers/themeManager.js**: 管理主题切换和持久化

### 工具脚本

- **utils/table-lazy-loader.js**: 表格懒加载实现，提高页面性能
- **utils/code-lazy-loader.js**: 代码块懒加载实现，提高页面性能

## 代码组织原则

1. **模块化**: 每个文件应该有明确的单一职责
2. **依赖注入**: 通过参数传递依赖，而不是直接引用全局变量
3. **事件驱动**: 使用自定义事件进行模块间通信
4. **懒加载**: 非关键资源采用懒加载策略提高性能

## 重构历史

### 2024-03-09

- 重构了表格懒加载机制，从 `observe` 方法改为 `processAllTables` 方法
- 更新了 `articleRenderer.js` 中的 `renderBlock` 函数，直接生成表格占位符HTML
- 修改了 `articleManager.js` 中的懒加载初始化逻辑，适配新的表格处理方式
- 优化了代码块和表格的加载性能 