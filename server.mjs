import express from 'express';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

// 添加静态文件服务，将当前目录作为静态文件根目录
app.use(express.static(__dirname));

app.use(express.json());

// API 路由
app.post('/api/articles', async (req, res) => {
  try {
    console.log('Fetching articles from Notion database...');
    
    // 从请求中获取数据库 ID，如果没有提供，则使用默认值
    const databaseId = req.body.database_id || '1a932af826e680df8bf7f320b51930b9';
    console.log(`Using database ID: ${databaseId}`);
    
    // 根据最新的 Notion API 文档，确保使用正确的 API 版本和格式
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer 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`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({})
    });

    console.log(`Notion API response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Notion API error: ${response.status} ${response.statusText}`, errorText);
      
      // 检查是否是权限问题
      if (response.status === 404) {
        console.error('这可能是因为集成没有与数据库共享权限。请检查您的 Notion 集成设置。');
      } else if (response.status === 401) {
        console.error('这可能是因为 API 令牌无效或已过期。请检查您的 API 令牌。');
      } else if (response.status === 403) {
        console.error('这可能是因为集成没有足够的权限访问此数据库。请检查您的集成权限设置。');
      }
      
      try {
        const errorData = JSON.parse(errorText);
        return res.status(response.status).json({
          ...errorData,
          help: '如果是 404 错误，请确保您的集成已与数据库共享。在 Notion 中打开数据库，点击右上角的"共享"按钮，然后添加您的集成。'
        });
      } catch (e) {
        return res.status(response.status).send(errorText);
      }
    }

    const data = await response.json();
    console.log(`Received ${data.results ? data.results.length : 0} results from Notion API`);
    
    // 在后端对结果进行排序（如果需要）
    if (data.results && Array.isArray(data.results)) {
      data.results.sort((a, b) => {
        // 按创建时间排序（如果有）
        const timeA = a.created_time ? new Date(a.created_time) : new Date(0);
        const timeB = b.created_time ? new Date(b.created_time) : new Date(0);
        return timeB - timeA; // 降序排列
      });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ error: 'Error fetching articles', message: error.message });
  }
});

// 添加测试路由，用于验证 Notion API 连接
app.get('/api/notion-test', async (req, res) => {
  try {
    console.log('Testing Notion API connection...');
    
    // 使用 users/me 端点来测试API连接
    // 这个端点只需要验证API令牌是否有效，不需要任何特定的数据库或页面权限
    const response = await fetch('https://api.notion.com/v1/users/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer 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`,
        'Notion-Version': '2022-06-28'
      }
    });
    
    console.log(`Notion API test response status: ${response.status} ${response.statusText}`);
    console.log(`Response headers:`, Object.fromEntries([...response.headers.entries()]));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Notion API test error: ${response.status} ${response.statusText}`, errorText);
      
      // 尝试解析错误响应
      try {
        const errorJson = JSON.parse(errorText);
        console.error('Parsed error:', errorJson);
        
        return res.status(response.status).json({
          error: `API test failed with status ${response.status}`,
          details: errorJson
        });
      } catch (e) {
        return res.status(response.status).send(`API test failed: ${errorText}`);
      }
    }
    
    const data = await response.json();
    console.log('API test successful:', data);
    
    res.json({
      message: 'Notion API connection successful',
      user: data
    });
  } catch (error) {
    console.error('Error testing Notion API:', error);
    res.status(500).json({ 
      error: 'Error testing Notion API', 
      message: error.message,
      stack: error.stack
    });
  }
});

// 添加路由来获取数据库列表
app.get('/api/databases', async (req, res) => {
  try {
    console.log('Fetching Notion databases...');
    
    // 根据文档，使用 search 端点并过滤数据库对象
    const response = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer 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`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        filter: {
          value: 'database',
          property: 'object'
        }
      })
    });
    
    console.log(`Notion databases response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Notion databases error: ${response.status} ${response.statusText}`, errorText);
      return res.status(response.status).send(`Failed to fetch databases: ${errorText}`);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching databases:', error);
    res.status(500).json({ error: 'Error fetching databases', message: error.message });
  }
});

// 添加路由来获取数据库信息
app.get('/api/database-info', async (req, res) => {
  try {
    // 从查询参数中获取数据库 ID，如果没有提供，则使用默认值
    const databaseId = req.query.id || '1a932af826e680df8bf7f320b51930b9';
    console.log(`Fetching info for database ID: ${databaseId}`);
    
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer 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`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      }
    });
    
    console.log(`Database info response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Database info error: ${response.status} ${response.statusText}`, errorText);
      return res.status(response.status).send(`Failed to fetch database info: ${errorText}`);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching database info:', error);
    res.status(500).json({ error: 'Error fetching database info', message: error.message });
  }
});

// 添加新路由来获取 Notion 页面内容
app.get('/api/article-content/:pageId', async (req, res) => {
  try {
    const { pageId } = req.params;
    
    if (!pageId) {
      return res.status(400).send('Page ID is required');
    }
    
    console.log(`Fetching content for page ID: ${pageId}`);
    
    // 根据测试脚本的结果，直接使用原始页面ID，不需要特殊格式化
    // 首先获取页面本身的信息
    const pageResponse = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer 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`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      }
    });
    
    console.log(`Page info response status: ${pageResponse.status} ${pageResponse.statusText}`);
    
    if (!pageResponse.ok) {
      const errorText = await pageResponse.text();
      console.error(`Failed to fetch page: ${pageResponse.status} ${pageResponse.statusText}`, errorText);
      
      // 如果失败，返回模拟数据以便调试
      console.log('无法获取页面数据，返回模拟数据');
      return res.json({
        page: {
          id: pageId,
          properties: {
            Name: {
              title: [{ plain_text: "无法获取页面内容" }]
            }
          }
        },
        results: [
          {
            type: "paragraph",
            paragraph: {
              rich_text: [
                {
                  plain_text: "无法获取页面内容。可能的原因：1) 页面 ID 格式不正确；2) 集成没有权限访问此页面；3) 页面不存在。",
                  annotations: { bold: true }
                }
              ]
            }
          },
          {
            type: "paragraph",
            paragraph: {
              rich_text: [
                {
                  plain_text: "请确保您的集成已与此页面共享。在 Notion 中打开页面，点击右上角的\"共享\"按钮，然后添加您的集成。",
                  annotations: {}
                }
              ]
            }
          }
        ]
      });
    }
    
    const pageData = await pageResponse.json();
    console.log('Page data:', pageData);
    
    // 然后获取页面的内容块
    const blocksResponse = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer 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`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      }
    });
    
    console.log(`Blocks response status: ${blocksResponse.status} ${blocksResponse.statusText}`);
    
    let blocksData = { results: [] };
    
    if (!blocksResponse.ok) {
      const errorText = await blocksResponse.text();
      console.error(`Failed to fetch page content: ${blocksResponse.status} ${blocksResponse.statusText}`, errorText);
      console.log('Continuing with empty blocks data');
    } else {
      blocksData = await blocksResponse.json();
      console.log('Fetched page content:', blocksData.results ? blocksData.results.length : 'no results');
    }
    
    // 返回页面数据和块数据
    res.json({
      page: pageData,
      results: blocksData.results || []
    });
  } catch (error) {
    console.error('Error fetching article content:', error);
    res.status(500).send(`Error fetching article content: ${error.message}`);
  }
});

// 添加路由来处理首页请求
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 添加路由来处理技术博客页面请求
app.get('/tech-blog.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'tech-blog.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Visit http://localhost:${PORT} to view the website`);
});
