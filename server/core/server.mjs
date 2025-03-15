/**
 * @file server.mjs
 * @description 主服务器入口文件，负责初始化和启动HTTP服务器，配置中间件和路由
 * @author 陆凯
 * @created 2024-03-09
 * @updated 2024-03-16
 */

// 主服务器文件 - 整合API和静态文件服务
import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { notionApiRouter } from '../api/notion-api.mjs';
import { configureStaticServer } from '../utils/static-server.mjs';
import { setupMonitoring } from '../utils/monitoring.mjs';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

// 创建Express应用
const app = express();
const port = process.env.PORT || 8000;
const host = "127.0.0.1"; // 明确指定绑定到IPv4地址

// 配置CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
}));

// 解析JSON请求体
app.use(express.json());

// 配置静态文件服务
configureStaticServer(app, rootDir);

// 配置API路由
app.use('/api', notionApiRouter);

// 设置监控 - 不再添加监控路由
setupMonitoring(app);

// 页面路由
app.get('/', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

app.get('/tech-blog.html', (req, res) => {
  res.sendFile(path.join(rootDir, 'tech-blog.html'));
});

// 调试端点 - 用于查看所有路由（已注释掉以减少Serverless函数数量）
// app.get('/api/debug/routes', (req, res) => {
//   console.log('获取API路由信息');
//   
//   const routes = [];
//   
//   // 直接路由
//   app._router.stack.forEach(middleware => {
//     if (middleware.route) {
//       routes.push({
//         path: middleware.route.path,
//         methods: Object.keys(middleware.route.methods)
//       });
//     } else if (middleware.name === 'router') {
//       // 嵌套路由
//       middleware.handle.stack.forEach(handler => {
//         if (handler.route) {
//           routes.push({
//             path: '/api' + handler.route.path,
//             methods: Object.keys(handler.route.methods)
//           });
//         }
//       });
//     }
//   });
//   
//   res.json({
//     routesCount: routes.length,
//     routes: routes
//   });
// });

// 调试端点 - 用于查看环境信息
// app.get('/api/debug/env', (req, res) => {
//   console.log('获取环境信息');
//   
//   res.json({
//     node: process.version,
//     env: process.env.NODE_ENV || 'development',
//     time: new Date().toISOString(),
//     apiVersion: notionApiRouter.notionConfig?.apiVersion || '未知'
//   });
// });

// 监控相关路由 - 注释掉以减少Serverless函数数量
// 健康检查路由
// app.get('/health', (req, res) => {
//   res.json({
//     status: 'healthy',
//     uptime: process.uptime(),
//     timestamp: new Date().toISOString()
//   });
// });

// 监控指标路由
// app.get('/metrics', (req, res) => {
//   res.json({
//     status: 'ok',
//     memoryUsage: process.memoryUsage(),
//     cpuUsage: process.cpuUsage(),
//     uptime: process.uptime(),
//     timestamp: new Date().toISOString()
//   });
// });

// 监控页面路由
// app.get('/monitor', (req, res) => {
//   res.send(`
//     <html>
//       <head>
//         <title>服务器监控</title>
//         <meta charset="utf-8">
//         <meta name="viewport" content="width=device-width, initial-scale=1.0">
//         <style>
//           body { font-family: Arial, sans-serif; margin: 20px; }
//           .container { max-width: 800px; margin: 0 auto; }
//           .metric { margin-bottom: 10px; padding: 10px; border: 1px solid #eee; }
//           .metric-title { font-weight: bold; }
//           .metric-value { font-family: monospace; }
//         </style>
//       </head>
//       <body>
//         <div class="container">
//           <h1>服务器监控</h1>
//           <div class="metric">
//             <div class="metric-title">运行时间</div>
//             <div class="metric-value">${process.uptime()} 秒</div>
//           </div>
//           <div class="metric">
//             <div class="metric-title">内存使用</div>
//             <div class="metric-value">${JSON.stringify(process.memoryUsage())}</div>
//           </div>
//           <div class="metric">
//             <div class="metric-title">当前时间</div>
//             <div class="metric-value">${new Date().toISOString()}</div>
//           </div>
//           <div class="metric">
//             <div class="metric-title">环境</div>
//             <div class="metric-value">${process.env.NODE_ENV || 'development'}</div>
//           </div>
//         </div>
//       </body>
//     </html>
//   `);
// });

console.log('已禁用监控路由以减少Serverless函数数量');

// 启动服务器
app.listen(port, host, () => {
  console.log(`服务器运行在 http://${host}:${port}`);
  console.log(`测试端点: http://${host}:${port}/api/hello`);
});

// 处理进程信号
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，正在关闭服务器...');
  process.exit(0);
});

// 处理进程退出信号
process.on('SIGINT', () => {
  console.log('收到 SIGINT 信号，正在关闭服务器...');
  process.exit(0); 
}); 