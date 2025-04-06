/**
 * @file welcomePageRenderer.js
 * @description 欢迎页面渲染组件
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-03-20
 */

import { formatDate } from '../utils/article-utils.js';
import logger from '../utils/logger.js';

/**
 * 渲染欢迎页面
 * @param {Object} options 选项
 * @param {Array} options.articles 文章列表
 * @param {Function} options.onCategorySelect 分类选择回调
 * @param {Function} options.onArticleSelect 文章选择回调
 * @param {Object} options.categoryConfig 分类配置
 * @param {string} options.containerId 容器ID
 * @param {boolean} options.fromCache 是否来自缓存
 */
export function renderWelcomePage(options) {
    const { 
        articles = [], 
        onCategorySelect, 
        onArticleSelect,
        categoryConfig = {},
        containerId = 'article-container',
        fromCache = false
    } = options;
    
    const articleContainer = document.getElementById(containerId);
    if (!articleContainer) {
        logger.warn('文章容器不存在，无法显示欢迎页面');
        return;
    }
    
    if (!articles || articles.length === 0) {
        logger.warn('没有文章数据，显示简单欢迎页面');
        articleContainer.innerHTML = `
            <div class="welcome-page">
                <div class="welcome-header">
                    <h1>忙时有序，专注前行</h1>
                    <p class="welcome-subtitle">记录终端（移动端）相关技术的小型知识库</p>
                </div>
                <div class="welcome-content">
                    <p>暂无文章，请稍后再试</p>
                </div>
            </div>
        `;
        return;
    }

    articleContainer.innerHTML = `
        <div class="welcome-page${fromCache ? ' from-cache' : ''}">
            <div class="welcome-header">
                <h1>忙时有序，专注前行</h1>
                <p class="welcome-subtitle">记录终端（移动端）相关技术的小型知识库</p>
                ${fromCache ? '<span class="cache-badge">缓存数据</span>' : ''}
            </div>
            
            <div class="welcome-content">
                <div class="welcome-section">
                    <h2>📚 快速开始</h2>
                    <ul>
                        <li>从左侧文章列表选择感兴趣的主题</li>
                        <li>使用顶部搜索框查找特定内容</li>
                        <li>通过分类筛选相关文章</li>
                    </ul>
                </div>
                
                <div class="welcome-section">
                    <h2>🏷️ 主要分类</h2>
                    <div class="category-tags" id="welcome-categories"></div>
                </div>
                
                <div class="welcome-section">
                    <h2>✨ 最新文章</h2>
                    <div class="recent-articles" id="welcome-recent-articles"></div>
                </div>
            </div>
        </div>
    `;

    // 添加分类标签
    renderCategoryTags(articles, categoryConfig, onCategorySelect);
    
    // 添加最新文章
    renderRecentArticles(articles, onArticleSelect);
    
    // 添加或更新样式
    addWelcomePageStyles(fromCache);
}

/**
 * 渲染分类标签
 * @param {Array} articles 文章列表
 * @param {Object} categoryConfig 分类配置
 * @param {Function} onCategorySelect 分类选择回调
 */
function renderCategoryTags(articles, categoryConfig, onCategorySelect) {
    const categoriesContainer = document.getElementById('welcome-categories');
    if (!categoriesContainer) return;
    
    const categories = new Set();
    articles.forEach(article => {
        const category = article.category;
        if (category && category !== 'Uncategorized') categories.add(category);
    });

    // 定义分类颜色映射
    const categoryColors = categoryConfig.colors || getCategoryColors();
    const categoryNameMap = categoryConfig.nameMap || {};

    categoriesContainer.innerHTML = Array.from(categories)
        .sort()
        .map(category => {
            const colors = categoryColors[category] || categoryColors.default;
            const displayName = categoryNameMap[category] || category;
            
            return `
                <div class="category-tag" 
                     data-category="${category}"
                     style="background-color: ${colors.bg}; 
                            color: ${colors.color};"
                     data-hover-bg="${colors.hoverBg}">
                    ${displayName}
                </div>
            `;
        }).join('');

    // 添加点击事件
    Array.from(categoriesContainer.getElementsByClassName('category-tag')).forEach(tag => {
        const category = tag.dataset.category;
        const hoverBg = tag.dataset.hoverBg;
        
        // 添加悬停效果
        tag.addEventListener('mouseenter', () => {
            tag.style.backgroundColor = hoverBg;
        });
        
        tag.addEventListener('mouseleave', () => {
            const colors = categoryColors[category] || categoryColors.default;
            tag.style.backgroundColor = colors.bg;
        });
        
        // 添加点击事件
        if (typeof onCategorySelect === 'function') {
            tag.addEventListener('click', () => onCategorySelect(category));
        }
    });
}

/**
 * 渲染最新文章列表
 * @param {Array} articles 文章列表
 * @param {Function} onArticleSelect 文章选择回调
 */
function renderRecentArticles(articles, onArticleSelect) {
    const recentArticlesContainer = document.getElementById('welcome-recent-articles');
    if (!recentArticlesContainer) return;
    
    // 按发布时间排序并获取最新的5篇文章
    const recentArticles = [...articles]
        .filter(article => article.publish_date || article.created_time) // 确保有日期
        .sort((a, b) => {
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
        })
        .slice(0, 5);

    recentArticlesContainer.innerHTML = recentArticles
        .map(article => {
            const title = article.title || '无标题';
            const date = formatDate(article.publish_date || article.created_time);

            return `
                <div class="recent-article-item" data-article-id="${article.id}">
                    <div class="recent-article-title">${title}</div>
                    ${date ? `<span class="recent-article-date">${date}</span>` : ''}
                </div>
            `;
        }).join('');
    
    // 添加点击事件
    if (typeof onArticleSelect === 'function') {
        Array.from(recentArticlesContainer.getElementsByClassName('recent-article-item')).forEach(item => {
            const articleId = item.dataset.articleId;
            item.addEventListener('click', () => onArticleSelect(articleId));
        });
    }
}

/**
 * 添加欢迎页面样式
 * @param {boolean} fromCache 是否来自缓存
 */
function addWelcomePageStyles(fromCache = false) {
    // 移除已存在的样式标签
    const existingStyle = document.getElementById('welcome-page-style');
    if (existingStyle) {
        existingStyle.parentNode.removeChild(existingStyle);
    }
    
    // 创建全新的样式标签
    const styleElement = document.createElement('style');
    styleElement.id = 'welcome-page-style';
    styleElement.textContent = `
        .welcome-page {
            padding: 2rem;
            max-width: 800px;
            margin: 0 auto;
        }
        
        .welcome-header {
            text-align: center;
            margin-bottom: 3rem;
            padding-bottom: 2rem;
            border-bottom: 1px solid #eee;
        }
        
        .welcome-header h1 {
            font-size: 2.5rem;
            color: #2c3e50;
            margin-bottom: 1rem;
        }
        
        .welcome-subtitle {
            font-size: 1.2rem;
            color: #7f8c8d;
        }
        
        .welcome-section {
            margin-bottom: 2.5rem;
        }
        
        .welcome-section h2 {
            font-size: 1.5rem;
            color: #2c3e50;
            margin-bottom: 1rem;
            border-left: 4px solid #3498db;
            padding-left: 10px;
        }
        
        .welcome-section ul {
            padding-left: 1.5rem;
        }
        
        .welcome-section li {
            margin-bottom: 0.5rem;
            color: #34495e;
        }
        
        .category-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 1rem !important; /* 适中间距 */
            margin-top: 1.2rem !important; /* 适中上边距 */
        }
        
        .category-tag {
            padding: 0.5rem 1.2rem !important; /* 适中内边距 */
            border-radius: 20px !important; /* 适中圆角 */
            font-size: 1rem !important; /* 适中字体 */
            font-weight: 500 !important; /* 减轻字重 */
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important; /* 减轻阴影 */
            min-width: 60px !important; /* 减小最小宽度 */
            text-align: center !important;
        }
        
        .category-tag:hover {
            transform: translateY(-2px) !important; /* 减小悬停效果 */
            box-shadow: 0 3px 6px rgba(0,0,0,0.15) !important;
        }
        
        .recent-articles {
            margin-top: 1rem;
        }
        
        .recent-article-item {
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            background-color: #f8f9fa;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .recent-article-item:hover {
            background-color: #e9ecef;
            transform: translateY(-2px);
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }
        
        .recent-article-title {
            font-weight: 500;
            color: #2c3e50;
        }
        
        .recent-article-date {
            font-size: 0.85rem;
            color: #7f8c8d;
        }
    `;
    
    // 添加到文档头部
    document.head.appendChild(styleElement);
    
    // 为确保样式优先级，也直接对当前页面中的元素设置样式
    setTimeout(() => {
        const tags = document.querySelectorAll('.category-tag');
        tags.forEach(tag => {
            tag.style.padding = '0.5rem 1.2rem';
            tag.style.fontSize = '1rem'; 
            tag.style.fontWeight = '500';
            tag.style.borderRadius = '20px';
            tag.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            tag.style.minWidth = '60px';
            tag.style.textAlign = 'center';
        });
        
        const tagContainer = document.querySelector('.category-tags');
        if (tagContainer) {
            tagContainer.style.gap = '1rem';
            tagContainer.style.marginTop = '1.2rem';
        }
    }, 0);

    // 添加缓存标识样式
    if (fromCache) {
        const cacheStyles = `
            .welcome-page.from-cache {
                position: relative;
            }
            
            .cache-badge {
                position: absolute;
                top: 10px;
                right: 10px;
                font-size: 12px;
                padding: 3px 8px;
                background: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 4px;
                color: #6c757d;
            }
        `;
        
        styleElement.textContent += cacheStyles;
    }
}

/**
 * 获取默认分类颜色配置
 * @returns {Object} 分类颜色配置
 */
function getCategoryColors() {
    return {
        'Test': {
            bg: '#E3F2FD',
            color: '#1565C0',
            hoverBg: '#BBDEFB'
        },
        'Computer Basis': {
            bg: '#E8F5E9',
            color: '#2E7D32',
            hoverBg: '#C8E6C9'
        },
        'Data Structure and Algorithm': {
            bg: '#FFF3E0',
            color: '#E65100',
            hoverBg: '#FFE0B2'
        },
        'Programming Language': {
            bg: '#F3E5F5',
            color: '#6A1B9A',
            hoverBg: '#E1BEE7'
        },
        'Mobile Tech': {
            bg: '#E0F7FA',
            color: '#00838F',
            hoverBg: '#B2EBF2'
        },
        'default': {
            bg: '#F5F5F5',
            color: '#616161',
            hoverBg: '#E0E0E0'
        }
    };
} 