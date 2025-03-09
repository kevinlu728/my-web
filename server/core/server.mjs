/**
 * @file server.mjs
 * @description 主服务器入口文件，负责初始化和启动HTTP服务器，配置中间件和路由
 * @author 陆凯
 * @created 2024-03-09
 * @updated 2024-03-10
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

// 设置监控
setupMonitoring(app);

// 页面路由
app.get('/', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

app.get('/tech-blog.html', (req, res) => {
  res.sendFile(path.join(rootDir, 'tech-blog.html'));
});

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

process.on('SIGINT', () => {
  console.log('收到 SIGINT 信号，正在关闭服务器...');
  process.exit(0);
}); 