/**
 * @file articleRenderer.js
 * @description 文章渲染模块，负责将Notion API返回的数据渲染为HTML
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-03-09
 * 
 * 该模块负责将从Notion API获取的文章数据转换为HTML内容，支持多种块类型的渲染：
 * - 段落、标题、列表、待办事项
 * - 图片（支持懒加载）
 * - 代码块（支持语法高亮）
 * - 表格（支持懒加载）
 * - 公式（支持KaTeX渲染）
 * - 引用、标注等
 * 
 * 主要导出函数：
 * - renderNotionBlocks: 渲染Notion块数组为HTML
 * - initializeLazyLoading: 初始化懒加载功能
 * 
 * 依赖于tableLazyLoader.js和codeLazyLoader.js实现懒加载功能。
 */

import { imageLazyLoader } from './imageLazyLoader.js';
import { tableLazyLoader } from './tableLazyLoader.js';
import { codeLazyLoader } from './codeLazyLoader.js';
import { mathLazyLoader } from './mathLazyLoader.js';
import { tableOfContents } from './tableOfContents.js';
import { extractArticleData } from '../utils/article-utils.js';
import { articlePageSkeleton } from '../utils/skeleton-loader.js';
import logger from '../utils/logger.js';

/**
 * 显示文章内容
 * @param {Object} articleData 文章数据
 * @param {string} containerId 容器ID
 * @param {boolean} hasMore 是否有更多内容
 */
export function renderArticleContent(articleData, containerId = 'article-container', hasMore = false) {
    const articleContainer = document.getElementById(containerId);
    if (!articleContainer) return;
    
    // 提取标题和块
    const { title, blocks } = extractArticleData(articleData);
    
    // 渲染文章内容
    const contentHtml = blocks && blocks.length > 0 ? 
        renderNotionBlocks(blocks) : 
        '<p>该文章暂无内容</p>';
    
    // 更新DOM
    articleContainer.innerHTML = `
        <h1 class="article-title">${title}</h1>
        <div class="article-body" data-article-id="${articleData.page?.id || ''}">
            ${contentHtml}
        </div>
        <div class="load-more-container">
            ${hasMore ? 
                '<div class="loading-text">下拉加载更多</div>' : 
                '<div class="no-more">没有更多内容</div>'}
        </div>
    `;

    // 处理文章中的图片和其他内容
    const articleBody = articleContainer.querySelector('.article-body');
    if (articleBody) {
        imageLazyLoader.processImages(articleBody);
    }
    
    return articleBody;
}

// 主渲染函数
export function renderNotionBlocks(blocks) {
    // logger.debug('开始渲染块:', blocks); // 注释掉，但不要删除，调试使用

    if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
        logger.warn('没有块数据可渲染');
        return '<p>没有内容</p>';
    }
    
    return blocks.map(block => renderBlock(block)).join('');
}

/**
 * 渲染新加载的内容
 * @param {Array} newBlocks - 新加载的内容块
 * @returns {boolean} 是否成功渲染
 */
export function renderMoreBlocks(newBlocks) {
    if (!newBlocks || newBlocks.length === 0) return false;
    
    logger.debug('渲染更多块');
    // 保存目录元素引用，确保它不会被销毁
    const tocElement = document.querySelector('.article-toc');
    const isTocCollapsed = tocElement ? tocElement.classList.contains('collapsed') : false;
    const isTocVisible = tocElement ? tocElement.classList.contains('visible') : false;
    
    logger.info('保存目录状态:', {
        存在: !!tocElement,
        已折叠: isTocCollapsed,
        移动设备可见: isTocVisible
    });
    
    // 渲染新内容
    const newContent = renderNotionBlocks(newBlocks);
    const articleBody = document.querySelector('.article-body');
    if (articleBody) {
        // 添加新内容前保存滚动位置
        const scrollPos = window.scrollY;
        
        // 添加新内容
        articleBody.insertAdjacentHTML('beforeend', newContent);
        
        // 处理新加载内容中的图片和其他懒加载内容
        imageLazyLoader.processImages(articleBody);
        initializeLazyLoading(articleBody);
        
        // 检查新内容中是否有标题元素
        const hasNewHeadings = newBlocks.some(block => 
            block.type === 'heading_1' || 
            block.type === 'heading_2' || 
            block.type === 'heading_3'
        );
        
        // 如果有新标题，则需要更新目录
        if (hasNewHeadings) {
            logger.info('检测到新的标题元素，使用轻量方式更新目录导航');
            
            // 使用新的不销毁容器的方法更新目录内容
            const updateResult = tableOfContents.updateContent();
            logger.info('目录更新结果:', updateResult);
            
            // 确保目录状态正确
            if (tocElement) {
                if (isTocCollapsed) {
                    tocElement.classList.add('collapsed');
                } else {
                    tocElement.classList.remove('collapsed');
                }
                
                if (isTocVisible) {
                    tocElement.classList.add('visible');
                } else {
                    tocElement.classList.remove('visible');
                }
            }
        }
        
        // 防止页面因新内容导致的滚动位置变化
        window.scrollTo({
            top: scrollPos,
            behavior: 'auto'
        });
        
        return true;
    }
    
    return false;
}

// 渲染段落
function renderParagraph(block) {
    if (!block.paragraph || !block.paragraph.rich_text) {
        return '<p></p>';
    }
    
    const text = block.paragraph.rich_text.map(richText => {
        return renderRichText(richText);
    }).join('');
    
    return `<p>${text || '&nbsp;'}</p>`;
}

// 渲染标题
function renderHeading(block, tag) {
    if (!block[block.type] || !block[block.type].rich_text) {
        return `<${tag}></${tag}>`;
    }
    
    const text = block[block.type].rich_text.map(richText => {
        return renderRichText(richText);
    }).join('');
    
    // 为标题生成唯一ID，用于目录导航
    const headingId = `heading-${block.id}`;
    
    return `<${tag} id="${headingId}">${text || '&nbsp;'}</${tag}>`;
}

// 渲染列表项
function renderListItem(block, listType) {
    if (!block[block.type] || !block[block.type].rich_text) {
        return `<li></li>`;
    }
    
    const text = block[block.type].rich_text.map(richText => {
        return renderRichText(richText);
    }).join('');
    
    return `<li>${text || '&nbsp;'}</li>`;
}

// 渲染待办事项
function renderTodo(block) {
    if (!block.to_do || !block.to_do.rich_text) {
        return `<div class="todo"></div>`;
    }
    
    const text = block.to_do.rich_text.map(richText => {
        return renderRichText(richText);
    }).join('');
    
    const checked = block.to_do.checked ? 'checked' : '';
    
    return `
        <div class="todo">
            <input type="checkbox" ${checked} disabled>
            <span>${text || '&nbsp;'}</span>
        </div>
    `;
}

// 渲染折叠块
function renderToggle(block) {
    if (!block.toggle || !block.toggle.rich_text) {
        return `<details><summary></summary></details>`;
    }
    
    const text = block.toggle.rich_text.map(richText => {
        return renderRichText(richText);
    }).join('');
    
    return `
        <details>
            <summary>${text || '&nbsp;'}</summary>
            <div>折叠内容</div>
        </details>
    `;
}

// 渲染图片
function renderImage(block) {
    if (!block.image) {
        return `<div class="image-placeholder">图片</div>`;
    }
    
    let url = '';
    if (block.image.type === 'external') {
        url = block.image.external.url;
    } else if (block.image.type === 'file') {
        url = block.image.file.url;
    }
    
    if (!url) {
        return `<div class="image-placeholder">图片</div>`;
    }
    
    // 简化图片渲染，移除内联加载器，完全依赖imageLazyLoader
    return `
        <div class="article-image-container">
            <img src="${url}" alt="图片" data-original-src="${url}" style="max-width: 100%;">
        </div>
    `;
}

// 渲染代码块
function renderCode(block) {
    const code = block.code?.rich_text?.[0]?.plain_text || '';
    const language = block.code?.language || 'plaintext';
    const caption = block.code?.caption?.[0]?.plain_text || '';
    
    // 创建代码数据对象
    const codeData = {
        code: code,
        language: language,
        caption: caption
    };
    
    // 将代码数据序列化为JSON字符串
    const codeDataJson = JSON.stringify(codeData);
    
    return `
        <div class="lazy-block code-block" data-code-data="${escapeAttribute(codeDataJson)}">
            <div class="placeholder-content">
                <i class="fas fa-code"></i>
                <span>代码加载中</span>
            </div>
        </div>
    `;
}

// 转义HTML属性值
function escapeAttribute(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/'/g, '&apos;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// 渲染公式
function renderEquation(block) {
    if (!block.equation) {
        return '<div class="equation-placeholder">公式</div>';
    }

    const formula = block.equation.expression;
    
    // 使用公式数据创建懒加载块
    return `
        <div class="equation-block waiting-for-katex" data-formula="${escapeAttribute(formula)}">
            <div class="katex-display">${formula}</div>
        </div>
    `;
}

// 渲染内联公式
function processInlineEquations(text) {
    // 匹配 $ ... $ 格式的内联公式
    return text.replace(/\$([^$]+)\$/g, (match, formula) => {
        return `<span class="inline-equation waiting-for-katex" data-formula="${escapeAttribute(formula)}">${formula}</span>`;
    });
}

// 更新富文本渲染函数以支持行内公式
function renderRichText(richText) {
    if (!richText || !richText.plain_text) {
        return '';
    }
    
    let text = richText.plain_text;
    
    // 处理行内公式
    if (text.includes('$')) {
        text = processInlineEquations(text);
    } else {
        // 转义 HTML 特殊字符
        text = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    
    // 应用文本样式
    if (richText.annotations) {
        if (richText.annotations.bold) {
            text = `<strong>${text}</strong>`;
        }
        if (richText.annotations.italic) {
            text = `<em>${text}</em>`;
        }
        if (richText.annotations.strikethrough) {
            text = `<del>${text}</del>`;
        }
        if (richText.annotations.underline) {
            text = `<u>${text}</u>`;
        }
        if (richText.annotations.code) {
            text = `<code>${text}</code>`;
        }
    }
    
    // 处理链接
    if (richText.href) {
        text = `<a href="${richText.href}" target="_blank">${text}</a>`;
    }
    
    return text;
}

/**
 * 渲染表格块
 * @param {Object} block - 表格块数据
 * @returns {string} - 渲染后的 HTML
 */
function renderTable(block) {
    logger.info('渲染表格块:', block);
    // 创建表格数据对象
    const tableData = {
        id: block.id,
        rows: [],
        hasColumnHeader: block.table?.has_column_header || false,
        hasRowHeader: block.table?.has_row_header || false
    };
    
    // 将表格数据序列化为JSON字符串
    return `
        <div class="lazy-block table-block" data-block-id="${block.id}" data-table-data='${JSON.stringify(tableData)}'>
            <div class="table-loading">
                <span>表格加载中...</span>
            </div>
        </div>
    `;
}

// 渲染单个块
function renderBlock(block) {
    // logger.debug('渲染块:', block.type, block.id);  //先注释掉，否则日志太多
    
    if (!block || !block.type) {
        logger.warn('无效的块:', block);
        return '';
    }
    
    try {
        switch (block.type) {
            case 'paragraph':
                return renderParagraph(block);
            case 'heading_1':
                return renderHeading(block, 'h1');
            case 'heading_2':
                return renderHeading(block, 'h2');
            case 'heading_3':
                return renderHeading(block, 'h3');
            case 'bulleted_list_item':
                return renderListItem(block, 'ul');
            case 'numbered_list_item':
                return renderListItem(block, 'ol');
            case 'to_do':
                return renderTodo(block);
            case 'toggle':
                return renderToggle(block);
            case 'code':
                return renderCode(block);
            case 'image':
                return renderImage(block);
            case 'equation':
                return renderEquation(block);
            case 'table':
                return renderTable(block);

            case 'divider':
                return '<hr class="notion-divider">';
            case 'quote':
                return `<blockquote class="notion-quote">${renderRichText(block.quote.rich_text)}</blockquote>`;
            case 'callout':
                const icon = block.callout.icon?.emoji ? `<span class="callout-icon">${block.callout.icon.emoji}</span>` : '';
                return `<div class="notion-callout">${icon}<div class="callout-content">${renderRichText(block.callout.rich_text)}</div></div>`;
            default:
                logger.warn('未支持的块类型:', block.type);
                return `<div class="unsupported-block">不支持的内容类型: ${block.type}</div>`;
        }
    } catch (error) {
        logger.error(`渲染 ${block.type} 块时出错:`, error);
        return `<div class="error-block">渲染 ${block.type} 内容时出错: ${error.message}</div>`;
    }
}

/**
 * 初始化懒加载功能
 * @param {HTMLElement} container - 文章容器元素
 */
export function initializeLazyLoading(container) {
    if (!container) {
        logger.warn('无法初始化懒加载：容器不存在');
        return;
    }
    
    logger.info('初始化懒加载功能...');
    
    // 标记容器已初始化
    container.dataset.lazyInitialized = 'true';
    
    // 初始化代码块懒加载
    const codeBlocks = container.querySelectorAll('.lazy-block.code-block');
    logger.info(`找到 ${codeBlocks.length} 个代码块待懒加载`);
    if (codeBlocks.length > 0 && typeof codeLazyLoader !== 'undefined') {
        logger.info('处理代码块...');
        codeLazyLoader.initialize();
    }
    
    // 初始化公式懒加载
    const equationBlocks = container.querySelectorAll('.equation-block');
    const inlineEquations = container.querySelectorAll('.inline-equation');
    logger.info(`找到 ${equationBlocks.length} 个公式待懒加载 和 ${inlineEquations.length} 个内联公式待懒加载`);
    if (equationBlocks.length > 0 && typeof mathLazyLoader !== 'undefined') {
        logger.info('处理数学公式...');
        mathLazyLoader.initialize();
    }
    if (inlineEquations.length > 0 && typeof mathLazyLoader !== 'undefined') {
        mathLazyLoader.loadInlineEquations();
    }

    // 初始化表格懒加载
    const tableBlocks = container.querySelectorAll('.table-block');
    logger.info(`找到 ${tableBlocks.length} 个表格待懒加载`);
    if (tableBlocks.length > 0 && typeof tableLazyLoader !== 'undefined') {
        tableLazyLoader.initialize();
    }
    
    // 添加强制触发渲染事件
    setTimeout(() => {
        logger.info('触发强制渲染检查...');
        // 强制触发一次重新布局，解决缓存加载不显示内容的问题
        if (container) {
            container.classList.add('force-reflow');
            const forceReflow = container.offsetHeight;
            container.classList.remove('force-reflow');
        }
        
        // 强制检查是否所有元素都正确渲染
        forceCheckLazyElements(container);
    }, 50);
    
    logger.info('懒加载初始化完成');
}

// 强制检查懒加载元素是否已渲染
function forceCheckLazyElements(container) {
    if (!container) return;
    
    // 处理代码块
    const codeBlocks = container.querySelectorAll('.lazy-block.code-block');
    if (codeBlocks.length > 0 && typeof codeLazyLoader !== 'undefined') {
        logger.info(`强制检查 ${codeBlocks.length} 个代码块...`);
        codeBlocks.forEach((block) => {
            // 使用更准确的检测条件
            if (!block.querySelector('pre code') || 
                block.innerHTML.trim() === '' || 
                block.textContent.includes('代码加载中') ||
                block.querySelector('.placeholder-content')) {
                if (typeof codeLazyLoader.loadCode === 'function') {
                    codeLazyLoader.loadCode(block);
                }
            }
        });
    }
    
    // 处理公式块
    const equationBlocks = container.querySelectorAll('.equation-block');
    if (equationBlocks.length > 0 && typeof mathLazyLoader !== 'undefined') {
        logger.info(`强制检查 ${equationBlocks.length} 个公式块...`);
        equationBlocks.forEach((block) => {
            // 使用更准确的检测条件
            if (!block.querySelector('.katex') || 
                block.innerHTML.trim() === '' || 
                block.classList.contains('waiting-for-katex')) {
                if (typeof mathLazyLoader.loadEquation === 'function') {
                    mathLazyLoader.loadEquation(block);
                }
            }
        });
    }
    
    // 处理表格 - 改进检测逻辑
    const tableBlocks = container.querySelectorAll('.lazy-block.table-block');
    if (tableBlocks.length > 0) {
        logger.info(`强制检查 ${tableBlocks.length} 个表格...`);
        tableBlocks.forEach((block) => {
            // 只检查尚未开始加载的表格
            if (!block.classList.contains('processed') && 
                !block.querySelector('.table-loading') && 
                !block.querySelector('.notion-table-gridjs')) {
                if (typeof tableLazyLoader !== 'undefined' && typeof tableLazyLoader.loadTable === 'function') {
                    tableLazyLoader.loadTable(block);
                }
            }
        });
    }
} 