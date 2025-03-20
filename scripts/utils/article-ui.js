/**
 * @file article-ui.js
 * @description 文章UI操作相关工具函数
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-03-20
 */

import { formatDate, highlightSearchTerm } from './article-utils.js';
import { imageLazyLoader } from './image-lazy-loader.js';

/**
 * 渲染文章列表项
 * @param {Object} article 文章对象
 * @param {string} searchTerm 搜索词(用于高亮)
 * @param {string} currentArticleId 当前选中的文章ID
 * @returns {string} 文章列表项的HTML
 */
export function renderArticleListItem(article, searchTerm = '', currentArticleId = null) {
    // 提取标题
    const title = article.title || 'Untitled';
    
    // 提取分类
    const category = article.category || 'Uncategorized';
    
    // 提取日期
    let date = '';
    if (article.publish_date) {
        date = formatDate(article.publish_date);
    } else if (article.created_time) {
        date = formatDate(article.created_time);
    }
    
    // 只在搜索时高亮显示
    const highlightedTitle = searchTerm ? highlightSearchTerm(title, searchTerm) : title;
    
    // 检查是否是当前选中的文章
    const isActive = currentArticleId === article.id ? 'active' : '';
    
    return `
        <li class="article-item ${isActive}" data-category="${category}" data-article-id="${article.id}">
            <a href="#" onclick="showArticle('${article.id}'); return false;">
                <span class="article-title-text">${highlightedTitle}</span>
                ${date ? `<span class="article-date">${date}</span>` : ''}
            </a>
        </li>
    `;
}

/**
 * 渲染文章列表
 * @param {Array} articles 文章数组
 * @param {string} searchTerm 搜索词
 * @param {string} currentArticleId 当前显示的文章ID
 * @param {string} containerId 容器ID
 */
export function renderArticleList(articles, searchTerm = '', currentArticleId = null, containerId = 'article-list') {
    const articleList = document.getElementById(containerId);
    if (!articleList) return;

    // 如果没有文章，显示提示
    if (!articles || articles.length === 0) {
        articleList.innerHTML = '<li class="no-results">暂无文章</li>';
        return;
    }
    
    // 渲染文章列表
    articleList.innerHTML = articles.map(article => 
        renderArticleListItem(article, searchTerm, currentArticleId)
    ).join('');
}

/**
 * 过滤文章列表显示
 * @param {string} category 分类名称
 * @param {string} listContainerId 列表容器ID
 * @returns {number} 可见文章数量
 */
export function filterArticleListByCategory(category, listContainerId = 'article-list') {
    console.log(`过滤文章列表，分类: ${category}`);
    const articleList = document.getElementById(listContainerId);
    if (!articleList) {
        console.warn('文章列表元素不存在');
        return 0;
    }

    const articles = Array.from(articleList.children);
    console.log(`文章列表中有 ${articles.length} 篇文章`);
    
    let visibleCount = 0;
    articles.forEach(article => {
        if (article.classList.contains('loading') || article.classList.contains('no-results')) {
            console.log('跳过特殊元素:', article.className);
            return;
        }
        
        const articleCategory = article.dataset.category;
        const shouldShow = category === 'all' || articleCategory === category;
        
        if (shouldShow) {
            article.style.display = '';
            visibleCount++;
        } else {
            article.style.display = 'none';
        }
    });
    
    console.log(`过滤后显示 ${visibleCount} 篇文章`);
    
    // 如果没有可见的文章，显示提示
    if (visibleCount === 0 && articles.length > 0) {
        const noResultsElement = document.createElement('li');
        noResultsElement.className = 'no-results';
        noResultsElement.textContent = `没有 "${category}" 分类的文章`;
        articleList.appendChild(noResultsElement);
    }
    
    return visibleCount;
}

/**
 * 显示加载状态
 * @param {string} containerId 容器ID
 */
export function showArticleLoadingState(containerId = 'article-container') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <div class="article-loading">
            <div class="loading-content">
                <div class="loading-skeleton">
                    <div class="skeleton-title"></div>
                    <div class="skeleton-meta"></div>
                    <div class="skeleton-paragraph">
                        <div class="skeleton-line"></div>
                        <div class="skeleton-line"></div>
                        <div class="skeleton-line"></div>
                        <div class="skeleton-line" style="width: 80%"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * 显示文章内容
 * @param {Object} articleData 文章数据
 * @param {Function} renderBlocks 渲染文章块的函数
 * @param {string} containerId 容器ID
 * @param {boolean} hasMore 是否有更多内容
 */
export function displayArticleContent(articleData, renderBlocks, containerId = 'article-container', hasMore = false) {
    const articleContainer = document.getElementById(containerId);
    if (!articleContainer) return;
    
    // 提取标题和块
    const { title, blocks } = extractArticleData(articleData);
    
    // 渲染文章内容
    const contentHtml = blocks && blocks.length > 0 ? 
        renderBlocks(blocks) : 
        '<p>该文章暂无内容</p>';
    
    // 更新DOM
    articleContainer.innerHTML = `
        <h1 class="article-title">${title}</h1>
        <div class="article-body" data-article-id="${articleData.page?.id || ''}">
            ${contentHtml}
        </div>
        ${hasMore ? '<div class="load-more-container"><div class="loading-spinner"></div></div>' : ''}
    `;

    // 处理文章中的图片和其他内容
    const articleBody = articleContainer.querySelector('.article-body');
    if (articleBody) {
        imageLazyLoader.processImages(articleBody);
    }
    
    return articleBody;
}

/**
 * 从文章数据中提取必要的元素
 * @param {Object} articleData 文章数据
 * @returns {Object} 提取的数据
 */
function extractArticleData(articleData) {
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
 * 更新文章选中状态
 * @param {string} pageId 文章ID
 */
export function updateActiveArticle(pageId) {
    // 移除所有文章的选中状态
    document.querySelectorAll('.article-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // 添加新的选中状态
    const activeArticle = document.querySelector(`.article-item[data-article-id="${pageId}"]`);
    if (activeArticle) {
        activeArticle.classList.add('active');
    }
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
        loadMoreContainer.innerHTML = '<div class="loading-spinner"></div>';
    } else {
        loadMoreContainer.innerHTML = '<div class="no-more">没有更多内容</div>';
    }
} 