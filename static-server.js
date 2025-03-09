// 简单的静态文件服务器
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// 启用 CORS
app.use(cors());

// 提供静态文件
app.use(express.static(__dirname, {
  setHeaders: (res, filePath) => {
    if (path.extname(filePath) === '.css') {
      res.setHeader('Content-Type', 'text/css');
    }
    if (path.extname(filePath) === '.js') {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// 特别为 styles 目录添加静态文件服务
app.use('/styles', express.static(path.join(__dirname, 'styles'), {
  setHeaders: (res, filePath) => {
    if (path.extname(filePath) === '.css') {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

// 特别为 scripts 目录添加静态文件服务
app.use('/scripts', express.static(path.join(__dirname, 'scripts'), {
  setHeaders: (res, filePath) => {
    if (path.extname(filePath) === '.js') {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// 路由处理
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/tech-blog.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'tech-blog.html'));
});

// 启动服务器
app.listen(port, () => {
  console.log(`静态服务器运行在 http://localhost:${port}`);
  console.log(`技术博客页面: http://localhost:${port}/tech-blog.html`);
}); 