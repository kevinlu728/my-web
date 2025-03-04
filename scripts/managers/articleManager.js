// 文章管理模块
import { showStatus, showLoading, showError } from '../utils/utils.js';
import { getArticles, getArticleContent } from '../services/notionService.js';
import { renderNotionBlocks } from '../components/notionRenderer.js';

// 存储文章数据
let articlesData = [];

// 加载文章列表
export async function loadArticles(databaseId) {
    try {
        const articlesList = document.getElementById('article-list');
        showLoading(articlesList, '正在加载文章列表...');
        
        const articles = await getArticles(databaseId);
        console.log('Articles:', articles); // 调试输出
        articlesData = articles; // 存储文章数据
        
        // 清空加载提示
        articlesList.innerHTML = '';
        
        if (articles.length === 0) {
            articlesList.innerHTML = '<li>暂无文章</li>';
            return;
        }
        
        // 添加文章列表
        articles.forEach((article, index) => {
            const listItem = document.createElement('li');
            listItem.className = 'article-list-item';
            listItem.textContent = article.title || '无标题';
            listItem.onclick = () => showArticle(index);
            articlesList.appendChild(listItem);
        });
        
        // 默认显示第一篇文章
        if (articles.length > 0) {
            showArticle(0);
        }
    } catch (error) {
        console.error('Error loading articles:', error);
        const articlesList = document.getElementById('article-list');
        articlesList.innerHTML = `<li>加载文章失败: ${error.message}</li>`;
        showStatus(`加载文章失败: ${error.message}`, true);
    }
}

// 显示文章内容
async function showArticle(index) {
    try {
        // 高亮选中的文章
        const listItems = document.querySelectorAll('.article-list-item');
        listItems.forEach(item => item.classList.remove('active'));
        if (listItems[index]) {
            listItems[index].classList.add('active');
        }
        
        const article = articlesData[index];
        if (!article) return;
        
        const container = document.getElementById('article-container');
        showLoading(container, '正在加载文章内容...');
        
        console.log(`Loading content for article: ${article.title}, ID: ${article.id}`); // 调试输出
        
        // 获取文章内容
        const data = await getArticleContent(article.id);
        console.log('Article content:', data); // 调试输出
        
        // 从页面数据中提取标题和属性
        let title = article.title;
        let properties = {};
        
        if (data.page && data.page.properties) {
            properties = data.page.properties;
            
            // 尝试从页面属性中获取标题
            if (properties.Name && properties.Name.title && properties.Name.title.length > 0) {
                title = properties.Name.title[0].plain_text || title;
            }
        }
        
        // 渲染文章内容
        let articleContent = renderNotionBlocks(data.results || []);
        
        // 如果没有内容，提供一个链接
        if (!articleContent || articleContent.trim() === '') {
            articleContent = `
                <p>无法直接显示文章内容。</p>
                <p><a href="${article.url}" target="_blank">点击这里在 Notion 中查看文章</a></p>
            `;
        }
        
        container.innerHTML = `
            <h2 class="article-title">${title}</h2>
            <div class="article-body">
                ${articleContent}
            </div>
        `;
        
        // 清空状态消息
        document.getElementById('status-message').textContent = '';
        
    } catch (error) {
        console.error('Error showing article:', error);
        const container = document.getElementById('article-container');
        const article = articlesData[index];
        
        showError(
            container,
            article.title,
            `加载文章内容时出错: ${error.message}`,
            article.url
        );
        
        showStatus(`加载文章内容失败: ${error.message}`, true);
    }
} 