/**
 * @file hello.js
 * @description 简单的测试API端点，用于验证服务器是否正常运行
 * @author 陆凯
 * @created 2024-03-09
 * @updated 2024-03-10
 */

// 简单的测试 API 端点
module.exports = (req, res) => {
  console.log('Hello API route called with method:', req.method);
  
  res.status(200).json({
    message: 'Hello API 测试成功',
    time: new Date().toISOString(),
    method: req.method
  });
} 