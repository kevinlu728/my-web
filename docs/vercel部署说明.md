# Vercel部署说明

## 部署前准备

1. 确保你有一个Vercel账户，如果没有，请在[Vercel](https://vercel.com)上注册

2. 确保你的代码已经推送到GitHub上的仓库

3. 准备好必要的环境变量:
   - `NOTION_API_KEY`: Notion API密钥
   - `NOTION_DATABASE_ID`: Notion数据库ID

4. 运行部署检查脚本，确保代码满足部署要求:
   ```bash
   ./deployment-checker.sh
   ```

## Hobby计划限制

Vercel的Hobby计划有一些限制，其中最重要的是:

1. **Serverless函数数量限制**: 最多12个函数
   - 我们已经通过合并和精简API端点来减少函数数量
   - 优化后的API路由包括:
     - `/api/hello`: 合并了hello、status和diagnose功能
     - `/api/articles`: 文章列表API
     - `/api/content/:id`: 统一处理文章内容和块内容
     - `/api/database`: 统一处理数据库相关操作

2. **带宽限制**: 每月100GB
3. **执行时间**: 每次请求最长10秒
4. **部署次数**: 没有限制

## 部署步骤

1. 安装Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. 登录Vercel:
   ```bash
   vercel login
   ```

3. 在项目根目录执行:
   ```bash
   vercel
   ```

4. 按照提示设置项目:
   - 选择已有的项目或创建新项目
   - 设置环境变量
   - 确认部署设置

5. 完成初始部署后，可以使用以下命令进行生产环境部署:
   ```bash
   vercel --prod
   ```

## 环境变量配置

在Vercel的项目设置中，确保添加以下环境变量:

- `NOTION_API_KEY`: Notion API密钥
- `NOTION_DATABASE_ID`: Notion数据库ID

## 故障排除

如果部署失败或API无法正常工作，请检查以下方面:

1. **环境变量**: 确保所有必要的环境变量都已正确设置
2. **构建错误**: 检查Vercel部署日志中的构建错误
3. **API函数限制**: 如果遇到"Too Many Functions"错误，可能需要进一步优化API端点

## API端点优化说明

为了符合Vercel Hobby计划的限制，我们已经优化了API端点:

1. **合并相似功能的API端点**:
   - 所有内容相关的API(`/article-content/:pageId`和`/blocks/:blockId/children`)合并为`/content/:id`
   - 数据库相关API合并为`/database`

2. **移除不必要的监控路由**:
   - 删除了`/health`、`/metrics`和`/monitor`路由
   - 移除了调试相关的端点

3. **保留向后兼容性**:
   - 添加了重定向，确保旧API路径仍然可用
   - 所有重定向指向新的合并API端点

4. **简化错误处理**:
   - 统一的错误响应格式
   - 集中的日志记录 