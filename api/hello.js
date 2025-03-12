/**
 * @file hello.js
 * @description 简单的测试API端点
 * @author 陆凯
 * @created 2024-03-09
 * @updated 2024-03-10
 */

module.exports = function handler(req, res) {
  res.status(200).json({
    message: 'Hello API 测试成功',
    time: new Date().toISOString(),
    method: req.method,
    environment: process.env.NODE_ENV || 'development',
    vercel: true
  });
} 