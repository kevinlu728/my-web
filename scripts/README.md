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
│   ├── cdn-mapper.js      # CDN映射模块
│   ├── resource-loader.js # 资源加载器
│   ├── logger.js          # 统一日志管理工具
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
- **utils/cdn-mapper.js**: CDN资源URL映射与管理
- **utils/resource-loader.js**: 处理资源加载、错误处理和回退机制
- **utils/logger.js**: 统一日志管理工具，提供不同级别的日志输出和格式化功能
- **utils/url-utils.js**: URL参数处理工具函数

#### 日志工具模块 (logger.js)

日志工具提供了统一的日志管理功能，可以在整个项目中使用相同的日志格式和风格。

**主要特点**:
- **多级别日志**: 支持`DEBUG`、`INFO`、`WARN`、`ERROR`四个日志级别
- **丰富的上下文信息**: 自动记录时间戳和调用位置
- **彩色输出**: 使用彩色控制台输出，便于区分不同级别的日志
- **环境感知**: 支持通过配置系统根据环境（开发/生产）自动设置日志级别
- **对象序列化**: 自动将对象序列化为JSON字符串

**导入方式**:
```javascript
// ES模块导入
import logger from './utils/logger.js';

// CommonJS导入
const logger = require('./utils/logger');
```

**基本用法**:
```javascript
// 输出不同级别的日志
logger.debug('这是一条调试信息');
logger.info('这是一条普通信息');
logger.warn('这是一条警告信息');
logger.error('这是一条错误信息');

// 记录对象
const user = { id: 1, name: '张三' };
logger.info('用户信息:', user);

// 记录多个参数
logger.info('操作结果:', '成功', { code: 200, data: [...] });
```

**配置日志级别**:
```javascript
// 通过代码设置
logger.setLevel('DEBUG');  // 显示所有日志
logger.setLevel('ERROR');  // 只显示错误日志

// 获取当前日志级别
const currentLevel = logger.getLevel();
console.log(`当前日志级别: ${currentLevel}`);
```

**日志级别说明**:
1. `DEBUG`: 调试信息，用于开发调试
2. `INFO`: 普通信息，记录程序正常运行状态
3. `WARN`: 警告信息，可能的问题但不影响程序运行
4. `ERROR`: 错误信息，程序运行出现错误
5. `NONE`: 不输出任何日志

**日志格式**:
```
[时间戳] [日志级别] [调用位置] 日志内容
```

例如:
```
[2023-07-01T12:34:56.789Z] [INFO] [app.js:getUsers:45] 获取用户列表成功，共 10 条记录
```

**最佳实践**:
1. 在开发环境中使用`DEBUG`级别，方便调试
2. 在测试环境中使用`INFO`级别，记录关键流程
3. 在生产环境中使用`WARN`或`ERROR`级别，减少日志量
4. 使用适当的日志级别：
   - `debug`: 用于开发调试，详细记录程序执行流程
   - `info`: 记录正常的业务流程和状态变化
   - `warn`: 记录可能的问题或异常情况
   - `error`: 记录错误和异常，需要关注和处理

**注意事项**:
1. 避免在循环中过度使用日志，特别是`debug`级别的日志
2. 敏感信息（如密码、令牌）不应直接记录到日志中
3. 在生产环境中，建议使用配置系统设置合适的日志级别

#### CDN映射模块 (cdn-mapper.js)

CDN映射模块提供了一个专门的类 `CdnMapper`，用于处理资源URL的生成和管理。这个模块从资源加载逻辑中分离出来，负责处理CDN资源URL的映射、构建和回退处理。

**主要功能**:
- **CDN映射管理**：将资源配置转换为实际可访问的URL
- **多CDN提供商支持**：支持jsDelivr、CDNJS、UNPKG和本地资源等多种提供商
- **资源回退机制**：当首选CDN失败时自动尝试备用CDN
- **组件资源处理**：支持复杂的组件资源集合（如Prism语法高亮组件）

**核心API**:
- `constructor(resourceConfig)`: 使用资源配置初始化CDN映射器
- `initializeCdnMappings()`: 从资源配置构建初始CDN映射
- `buildUrlsFromConfig(resource)`: 从资源配置构建URL列表
- `buildUrlFromProvider(config)`: 根据提供商配置构建URL
- `addOrUpdateMapping(resourceType, localFallback, currentUrl)`: 添加或更新CDN映射
- `scanExistingResources()`: 扫描页面上已存在的资源，提取它们的类型和本地回退路径
- `getResourceUrls(resourceType)`: 获取资源的所有URL
- `getNextFallbackUrl(resourceType, failedUrl)`: 获取资源的下一个回退URL
- `buildComponentUrls(component, getUrlsFunc)`: 构建组件资源的URL列表

**使用示例**:
```javascript
// 导入资源配置和CDN映射器
import resourceConfig from '../config/resources.js';
import { CdnMapper } from './cdn-mapper.js';

// 创建CDN映射器实例
const cdnMapper = new CdnMapper(resourceConfig);

// 扫描页面上已存在的资源
cdnMapper.scanExistingResources();

// 根据提供商配置构建URL
const jsDelivrConfig = {
    provider: 'jsdelivr',
    package: 'bootstrap',
    version: '5.3.0',
    path: 'dist/css/bootstrap.min.css'
};
const url = cdnMapper.buildUrlFromProvider(jsDelivrConfig);
```

**维护与扩展**:
- 添加新的CDN提供商：在`buildUrlFromProvider`方法中添加新的条件分支
- 支持新的资源类型：扩展`buildUrlsFromConfig`方法
- 改进回退策略：修改`getNextFallbackUrl`方法

#### 资源加载器模块 (resource-loader.js)

通过与`CdnMapper`类的集成，资源加载器模块专注于资源的加载、错误处理和超时管理，而将CDN映射逻辑委托给CDN映射器。这种分离使得每个模块更加专注、更易于测试和维护。

资源加载器负责处理：
- 资源优先级管理与加载顺序
- 资源加载失败的错误处理与回退
- 本地资源存在性检查与标记
- 非关键资源的静默处理
- 组件资源的递归加载

#### 资源超时管理模块 (resource-timeout.js)

`ResourceTimeout` 类负责管理资源加载超时逻辑，确保资源加载不会无限期挂起，并在超时时执行适当的回退操作。

**核心功能**:
- **超时处理**：为资源加载设置超时，防止资源加载过程无限阻塞页面渲染
- **优先级支持**：根据资源优先级（关键、高、中、低）设置不同的超时时间
- **事件通知**：在资源超时时触发自定义事件通知系统
- **回调机制**：支持超时回调函数，以便在资源超时时执行自定义逻辑

**主要API**:
- `setResourceTimeout(resourceType, url, priority, callback)`: 设置资源加载超时处理
- `clearResourceTimeout(url)`: 取消资源的超时处理
- `getTimeoutDuration(priority)`: 获取指定优先级的超时时长
- `updateConfig(config)`: 更新超时配置
- `clearAllTimeouts()`: 清除所有超时处理器
- `hasActiveTimeout(url)`: 检查URL是否有活跃的超时处理器
- `getActiveTimeoutsCount()`: 获取当前活跃的超时处理器数量

**与ResourceLoader集成**:

`ResourceTimeout` 模块通过依赖注入模式与 `ResourceLoader` 集成，避免循环依赖。在 `ResourceLoader` 中：

```javascript
// ResourceLoader提供setResourceTimeout方法委托给resourceTimeout
setResourceTimeout(resourceType, url, priority = 'medium') {
    return resourceTimeout.setResourceTimeout(resourceType, url, priority);
}
```

#### 资源检查器模块 (resource-checker.js)

`ResourceChecker` 类负责检查本地资源是否存在并维护不存在资源的记录，避免反复尝试加载已知不存在的资源。

**核心功能**:
- **本地资源检查**：检查本地资源是否存在，避免加载不存在的资源
- **资源缓存**：维护不存在资源的记录，避免重复检查
- **KaTeX资源管理**：特殊处理KaTeX等可选资源，提高加载效率

**主要API**:
- `checkLocalResourceExists(localPath)`: 检查本地资源是否存在
- `isNonExistentResource(resourcePath)`: 检查资源是否为已知不存在的资源
- `markResourceAsNonExistent(resourcePath)`: 标记资源为不存在
- `updateConfig(config)`: 更新配置，如KaTeX本地资源是否确认存在

**与ResourceLoader集成**:

```javascript
// 更新resourceChecker的配置
resourceChecker.updateConfig({
    katexLocalResourceConfirmed: this.katexLocalResourceConfirmed
});

// 检查本地资源是否存在
const localResourceExists = resourceChecker.checkLocalResourceExists(localFallback);
```

## 代码组织原则

1. **模块化**: 每个文件应该有明确的单一职责
2. **依赖注入**: 通过参数传递依赖，而不是直接引用全局变量
3. **事件驱动**: 使用自定义事件进行模块间通信
4. **懒加载**: 非关键资源采用懒加载策略提高性能

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

### 2024-04-14
- **分离CDN映射逻辑**：将资源加载器中的CDN映射逻辑分离到独立的`cdn-mapper.js`模块中，提高了代码模块化，降低了`resource-loader.js`的复杂度。该重构使CDN资源URL的管理和构建更加集中和高效，为未来扩展CDN提供商支持提供了便利。

### 2024-05-01
- **分离资源检查逻辑**：创建了`resource-checker.js`模块，专门负责检查本地资源是否存在并维护不存在资源的记录。这一重构使得资源检查逻辑更加集中和可维护。
- **分离资源超时管理**：创建了`resource-timeout.js`模块，专门处理资源加载超时逻辑。该模块支持根据资源优先级设置不同的超时时间，使用事件通知系统资源超时，并提供回调机制执行自定义逻辑。通过依赖注入模式与`ResourceLoader`集成，有效降低了`resource-loader.js`的复杂度，提高了代码的模块化和可测试性。

### 2024-05-15
- **日志系统环境感知优化**：增强了`logger.js`模块，使其能够根据配置文件自动调整日志级别。添加了与`config.js`的集成，在开发环境中使用详细日志，在生产环境中自动降低日志级别，提高性能和安全性。

## 未来重构计划

以下是计划中的重构任务：

1. **文章加载状态管理优化**
   - 创建独立的 `articleLoadManager.js` 管理文章加载状态
   - 从 `articleManager.js` 中提取状态管理相关方法
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