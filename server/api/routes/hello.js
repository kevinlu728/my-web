/**
 * @file hello.js
 * @description 简单的测试API端点，用于验证服务器是否正常运行
 * @author 陆凯
 * @created 2024-03-09
 * @updated 2024-03-10
 * 
 * @deprecated 此文件已弃用，不再使用。请勿修改此文件。
 * 新实现位于 api/internal/hello-handlers.js (处理器)。
 * 本地环境的路由定义现在位于 server/api/notion-api.mjs。
 * 
 * 调用链：
 * 客户端请求 -> server/core/server.mjs -> notionApiRouter -> 
 * server/api/notion-api.mjs -> helloHandlers.getHello -> 
 * api/internal/hello-handlers.js -> 返回响应
 */

// 简单的测试 API 端点
export default function handler(req, res) {
  console.log('Hello API route called with method:', req.method);
  
  res.status(200).json({
    message: 'Hello API 测试成功',
    time: new Date().toISOString(),
    method: req.method
  });
} 