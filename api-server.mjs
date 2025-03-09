// 简单的 Express API 服务器 (ESM 版本)
import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3001;

// 基础配置
const config = {
  notion: {
    apiKey: process.env.NOTION_API_KEY || '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',
    defaultDatabaseId: process.env.NOTION_DATABASE_ID || '1a932af826e680df8bf7f320b51930b9',
    headers: {
      'Authorization': `Bearer ${process.env.NOTION_API_KEY || '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'}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    }
  }
};

// 配置 CORS
app.use(cors({
  origin: '*',  // 允许所有来源
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
}));

// 解析 JSON 请求体
app.use(express.json());

// 日志中间件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// 测试端点
app.get('/api/hello', (req, res) => {
  res.json({
    message: 'Hello API 测试成功',
    time: new Date().toISOString(),
    method: req.method
  });
});

// 查询数据库
async function queryDatabase(databaseId = config.notion.defaultDatabaseId) {
  try {
    console.log(`Querying Notion database: ${databaseId}`);
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: config.notion.headers,
      body: JSON.stringify({})
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Notion API error: ${response.status}`, errorText);
      throw new Error(`请求失败: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error in queryDatabase:', error);
    throw error;
  }
}

// 文章列表端点
app.post('/api/articles', async (req, res) => {
  try {
    console.log('Request body:', req.body);
    const databaseId = req.body?.database_id || config.notion.defaultDatabaseId;
    console.log('Using database ID:', databaseId);
    
    const data = await queryDatabase(databaseId);
    console.log('Notion API response received');
    
    if (data.results?.length > 0) {
      console.log(`Found ${data.results.length} articles`);
      data.results.sort((a, b) => {
        const timeA = new Date(a.created_time || 0);
        const timeB = new Date(b.created_time || 0);
        return timeB - timeA;
      });
    } else {
      console.log('No articles found in response');
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(error.message.includes('超时') ? 504 : 500).json({ 
      error: 'Failed to fetch articles', 
      message: error.message 
    });
  }
});

// 获取文章内容端点
app.get('/api/article-content/:pageId', async (req, res) => {
  try {
    const { pageId } = req.params;
    const pageSize = parseInt(req.query.page_size) || 10;
    const cursor = req.query.cursor;

    console.log(`Fetching article content for page ${pageId}`);
    
    // 获取页面数据
    const pageResponse = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: 'GET',
      headers: config.notion.headers
    });

    if (!pageResponse.ok) {
      throw new Error(`Failed to fetch page: ${pageResponse.status}`);
    }

    const pageData = await pageResponse.json();
    
    // 获取块数据
    const blocksResponse = await fetch(
      `https://api.notion.com/v1/blocks/${pageId}/children?page_size=${pageSize}${cursor ? `&start_cursor=${cursor}` : ''}`,
      {
        method: 'GET',
        headers: config.notion.headers
      }
    );

    if (!blocksResponse.ok) {
      throw new Error(`Failed to fetch blocks: ${blocksResponse.status}`);
    }

    const blocksData = await blocksResponse.json();
    
    res.json({
      page: pageData,
      blocks: blocksData.results,
      hasMore: blocksData.has_more,
      nextCursor: blocksData.next_cursor
    });
  } catch (error) {
    console.error('Error fetching article content:', error);
    res.status(500).json({ 
      error: 'Error fetching article content', 
      message: error.message 
    });
  }
});

// 获取块的子块数据
app.get('/api/blocks/:blockId/children', async (req, res) => {
  try {
    const { blockId } = req.params;
    console.log(`获取块的子块数据，块ID: ${blockId}`);
    
    // 设置请求头
    const headers = {
      'Authorization': `Bearer ${process.env.NOTION_API_KEY || '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'}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    };
    
    // 发送请求到 Notion API
    const response = await fetch(`https://api.notion.com/v1/blocks/${blockId}/children?page_size=100`, {
      method: 'GET',
      headers: headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`获取块的子块数据失败: ${response.status}`, errorText);
      throw new Error(`获取块的子块数据失败: ${response.status}`);
    }

    const data = await response.json();
    console.log(`成功获取块的子块数据，共 ${data.results?.length || 0} 个子块`);
    
    res.json(data);
  } catch (error) {
    console.error('获取块的子块数据失败:', error);
    res.status(500).json({ 
      error: '获取块的子块数据失败', 
      message: error.message 
    });
  }
});

// 获取数据库信息
app.post('/api/database-info', async (req, res) => {
  try {
    const { database_id } = req.body;
    
    if (!database_id) {
      return res.status(400).json({ error: '缺少数据库ID' });
    }
    
    console.log(`获取数据库信息，数据库ID: ${database_id}`);
    
    // 设置请求头
    const headers = {
      'Authorization': `Bearer ${process.env.NOTION_API_KEY || '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'}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    };
    
    // 发送请求到 Notion API
    const response = await fetch(`https://api.notion.com/v1/databases/${database_id}`, {
      method: 'GET',
      headers: headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`获取数据库信息失败: ${response.status}`, errorText);
      throw new Error(`获取数据库信息失败: ${response.status}`);
    }

    const data = await response.json();
    console.log(`成功获取数据库信息: ${database_id}`);
    
    res.json(data);
  } catch (error) {
    console.error('获取数据库信息失败:', error);
    res.status(500).json({ 
      error: '获取数据库信息失败', 
      message: error.message 
    });
  }
});

// 获取所有数据库列表
app.get('/api/databases', async (req, res) => {
  try {
    console.log('获取所有数据库列表');
    
    // 设置请求头
    const headers = {
      'Authorization': `Bearer ${process.env.NOTION_API_KEY || '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'}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    };
    
    // 发送请求到 Notion API
    const response = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        filter: {
          value: 'database',
          property: 'object'
        },
        page_size: 100
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`获取数据库列表失败: ${response.status}`, errorText);
      throw new Error(`获取数据库列表失败: ${response.status}`);
    }

    const data = await response.json();
    console.log(`成功获取数据库列表，共 ${data.results?.length || 0} 个数据库`);
    
    res.json(data);
  } catch (error) {
    console.error('获取数据库列表失败:', error);
    res.status(500).json({ 
      error: '获取数据库列表失败', 
      message: error.message 
    });
  }
});

// 启动服务器
app.listen(port, () => {
  console.log(`API 服务器运行在 http://localhost:${port}`);
  console.log(`测试端点: http://localhost:${port}/api/hello`);
}); 