# 云栖思渊

个人技术博客网站，使用 Notion 作为 CMS（内容管理系统）。

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
- 使用任何 HTTP 服务器运行项目，例如：
  ```bash
  # 使用 Python 的简单 HTTP 服务器
  python -m http.server 8000
  
  # 或使用 Node.js 的 http-server
  npx http-server
  ```
- 访问 `http://localhost:8000` 查看网站

## 项目结构

```
my-web/
├── assets/           # 静态资源（图片等）
├── scripts/
│   ├── config/      # 配置文件
│   ├── components/  # 组件脚本
│   ├── services/    # 服务层（API 调用等）
│   ├── managers/    # 管理层（业务逻辑）
│   ├── utils/       # 工具函数
│   └── core/        # 核心脚本
├── styles/          # CSS 样式文件
└── *.html           # HTML 页面
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

## 许可证

MIT License
