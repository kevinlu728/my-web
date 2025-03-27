/**
 * @file table-styles.js
 * @description 表格样式模块，提供表格相关的CSS样式和样式注入功能
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-03-09
 * 
 * 该模块负责管理和注入表格相关的CSS样式：
 * - 定义表格的基本样式（边框、间距、颜色等）
 * - 定义表格的响应式样式
 * - 定义表格排序和交互样式
 * - 提供将样式动态注入到文档的功能
 * 
 * 主要导出：
 * - tableStyles: 包含表格样式的字符串
 * - addTableStylesToDocument: 将表格样式添加到文档中的函数
 * 
 * 被table-lazy-loader.js模块使用，确保懒加载的表格具有正确的样式。
 */

// 引入日志工具
import logger from '../utils/logger.js';

// CSS文件路径
const CSS_FILE_PATH = '/styles/components/table-block.css';

/**
 * 将表格样式添加到文档中
 * 优先使用外部CSS文件，如果加载失败则回退到内联样式
 */
export function addTableStylesToDocument() {
    // 检查样式是否已添加
    if (document.querySelector('link[data-id="table-styles"]') || 
        document.querySelector('style[data-id="table-styles"]')) {
        return;
    }
    
    // 尝试加载外部CSS文件
    const linkElement = document.createElement('link');
    linkElement.setAttribute('data-id', 'table-styles');
    linkElement.rel = 'stylesheet';
    linkElement.href = CSS_FILE_PATH;
    
    // 添加加载错误处理
    linkElement.onerror = () => {
        logger.warn('无法加载表格样式文件，使用内联样式作为备份');
        addInlineStyles();
    };
    
    // 添加到文档头部
    document.head.appendChild(linkElement);
}

/**
 * 添加内联样式作为备份
 * 仅在外部CSS文件加载失败时使用
 */
function addInlineStyles() {
    // 检查是否已添加内联样式
    if (document.querySelector('style[data-id="table-styles"]')) {
        return;
    }
    
    // 创建样式元素
    const styleElement = document.createElement('style');
    styleElement.setAttribute('data-id', 'table-styles');
    styleElement.textContent = tableStyles;
    
    // 添加到文档头部
    document.head.appendChild(styleElement);
}

// 保留内联样式作为备份
export const tableStyles = `
.lazy-block.table-block {
    background: none !important;
    padding: 0 !important;
    margin: 0 !important;
}
.table-container {
    overflow-x: auto;
    margin: 0.2rem 0;
    background: none;
    border-radius: 3px;
    border: 1px solid #e0e0e0;
}
.table-container table {
    background: none;
    width: 100%;
    table-layout: auto;
    margin: 0;
    padding: 0;
}
.notion-table {
    border-collapse: collapse;
    font-size: 14px;
    margin: 0;
    padding: 0;
    background: none !important;
}
.notion-table tr {
    background: none !important;
}
.notion-table th,
.notion-table td {
    border: 1px solid #e0e0e0;
    padding: 5px 12px;
    text-align: left;
    background: none;
    word-break: break-word;
}
.notion-table th {
    background-color: #f5f5f5 !important;
    font-weight: 600;
    position: sticky;
    top: 0;
    z-index: 1;
}
.notion-table tr:nth-child(even) {
    background-color: #fafafa !important;
}
.notion-table tr:hover {
    background-color: #f0f0f0 !important;
}
.table-loading {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100px;
    background-color: #f9f9f9;
    border-radius: 3px;
    color: #666;
    font-size: 14px;
}
.table-loading::after {
    content: '';
    width: 20px;
    height: 20px;
    margin-left: 10px;
    border: 2px solid #ddd;
    border-top-color: #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}
@keyframes spin {
    to { transform: rotate(360deg); }
}
@media (max-width: 768px) {
    .notion-table {
        font-size: 12px;
    }
    .notion-table th,
    .notion-table td {
        padding: 4px 8px;
    }
}
`; 