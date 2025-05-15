# 样式文件结构说明

## 目录结构

```
styles/
├── base.css                # 基础样式和重置
├── fallback.css            # 资源加载失败时的回退样式
├── font-awesome-fixed.css  # 图标字体样式
├── home/                   # 首页相关样式
│   ├── home.css            # 首页主样式文件
│   └── profile-cards.css   # 首页个人简介卡片样式
├── blog/                   # 博客相关样式
│   ├── blog.css            # 博客页面主样式文件
│   ├── article.css         # 文章内容样式
│   ├── code-block.css      # 代码块样式
│   ├── table-block.css     # 表格样式
│   ├── blog-left-column.css  # 博客左侧栏样式
│   ├── blog-right-column.css # 博客右侧栏样式
│   └── blog-resize-handle.css # 博客栏宽调整组件样式
├── life/                   # 生活频道相关样式
│   ├── life.css            # 生活频道主样式文件
│   ├── life-left-column.css  # 生活左侧栏样式
│   ├── life-right-column.css # 生活右侧栏样式
│   └── life-photo-wall.css   # 照片墙样式
└── components/             # UI组件样式
    ├── header.css          # 页头样式
    ├── footer.css          # 页脚样式
    ├── chat.css            # 聊天组件样式
    ├── modal.css           # 模态框样式
    ├── debug-panel.css     # 调试面板样式
    ├── loading-spinner.css # 加载动画样式
    ├── scrollbar.css       # 自定义滚动条样式
    └── ...
```

## 样式组织原则

### 1. 分层设计

- **基础层**: 定义全局变量、重置样式和基础元素样式
- **组件层**: 定义独立组件的样式和交互
- **布局层**: 定义页面结构和布局框架
- **区块层**: 定义特定页面区域的样式

### 2. 响应式设计

所有样式表都遵循移动优先的响应式设计原则，通过媒体查询适配不同屏幕尺寸:

- 移动设备: 默认样式
- 平板设备: `@media (min-width: 768px)`
- 桌面设备: `@media (min-width: 1200px)`

### 3. 降级策略

- 使用 `fallback.css` 提供基本的回退样式
- 当JavaScript或高级CSS功能不可用时保证基本可用性
- 为老旧浏览器提供基本体验

## 主要模块说明

### 1. 基础样式 (base.css)

- 定义CSS变量用于颜色、间距等
- 重置浏览器默认样式
- 定义基础元素（标题、段落、链接等）样式

### 2. 组件样式 (components/)

- 每个UI组件有独立的样式文件
- 组件样式文件与组件脚本文件保持命名一致性
- 包含组件所有状态和变体的样式

### 3. 布局样式 (layouts/)

- 定义页面整体结构
- 控制页面各部分的尺寸、位置和关系
- 管理响应式布局变化

### 4. 区块样式 (sections/)

- 定义特定页面区域的样式
- 包含该区域所有子元素的样式
- 主要关注内容展示和美观

## 样式命名规范

采用BEM(Block-Element-Modifier)命名规范:

- **Block**: 独立组件，如 `.article-card`
- **Element**: 组件的子元素，如 `.article-card__title`
- **Modifier**: 变体或状态，如 `.article-card--featured`

## 新增和改进计划

### 1. 生活频道样式

- 实现照片墙和照片浏览样式
- 支持图片网格和瀑布流两种布局
- 优化照片预览和放大效果

### 2. 主题系统

- 实现浅色/深色主题切换
- 定义主题变量和切换机制
- 确保所有组件支持主题切换

### 3. 优化方案

- 进一步模块化CSS，减少重复代码
- 优化关键渲染路径的CSS
- 改进动画性能，减少重排重绘

## CSS优化策略

### 1. !important移除策略

- **当前方法**: 通过增强选择器特异性来移除!important只是过渡方案，未来需要考虑重构CSS，即完全重新设计CSS，使用层级分明的架构，以减少选择器特异性
- **最终目标**: 完全消除代码中的!important声明，确保样式按CSS级联规则正常工作
- **过渡阶段建议**:
  - 新增样式禁止使用!important
  - 现有样式在修改时优先移除!important
  - 文档记录所有特殊情况下的样式优先级设计

### 2. 长期CSS架构优化

- 逐步采用BEM命名方法论，减少样式冲突
- 考虑引入CSS预处理器(如Sass)或CSS模块化方案
- 重新设计CSS层级结构，遵循ITCSS(倒三角CSS)方法组织CSS:
  - **设置层**: 变量、函数等
  - **基础层**: 标准化和重置
  - **元素层**: 基本HTML元素样式
  - **对象层**: 无外观的设计模式
  - **组件层**: 特定UI组件样式
  - **工具层**: 辅助类和覆盖样式

### 3. 现代化CSS策略

- 更多利用CSS原生特性，如Custom Properties(变量)
- 减少对JavaScript的依赖，尽可能用CSS实现UI交互
- 针对移动体验优化性能，减少不必要的CSS加载

## 重构历史

### 2024-09-01

- 开始系统性移除CSS中的!important声明
- 采用"增强选择器特异性"的过渡方案保持样式优先级
- 更新了组件样式文件中的元数据，记录重构内容和时间

### 2024-08-16

- 创建 `styles/home` 目录，将 `home-layout.css` 重命名为 `home.css` 并移动到 `styles/home` 目录中
- 创建 `styles/blog` 目录，将 `blog-layout.css` 重命名为 `blog.css` 并移动到 `styles/blog` 目录中
- 将组件CSS文件 `blog-left-column.css`, `blog-right-column.css`, `blog-resize-handle.css` 移动到 `styles/blog` 目录
- 将 `article.css`, `code-block.css`, `table-block.css` 移动到 `styles/blog` 目录
- 将 `life-left-column.css`, `life-right-column.css`, `life-photo-wall.css` 移动到 `styles/life` 目录
- 修正首页布局结构，统一与其他页面一致的内容容器位置和内边距

### 2024-08-16

- 将 `profile-cards.css` 从 `sections/` 目录移动到 `home/` 目录
- 调整相关导入路径以保持引用正确
- 进一步优化首页样式的组织结构

### 2024-08-16

- 将 `home.css` 移动到新创建的 `home/` 目录下
- 调整了导入路径以适应新的文件位置
- 进一步优化了首页样式的组织结构

### 2024-08-15

- 创建了统一的 `profile-cards.css` 合并首页卡片样式
- 移除了冗余的 `profile.css`、`career-intro.css`、`life-intro.css` 和 `collaboration.css`
- 使用更语义化的类名（`.profile-card`, `.card-career` 等）
- 改进了卡片组件的复用性和一致性

### 2024-03-09

- 整合了 `tech-blog-layout.css`, `article.css` 和 `tech-blog-custom.css` 为新的 `blog-layout.css`
- 移除了 `base.css` 中的重复定义
- 统一了命名约定，使用 `.blog-content` 作为博客页面的主容器类名 

### 2024-03-10

- 将 `home.css` 重命名为 `home-layout.css` 以保持布局文件命名的一致性
- 保持了文件目录结构的清晰分离：
  - `layouts/`: 包含页面布局样式
  - `components/`: 包含可重用组件样式
  - `sections/`: 包含页面区块样式

### 2024-05-22

- 拆分 `blog-layout.css` 为多个子文件，提高模块化
- 新增 `blog-left-column.css`, `blog-right-column.css` 和 `blog-resize-handle.css`
- 优化了响应式设计规则，改进移动端体验 