// 静态文章数据API端点
module.exports = (req, res) => {
  console.log('Static articles API called');
  
  // 返回静态文章数据
  res.status(200).json({
    results: [
      {
        id: 'static-article-1',
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
        },
        created_time: new Date().toISOString(),
        last_edited_time: new Date().toISOString()
      },
      {
        id: 'static-article-2',
        properties: {
          Name: {
            title: [
              {
                plain_text: 'JavaScript基础知识'
              }
            ]
          },
          Category: {
            select: {
              name: '编程'
            }
          }
        },
        created_time: new Date().toISOString(),
        last_edited_time: new Date().toISOString()
      },
      {
        id: 'static-article-3',
        properties: {
          Name: {
            title: [
              {
                plain_text: 'CSS布局技巧'
              }
            ]
          },
          Category: {
            select: {
              name: '编程'
            }
          }
        },
        created_time: new Date().toISOString(),
        last_edited_time: new Date().toISOString()
      }
    ]
  });
}; 