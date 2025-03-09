// 简单的测试API端点
module.exports = (req, res) => {
  console.log('Test API route called');
  
  res.status(200).json({
    message: 'API测试成功',
    time: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      NOTION_API_KEY_EXISTS: Boolean(process.env.NOTION_API_KEY),
      NOTION_DATABASE_ID_EXISTS: Boolean(process.env.NOTION_DATABASE_ID)
    }
  });
}; 