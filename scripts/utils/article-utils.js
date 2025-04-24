/**
 * @file article-utils.js
 * @description 文章相关工具函数
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-03-20
 */

import logger from './logger.js';

// 验证文章ID
export function validateArticleId(pageId) {
    if (!pageId || pageId === 'undefined' || pageId === 'null') {
        logger.error('无效的文章ID:', pageId);
        return false;
    }
    return true;
}

/**
 * 在文本中高亮显示搜索词
 * @param {string} text 原始文本
 * @param {string} searchTerm 要高亮的搜索词
 * @returns {string} 包含高亮HTML的文本
 */
export function highlightSearchTerm(text, searchTerm) {
    if (!searchTerm || !text) return text;
    
    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    return text.replace(regex, match => `<span class="search-highlight">${match}</span>`);
}

/**
 * 从Notion属性中提取标题
 * @param {Object} properties Notion页面属性对象
 * @returns {string} 提取的标题或默认值
 */
export function extractTitleFromProperties(properties) {
    if (!properties) return 'Untitled';
    
    // 尝试从 Name 或 Title 属性中获取标题
    const titleProperty = properties.Name || properties.Title;
    
    if (titleProperty && titleProperty.title && Array.isArray(titleProperty.title) && titleProperty.title.length > 0) {
        return titleProperty.title.map(t => t.plain_text || '').join('');
    }
    
    return 'Untitled';
}

/**
 * 从Notion属性中提取分类
 * @param {Object} properties Notion页面属性对象
 * @returns {string} 提取的分类或默认值
 */
export function extractCategoryFromProperties(properties) {
    if (!properties || !properties.Category) return 'Uncategorized';
    
    const categoryProp = properties.Category;
    
    if (categoryProp.select && categoryProp.select.name) {
        return categoryProp.select.name;
    } else if (categoryProp.multi_select && Array.isArray(categoryProp.multi_select) && categoryProp.multi_select.length > 0) {
        return categoryProp.multi_select.map(c => c.name).join(', ');
    }
    
    return 'Uncategorized';
}

/**
 * 从文章数据中提取必要的元素
 * @param {Object} articleData 文章数据
 * @returns {Object} 提取的数据
 */
export function extractArticleData(articleData) {
    if (!articleData) {
        return { title: '无标题', blocks: [] };
    }
    
    // 提取标题
    let title = '无标题';
    if (articleData.page && articleData.page.properties) {
        const titleProp = articleData.page.properties.Title || articleData.page.properties.Name;
        if (titleProp && titleProp.title && titleProp.title.length > 0) {
            title = titleProp.title[0].plain_text;
        }
    }
    
    return {
        title,
        blocks: articleData.blocks || []
    };
}

/**
 * 显示错误消息
 * @param {string} message 错误消息
 * @param {string} containerId 容器ID
 * @param {string} pageId 文章ID(用于重试按钮)
 */
export function showArticleError(message, containerId = 'article-container', pageId = null) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <h1 class="article-title">加载失败</h1>
        <div class="article-body">
            <p>文章加载失败: ${message}</p>
            ${pageId ? `<p><button onclick="showArticle('${pageId}')">重试</button></p>` : ''}
        </div>
    `;
}

/**
 * 显示加载更多状态
 * @param {boolean} isLoading 是否正在加载
 * @param {boolean} hasMore 是否有更多内容
 * @param {string} errorMessage 错误消息(如果有)
 */
export function updateLoadMoreStatus(isLoading, hasMore, errorMessage = null) {
    const loadMoreContainer = document.querySelector('.load-more-container');
    if (!loadMoreContainer) return;
    
    if (errorMessage) {
        loadMoreContainer.innerHTML = `
            <div class="error">
                ${errorMessage}，<a href="#" onclick="articleManager.loadMoreContent(); return false;">点击重试</a>
            </div>
        `;
    } else if (isLoading) {
        loadMoreContainer.innerHTML = '<div class="loading-spinner"></div><div class="loading-text">加载中...</div>';
    } else if (hasMore) {
        loadMoreContainer.innerHTML = '<div class="loading-text">下拉加载更多</div>';
    } else {
        loadMoreContainer.innerHTML = '<div class="no-more">没有更多内容</div>';
    }
}

/********以下是文章和文章列表的数据处理相关工具函数 ******/
/**
 * 处理文章列表数据，转换为应用需要的格式
 * @param {Array} articles 从API获取的原始文章数据
 * @returns {Array} 处理后的文章数据
 */
export function processArticleListData(articles) {
    if (!articles || !Array.isArray(articles)) {
        logger.error('无效的文章数据:', articles);
        return [];
    }
    
    logger.info('处理文章数据...');
    const processedArticles = [];
    
    for (const page of articles) {
        try {
            // 确保页面有 ID
            if (!page.id) {
                logger.error('文章缺少ID:', page);
                continue;
            }
            
            // 提取标题
            const title = extractTitleFromProperties(page.properties);
            
            // 提取 URL
            let url = '';
            if (page.url) {
                url = page.url;
            } else if (page.public_url) {
                url = page.public_url;
            }
            
            // 使用原始 ID
            const pageId = page.id;
            
            // 提取分类
            const category = extractCategoryFromProperties(page.properties);
            
            // 提取发布时间
            let publishDate = null;
            if (page.properties && page.properties['Publish Date'] && page.properties['Publish Date'].date) {
                publishDate = page.properties['Publish Date'].date.start;
            }
            
            // 构建文章对象
            const article = {
                id: pageId,
                title: title,
                url: url,
                created_time: page.created_time,
                last_edited_time: page.last_edited_time,
                publish_date: publishDate,
                category: category,
                properties: page.properties, // 保留原始属性以备后用
                originalPage: page // 保留原始页面数据
            };
            
            processedArticles.push(article);
        } catch (error) {
            logger.error('处理文章数据时出错:', error, page);
        }
    }
    
    // 按发布时间排序，没有发布时间的排在最后
    processedArticles.sort((a, b) => {
        // 如果两篇文章都有发布时间，按发布时间降序排序
        if (a.publish_date && b.publish_date) {
            return new Date(b.publish_date) - new Date(a.publish_date);
        }
        // 如果只有 a 有发布时间，a 排在前面
        if (a.publish_date) return -1;
        // 如果只有 b 有发布时间，b 排在前面
        if (b.publish_date) return 1;
        // 如果都没有发布时间，按创建时间降序排序
        return new Date(b.created_time) - new Date(a.created_time);
    });
    
    logger.info(`处理完成，共 ${processedArticles.length} 篇文章`);
    return processedArticles;
}

/**
 * 搜索文章
 * @param {Array} articles 文章列表
 * @param {string} searchTerm 搜索词
 * @returns {Array} 匹配的文章
 */
export function searchArticles(articles, searchTerm) {
    if (!searchTerm || !articles || articles.length === 0) return articles;

    const term = searchTerm.toLowerCase();
    logger.info(`搜索文章，关键词: "${term}"`);

    return articles.filter(article => {
        // 搜索标题匹配
        const titleMatch = article.title?.toLowerCase().includes(term);
        
        // 搜索分类匹配
        const categoryMatch = article.category?.toLowerCase().includes(term);
        
        return titleMatch || categoryMatch;
    });
}