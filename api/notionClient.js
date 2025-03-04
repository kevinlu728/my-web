// notionClient.js
const { Client } = require('@notionhq/client');

// 初始化 Notion 客户端
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

// 导出 Notion 客户端
module.exports = notion;