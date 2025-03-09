// 静态文章内容API端点
module.exports = (req, res) => {
  console.log('Static article content API called');
  const { id } = req.query;
  
  console.log(`Requested article ID: ${id}`);
  
  // 返回静态文章内容
  res.status(200).json({
    page: {
      id: id || 'static-article-1',
      properties: {
        Name: {
          title: [
            {
              plain_text: '欢迎使用云栖思渊博客'
            }
          ]
        },
        Category: {
          select: {
            name: '公告'
          }
        }
      }
    },
    blocks: [
      {
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: '欢迎来到云栖思渊博客！这是一个用于分享技术学习和思考的平台。'
              }
            }
          ]
        }
      },
      {
        type: 'heading_2',
        heading_2: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: '关于本站'
              }
            }
          ]
        }
      },
      {
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: '本站使用HTML、CSS和JavaScript构建，数据存储在Notion数据库中。'
              }
            }
          ]
        }
      }
    ],
    hasMore: false,
    nextCursor: null
  });
}; 