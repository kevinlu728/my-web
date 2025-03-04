import fetch from 'node-fetch';

// Notion API 令牌
const NOTION_TOKEN = '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';
// 数据库 ID
const DATABASE_ID = '1a932af826e680df8bf7f320b51930b9';
// 页面 ID (从您的控制台输出中获取)
const PAGE_ID = '1a932af8-26e6-80d7-ae44-f8dcea6e7b31';

// 测试 Notion API 的用户信息端点
async function testUserInfo() {
  console.log('\n===== 测试用户信息端点 =====');
  try {
    console.log('请求 /v1/users/me...');
    
    const response = await fetch('https://api.notion.com/v1/users/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28'
      }
    });
    
    console.log(`响应状态: ${response.status} ${response.statusText}`);
    console.log('响应头:', Object.fromEntries([...response.headers.entries()]));
    
    const text = await response.text();
    console.log('响应体:', text);
    
    try {
      const data = JSON.parse(text);
      console.log('解析后的JSON数据:', JSON.stringify(data, null, 2));
    } catch (e) {
      console.log('响应不是有效的JSON格式');
    }
    
    return response.ok;
  } catch (error) {
    console.error('请求失败:', error.message);
    return false;
  }
}

// 测试 Notion API 的数据库查询端点
async function testDatabaseQuery() {
  console.log('\n===== 测试数据库查询端点 =====');
  try {
    console.log(`请求 /v1/databases/${DATABASE_ID}/query...`);
    
    const response = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({})
    });
    
    console.log(`响应状态: ${response.status} ${response.statusText}`);
    console.log('响应头:', Object.fromEntries([...response.headers.entries()]));
    
    const text = await response.text();
    console.log('响应体 (前200字符):', text.substring(0, 200) + (text.length > 200 ? '...' : ''));
    
    try {
      const data = JSON.parse(text);
      if (data.results && data.results.length > 0) {
        console.log(`成功获取 ${data.results.length} 条结果`);
        console.log('第一条结果:', JSON.stringify(data.results[0], null, 2));
      } else {
        console.log('查询成功但没有结果');
      }
    } catch (e) {
      console.log('响应不是有效的JSON格式');
    }
    
    return response.ok;
  } catch (error) {
    console.error('请求失败:', error.message);
    return false;
  }
}

// 测试 Notion API 的页面获取端点
async function testPageRetrieval() {
  console.log('\n===== 测试页面获取端点 =====');
  try {
    console.log(`请求 /v1/pages/${PAGE_ID}...`);
    
    const response = await fetch(`https://api.notion.com/v1/pages/${PAGE_ID}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28'
      }
    });
    
    console.log(`响应状态: ${response.status} ${response.statusText}`);
    console.log('响应头:', Object.fromEntries([...response.headers.entries()]));
    
    const text = await response.text();
    console.log('响应体 (前200字符):', text.substring(0, 200) + (text.length > 200 ? '...' : ''));
    
    try {
      const data = JSON.parse(text);
      console.log('页面ID:', data.id);
      console.log('页面URL:', data.url);
    } catch (e) {
      console.log('响应不是有效的JSON格式');
    }
    
    return response.ok;
  } catch (error) {
    console.error('请求失败:', error.message);
    return false;
  }
}

// 测试 Notion API 的页面内容获取端点
async function testPageContent() {
  console.log('\n===== 测试页面内容获取端点 =====');
  try {
    console.log(`请求 /v1/blocks/${PAGE_ID}/children...`);
    
    const response = await fetch(`https://api.notion.com/v1/blocks/${PAGE_ID}/children?page_size=100`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28'
      }
    });
    
    console.log(`响应状态: ${response.status} ${response.statusText}`);
    console.log('响应头:', Object.fromEntries([...response.headers.entries()]));
    
    const text = await response.text();
    console.log('响应体 (前200字符):', text.substring(0, 200) + (text.length > 200 ? '...' : ''));
    
    try {
      const data = JSON.parse(text);
      if (data.results && data.results.length > 0) {
        console.log(`成功获取 ${data.results.length} 个内容块`);
        console.log('第一个内容块:', JSON.stringify(data.results[0], null, 2));
      } else {
        console.log('获取成功但没有内容块');
      }
    } catch (e) {
      console.log('响应不是有效的JSON格式');
    }
    
    return response.ok;
  } catch (error) {
    console.error('请求失败:', error.message);
    return false;
  }
}

// 测试 Notion API 的数据库列表端点
async function testDatabaseList() {
  console.log('\n===== 测试数据库列表端点 =====');
  try {
    console.log('请求 /v1/search (过滤数据库)...');
    
    const response = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
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
    
    console.log(`响应状态: ${response.status} ${response.statusText}`);
    console.log('响应头:', Object.fromEntries([...response.headers.entries()]));
    
    const text = await response.text();
    console.log('响应体 (前200字符):', text.substring(0, 200) + (text.length > 200 ? '...' : ''));
    
    try {
      const data = JSON.parse(text);
      if (data.results && data.results.length > 0) {
        console.log(`成功获取 ${data.results.length} 个数据库`);
        console.log('数据库列表:');
        data.results.forEach((db, index) => {
          console.log(`  ${index + 1}. ID: ${db.id}, 标题: ${db.title?.[0]?.plain_text || '无标题'}`);
        });
      } else {
        console.log('获取成功但没有数据库');
      }
    } catch (e) {
      console.log('响应不是有效的JSON格式');
    }
    
    return response.ok;
  } catch (error) {
    console.error('请求失败:', error.message);
    return false;
  }
}

// 测试 Notion API 的不同版本
async function testApiVersions() {
  console.log('\n===== 测试不同的 API 版本 =====');
  const versions = ['2022-06-28', '2022-02-22', '2021-08-16'];
  
  for (const version of versions) {
    try {
      console.log(`\n测试 API 版本: ${version}`);
      console.log(`请求 /v1/databases/${DATABASE_ID}...`);
      
      const response = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Notion-Version': version
        }
      });
      
      console.log(`响应状态: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        console.log(`✅ API 版本 ${version} 工作正常`);
      } else {
        console.log(`❌ API 版本 ${version} 返回错误`);
      }
    } catch (error) {
      console.error(`测试 API 版本 ${version} 失败:`, error.message);
    }
  }
}

// 测试不同格式的页面 ID
async function testPageIdFormats() {
  console.log('\n===== 测试不同格式的页面 ID =====');
  
  // 原始格式和带连字符格式
  const pageIdFormats = [
    PAGE_ID,
    PAGE_ID.replace(/-/g, '')
  ];
  
  for (const id of pageIdFormats) {
    try {
      console.log(`\n测试页面 ID 格式: ${id}`);
      console.log(`请求 /v1/pages/${id}...`);
      
      const response = await fetch(`https://api.notion.com/v1/pages/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Notion-Version': '2022-06-28'
        }
      });
      
      console.log(`响应状态: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        console.log(`✅ 页面 ID 格式 ${id} 工作正常`);
      } else {
        console.log(`❌ 页面 ID 格式 ${id} 返回错误`);
      }
    } catch (error) {
      console.error(`测试页面 ID 格式 ${id} 失败:`, error.message);
    }
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('======= Notion API 诊断工具 =======');
  console.log('开始测试 Notion API 连接...');
  console.log('API 令牌:', NOTION_TOKEN.substring(0, 5) + '...' + NOTION_TOKEN.substring(NOTION_TOKEN.length - 5));
  console.log('数据库 ID:', DATABASE_ID);
  console.log('页面 ID:', PAGE_ID);
  
  let results = {
    userInfo: await testUserInfo(),
    databaseQuery: await testDatabaseQuery(),
    pageRetrieval: await testPageRetrieval(),
    pageContent: await testPageContent(),
    databaseList: await testDatabaseList()
  };
  
  // 测试不同的 API 版本
  await testApiVersions();
  
  // 测试不同格式的页面 ID
  await testPageIdFormats();
  
  console.log('\n======= 测试结果摘要 =======');
  console.log('用户信息端点:', results.userInfo ? '✅ 成功' : '❌ 失败');
  console.log('数据库查询端点:', results.databaseQuery ? '✅ 成功' : '❌ 失败');
  console.log('页面获取端点:', results.pageRetrieval ? '✅ 成功' : '❌ 失败');
  console.log('页面内容获取端点:', results.pageContent ? '✅ 成功' : '❌ 失败');
  console.log('数据库列表端点:', results.databaseList ? '✅ 成功' : '❌ 失败');
  
  console.log('\n======= 诊断建议 =======');
  if (!results.userInfo) {
    console.log('❌ API 令牌可能无效或已过期。请检查您的 API 令牌。');
  } else if (!results.databaseQuery) {
    console.log('❌ 您的集成可能没有权限访问指定的数据库。请确保您已将集成与数据库共享。');
  } else if (!results.pageRetrieval || !results.pageContent) {
    console.log('❌ 您的集成可能没有权限访问指定的页面，或页面 ID 格式不正确。请确保您已将集成与页面共享。');
  } else {
    console.log('✅ 所有测试都通过了！如果您仍然遇到问题，可能是前端代码中的问题。');
  }
  
  console.log('\n如需更多帮助，请访问 Notion API 文档: https://developers.notion.com/');
}

// 执行测试
runAllTests().catch(error => {
  console.error('测试过程中发生错误:', error);
}); 