/**
 * @file articleRenderer.js
 * @description 文章渲染模块，负责将Notion API返回的数据渲染为HTML
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-03-09
 * 
 * 该模块负责将从Notion API获取的文章数据转换为HTML内容，支持多种块类型的渲染：
 * - 段落、标题、列表、待办事项
 * - 代码块（支持语法高亮）
 * - 表格（支持懒加载）
 * - 图片（支持懒加载）
 * - 公式（支持KaTeX渲染）
 * - 引用、标注等
 * 
 * 主要导出函数：
 * - renderNotionBlocks: 渲染Notion块数组为HTML
 * - initializeLazyLoading: 初始化懒加载功能
 * 
 * 依赖于table-lazy-loader.js和code-lazy-loader.js实现懒加载功能。
 */

import { tableLazyLoader } from '../utils/table-lazy-loader.js';
import { codeLazyLoader } from '../utils/code-lazy-loader.js';

// 主渲染函数
export function renderNotionBlocks(blocks) {
    console.log('开始渲染块:', blocks); // 添加日志

    if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
        console.warn('没有块数据可渲染');
        return '<p>没有内容</p>';
    }
    
    // 添加表格样式
    const tableStyle = `
        <style>
            .table-container {
                overflow-x: auto;
                margin: 1rem 0;
            }
            .notion-table {
                border-collapse: collapse;
                width: 100%;
                font-size: 14px;
                margin: 0;
            }
            .notion-table th,
            .notion-table td {
                border: 1px solid #e0e0e0;
                padding: 8px 12px;
                text-align: left;
            }
            .notion-table th {
                background-color: #f5f5f5;
                font-weight: 600;
            }
            .notion-table tr:nth-child(even) {
                background-color: #fafafa;
            }
            .notion-table tr:hover {
                background-color: #f0f0f0;
            }
            @media (max-width: 768px) {
                .notion-table {
                    font-size: 12px;
                }
                .notion-table th,
                .notion-table td {
                    padding: 6px 8px;
                }
            }
        </style>
    `;
    
    return tableStyle + blocks.map(block => renderBlock(block)).join('');
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
    
    return `<${tag}>${text || '&nbsp;'}</${tag}>`;
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
    
    return `<img src="${url}" alt="图片" style="max-width: 100%;">`;
}

// 渲染公式块
function renderEquation(block) {
    if (!block.equation) {
        return '<div class="equation-placeholder">公式</div>';
    }

    const formula = block.equation.expression;
    try {
        // 使用KaTeX直接渲染公式
        if (window.katex) {
            return `
                <div class="equation-block">
                    ${window.katex.renderToString(formula, {
                        displayMode: true,
                        throwOnError: false,
                        strict: false
                    })}
                </div>
            `;
        } else {
            // 如果KaTeX还未加载，先保存原始公式等待后续渲染
            return `
                <div class="equation-block" data-formula="${escapeAttribute(formula)}">
                    <div class="katex-display">${formula}</div>
                </div>
            `;
        }
    } catch (error) {
        console.error('公式渲染错误:', error);
        return `<div class="equation-error">公式渲染错误: ${formula}</div>`;
    }
}

// 处理行内公式
function processInlineEquations(text) {
    // 匹配行内公式 $formula$，但排除 $$ 的情况
    return text.replace(/(?<!\$)\$(?!\$)([^\$]+)\$(?!\$)/g, (match, formula) => {
        try {
            if (window.katex) {
                return window.katex.renderToString(formula, {
                    displayMode: false,
                    throwOnError: false,
                    strict: false
                });
            } else {
                return `<span class="katex-inline" data-formula="${escapeAttribute(formula)}">${formula}</span>`;
            }
        } catch (error) {
            console.error('行内公式渲染错误:', error);
            return match;
        }
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
function renderTableBlock(block) {
    console.log('渲染表格数据:', block); // 添加日志

    if (!block.table) {
        console.warn('表格数据不存在');
        return '';
    }
    
    const hasColumnHeader = block.table.has_column_header;
    const hasRowHeader = block.table.has_row_header;
    
    // 获取子块（表格行）
    const rows = block.children || [];
    console.log('表格行数据:', rows); // 添加日志
    
    if (rows.length === 0) {
        console.warn('表格没有行数据');
        return '';
    }

    let tableHtml = '<div class="table-container"><table class="notion-table">';
    
    rows.forEach((row, rowIndex) => {
        if (!row.table_row || !row.table_row.cells) {
            console.warn(`第 ${rowIndex + 1} 行数据格式不正确:`, row);
            return;
        }
        
        const cells = row.table_row.cells;
        tableHtml += '<tr>';
        
        cells.forEach((cell, colIndex) => {
            // 确定是否是表头单元格
            const isHeader = (hasColumnHeader && rowIndex === 0) || 
                           (hasRowHeader && colIndex === 0);
            const cellTag = isHeader ? 'th' : 'td';
            
            // 渲染单元格内容
            const cellContent = cell.map(textObj => {
                let content = textObj.plain_text || '';
                
                // 应用文本样式
                if (textObj.annotations) {
                    if (textObj.annotations.bold) content = `<strong>${content}</strong>`;
                    if (textObj.annotations.italic) content = `<em>${content}</em>`;
                    if (textObj.annotations.strikethrough) content = `<del>${content}</del>`;
                    if (textObj.annotations.underline) content = `<u>${content}</u>`;
                    if (textObj.annotations.code) content = `<code>${content}</code>`;
                }
                
                // 处理链接
                if (textObj.href) {
                    content = `<a href="${textObj.href}" target="_blank">${content}</a>`;
                }
                
                return content;
            }).join('');
            
            tableHtml += `<${cellTag}>${cellContent || '&nbsp;'}</${cellTag}>`;
        });
        
        tableHtml += '</tr>';
    });
    
    tableHtml += '</table></div>';
    
    return tableHtml;
}

// 渲染单个块
function renderBlock(block) {
    console.log('渲染块:', block.type, block.id);
    
    if (!block || !block.type) {
        console.warn('无效的块:', block);
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
                console.log('发现表格块，使用懒加载:', block.id);
                console.log('表格块完整数据:', JSON.stringify(block, null, 2));
                
                // 创建表格数据对象
                const tableData = {
                    id: block.id,
                    rows: [],
                    hasColumnHeader: block.table?.has_column_header || false,
                    hasRowHeader: block.table?.has_row_header || false
                };
                
                // 如果有表格行数据，则添加到rows中
                if (block.table && block.table.rows) {
                    console.log('表格行数据来自block.table.rows');
                    tableData.rows = block.table.rows;
                } else if (block.children && block.children.length > 0) {
                    console.log('表格行数据来自block.children');
                    tableData.rows = block.children.map(row => {
                        if (row.table_row && row.table_row.cells) {
                            return row.table_row.cells;
                        }
                        return [];
                    });
                } else {
                    // 表格数据为空，但我们不创建示例数据，而是显示一个加载中的状态
                    console.log('没有找到表格行数据，显示加载状态');
                }
                
                console.log('表格数据:', tableData); // 添加日志
                
                // 将表格数据序列化为JSON字符串
                const tableDataJson = JSON.stringify(tableData);
                
                // 返回表格懒加载占位符
                return `
                    <div class="lazy-block table-block" data-block-id="${block.id}" data-table-data="${escapeAttribute(tableDataJson)}">
                        <div class="table-loading">表格加载中...</div>
                    </div>
                `;
            case 'divider':
                return '<hr class="notion-divider">';
            case 'quote':
                return `<blockquote class="notion-quote">${renderRichText(block.quote.rich_text)}</blockquote>`;
            case 'callout':
                const icon = block.callout.icon?.emoji ? `<span class="callout-icon">${block.callout.icon.emoji}</span>` : '';
                return `<div class="notion-callout">${icon}<div class="callout-content">${renderRichText(block.callout.rich_text)}</div></div>`;
            default:
                console.warn('未支持的块类型:', block.type);
                return `<div class="unsupported-block">不支持的内容类型: ${block.type}</div>`;
        }
    } catch (error) {
        console.error(`渲染 ${block.type} 块时出错:`, error);
        return `<div class="error-block">渲染 ${block.type} 内容时出错: ${error.message}</div>`;
    }
}

// 更新初始化懒加载函数以包含公式渲染
export function initializeLazyLoading(container) {
    // 查找并处理所有懒加载块
    const tablePlaceholders = container.querySelectorAll('.lazy-block.table-block');
    const codePlaceholders = container.querySelectorAll('.lazy-block.code-block');

    // 处理表格懒加载
    if (tablePlaceholders.length > 0) {
        console.log(`找到 ${tablePlaceholders.length} 个表格块，初始化懒加载`);
        tableLazyLoader.processAllTables();
    }

    // 处理代码块懒加载
    if (codePlaceholders.length > 0) {
        console.log(`找到 ${codePlaceholders.length} 个代码块，初始化懒加载`);
        codeLazyLoader.processAllCodeBlocks();
    }

    // 等待KaTeX加载完成后渲染公式
    if (window.katex && window.renderMathInElement) {
        try {
            window.renderMathInElement(container, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false}
                ],
                throwOnError: false,
                strict: false,
                trust: true,
                macros: {
                    "\\log": "\\log",
                    "\\exp": "\\exp",
                    "\\sqrt": "\\sqrt",
                    "\\sum": "\\sum",
                    "\\prod": "\\prod"
                }
            });
        } catch (error) {
            console.error('公式渲染失败:', error);
        }
    } else {
        // 如果KaTeX还未加载，等待加载完成后再渲染
        const checkKaTeX = setInterval(() => {
            if (window.katex && window.renderMathInElement) {
                clearInterval(checkKaTeX);
                initializeLazyLoading(container);
            }
        }, 100);
        
        // 设置超时，避免无限等待
        setTimeout(() => clearInterval(checkKaTeX), 5000);
    }
} 