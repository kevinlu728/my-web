# 样式文件结构说明

## 目录结构

```
styles/
├── base.css                # 基础样式和重置
├── main.css                # 主样式文件，导入所有其他样式
├── components/             # UI组件样式
│   ├── header.css          # 页头样式
│   ├── footer.css          # 页脚样式
│   ├── chat.css            # 聊天组件样式
│   ├── modal.css           # 模态框样式
│   ├── debug-panel.css     # 调试面板样式
│   ├── code-block.css      # 代码块样式
│   └── table-block.css     # 表格样式
├── layouts/                # 页面布局样式
│   ├── home-layout.css     # 首页布局
│   ├── blog-layout.css     # 博客页面布局
│   └── article-list.css    # 文章列表样式
└── sections/               # 页面区块样式
    ├── profile.css         # 个人资料区块
    ├── intro.css           # 介绍区块
    ├── career.css          # 职业经历区块
    ├── collaboration.css   # 合作区块
    └── article-content.css # 文章内容样式
```

## 样式文件说明

### 主要文件

- **base.css**: 包含全局变量、基础重置和通用样式
- **main.css**: 主样式文件，负责导入所有其他样式文件

### 布局文件

- **blog-layout.css**: 博客页面的统一布局样式，包括网格布局、左右栏样式和响应式调整
- **article-list.css**: 文章列表和分类的样式

### 内容文件

- **article-content.css**: 文章内容的样式，包括标题、段落、列表、代码块等

## 样式优先级

样式文件的导入顺序决定了样式的优先级，后导入的样式会覆盖先导入的样式。在 `main.css` 中，导入顺序如下：

1. 基础样式 (base.css)
2. 组件样式 (components/*)
3. 布局样式 (layouts/*)
4. 页面区块样式 (sections/*)

## 命名约定

- 类名使用小写字母和连字符 (kebab-case)
- 组件样式使用组件名作为前缀 (例如: `.header-logo`, `.footer-link`)
- 布局样式使用页面名作为前缀 (例如: `.blog-content`, `.home-content`)

## 重构历史

### 2024-03-09

- 整合了 `tech-blog-layout.css`, `article.css` 和 `tech-blog-custom.css` 为新的 `blog-layout.css`
- 移除了 `base.css` 中的重复定义
- 调整了 `main.css` 中的导入顺序
- 统一了命名约定，使用 `.blog-content` 作为博客页面的主容器类名 

### 2024-03-10

- 将 `home.css` 重命名为 `home-layout.css` 以保持布局文件命名的一致性
- 保持了文件目录结构的清晰分离：
  - `layouts/`: 包含页面布局样式
  - `components/`: 包含可重用组件样式
  - `sections/`: 包含页面区块样式 