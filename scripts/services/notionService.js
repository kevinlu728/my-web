// Notion API 服务
// 处理与 Notion API 的所有交互

// 获取文章列表
export async function getArticles(databaseId) {
  try {
    console.log(`Fetching articles from Notion API for database: ${databaseId}`);
    
    // 发送请求到服务器端 API
    const response = await fetch('/api/articles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ database_id: databaseId })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API request failed: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('API Response: ', data);
    
    // 检查数据结构
    if (!data.results || !Array.isArray(data.results)) {
      console.error('Invalid API response format:', data);
      throw new Error('Invalid API response format');
    }
    
    // 处理每个页面，提取所需信息
    const articles = [];
    
    for (const page of data.results) {
      console.log('Processing page: ', page);
      
      // 确保页面有 ID
      if (!page.id) {
        console.error('Page missing ID:', page);
        continue;
      }
      
      // 提取标题
      let title = 'Untitled';
      
      // 尝试从 properties 中获取标题
      if (page.properties) {
        // 尝试从 Name 或 Title 属性中获取标题
        const titleProperty = page.properties.Name || page.properties.Title || page.properties.title;
        
        if (titleProperty && titleProperty.title && Array.isArray(titleProperty.title) && titleProperty.title.length > 0) {
          title = titleProperty.title[0].plain_text || title;
        }
      }
      
      // 提取 URL
      let url = '';
      if (page.url) {
        url = page.url;
      } else if (page.public_url) {
        url = page.public_url;
      }
      
      // 使用原始 ID，不做任何修改
      const pageId = page.id;
      
      articles.push({
        id: pageId,
        title: title,
        url: url,
        created_time: page.created_time,
        last_edited_time: page.last_edited_time
      });
    }
    
    console.log(`Processed ${articles.length} articles`);
    console.log('Articles: ', articles);
    
    return articles;
  } catch (error) {
    console.error('Error fetching articles:', error);
    throw error;
  }
}

// 获取文章内容
export async function getArticleContent(pageId) {
  try {
    const response = await fetch(`/api/article-content/${pageId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to fetch article content: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Failed to fetch article content with status ${response.status}: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching article content:', error);
    throw error;
  }
}

// 获取数据库信息
export async function getDatabaseInfo(databaseId) {
  try {
    console.log(`Fetching database info for database: ${databaseId}`);
    
    const response = await fetch('/api/articles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        database_id: databaseId,
        type: 'database_info'  // 添加类型标识，让后端知道这是获取数据库信息的请求
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to fetch database info: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Failed to fetch database info with status ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Database info response:', data);
    return data;
  } catch (error) {
    console.error('Error fetching database info:', error);
    throw error;
  }
}

// 测试 API 连接
export async function testApiConnection() {
  try {
    const response = await fetch('/api/notion-test');
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API test failed: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`API test failed with status ${response.status}: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error testing API connection:', error);
    throw error;
  }
}

// 获取数据库列表
export async function getDatabases() {
  try {
    const response = await fetch('/api/databases');
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to list databases: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Failed to list databases with status ${response.status}: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error listing databases:', error);
    throw error;
  }
} 