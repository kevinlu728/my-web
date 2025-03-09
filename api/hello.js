// 简单的测试 API 端点
export default function handler(req, res) {
  console.log('Hello API route called with method:', req.method);
  
  res.status(200).json({
    message: 'Hello API 测试成功',
    time: new Date().toISOString(),
    method: req.method
  });
} 