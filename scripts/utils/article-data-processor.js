/**
 * @file article-data-processor.js
 * @description 文章数据处理工具
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-03-20
 */

import { extractTitleFromProperties, extractCategoryFromProperties } from './article-utils.js';
// 引入日志工具
import logger from './logger.js';

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
 * 提取文章内容中的重要元素
 * @param {Object} articleData 文章数据
 * @returns {Object} 提取的元素，包括标题等
 */
export function extractArticleElements(articleData) {
    if (!articleData) return { title: '无标题' };
    
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
        blocksCount: articleData.blocks?.length || 0,
        hasMore: articleData.hasMore || false,
        nextCursor: articleData.nextCursor || null
    };
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

/**
 * 按分类过滤文章
 * @param {Array} articles 文章列表
 * @param {string} category 分类名称
 * @returns {Array} 过滤后的文章
 */
export function filterArticlesByCategory(articles, category) {
    if (!articles || articles.length === 0) return [];
    if (category === 'all') return articles;
    
    return articles.filter(article => article.category === category);
}