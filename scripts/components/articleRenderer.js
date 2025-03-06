// 文章内容渲染模块

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
    
    return `
        <div class="lazy-block code-block" 
            data-block-id="${block.id}"
            data-code="${escapeAttribute(code)}"
            data-language="${language}">
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

// 渲染富文本
function renderRichText(richText) {
    if (!richText || !richText.plain_text) {
        return '';
    }
    
    let text = richText.plain_text;
    
    // 转义 HTML 特殊字符
    text = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    
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

// 修改渲染函数以使用新的懒加载模块
function renderBlock(block) {
    console.log('渲染块类型:', block.type, block);

    switch (block.type) {
        case 'table':
            return tableLazyLoader.createPlaceholder(block.id);
        case 'code':
            return renderCode(block);
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
        case 'image':
            return renderImage(block);
        default:
            console.warn('不支持的块类型:', block.type);
            return `<div class="unsupported-block">不支持的块类型: ${block.type}</div>`;
    }
}

// 在渲染完成后初始化懒加载观察
export function initializeLazyLoading(container) {
    // 查找并观察所有懒加载块
    const tablePlaceholders = container.querySelectorAll('.table-block[data-block-id]');
    const codePlaceholders = container.querySelectorAll('.code-block[data-block-id]');

    tablePlaceholders.forEach(element => {
        tableLazyLoader.observe(element);
    });

    codePlaceholders.forEach(element => {
        codeLazyLoader.observe(element);
    });
} 