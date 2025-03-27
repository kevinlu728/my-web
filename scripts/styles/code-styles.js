/**
 * @file code-styles.js
 * @description 代码块样式模块，提供代码高亮和代码块样式的定义和注入功能
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-03-09
 * 
 * 该模块负责管理和注入代码块相关的CSS样式：
 * - 定义代码块的基本样式（字体、颜色、背景等）
 * - 定义不同编程语言的语法高亮样式
 * - 定义代码块的响应式样式
 * - 提供将样式动态注入到文档的功能
 * 
 * 主要导出：
 * - codeStyles: 包含代码块样式的字符串
 * - addCodeStylesToDocument: 将代码块样式添加到文档中的函数
 * 
 * 被code-lazy-loader.js模块使用，确保懒加载的代码块具有正确的样式和高亮。
 */

import logger from '../utils/logger.js';

// CSS文件路径
const CSS_FILE_PATH = '/styles/components/code-block.css';

/**
 * 将代码块样式添加到文档中
 * 优先使用外部CSS文件，如果加载失败则回退到内联样式
 */
export function addCodeStylesToDocument() {
    // 检查样式是否已添加
    if (document.querySelector('link[data-id="code-styles"]') || 
        document.querySelector('style[data-id="code-styles"]')) {
        return;
    }
    
    // 尝试加载外部CSS文件
    const linkElement = document.createElement('link');
    linkElement.setAttribute('data-id', 'code-styles');
    linkElement.rel = 'stylesheet';
    linkElement.href = CSS_FILE_PATH;
    
    // 添加加载错误处理
    linkElement.onerror = () => {
        logger.warn('无法加载代码块样式文件，使用内联样式作为备份');
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
    if (document.querySelector('style[data-id="code-styles"]')) {
        return;
    }
    
    // 创建样式元素
    const styleElement = document.createElement('style');
    styleElement.setAttribute('data-id', 'code-styles');
    styleElement.textContent = codeStyles;
    
    // 添加到文档头部
    document.head.appendChild(styleElement);
}

// 保留内联样式作为备份
export const codeStyles = `
.lazy-block.code-block {
    background: none !important;
    padding: 0 !important;
    margin: 0 !important;
}
.code-container {
    background-color: #2b2b2b;
    border-radius: 3px;
    margin: 0;
    position: relative;
    overflow: hidden;
}
.code-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.3em 0.8em;
    color: #a9b7c6;
    font-size: 0.85em;
    background-color: #313335;
    border-bottom: 1px solid #323232;
}
.code-language {
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-size: 0.75em;
    color: #808080;
}
.code-caption {
    margin-left: 10px;
    font-style: italic;
    color: #a9b7c6;
}
.code-actions {
    display: flex;
    gap: 5px;
}
.code-action-btn {
    background: none;
    border: none;
    color: #a9b7c6;
    cursor: pointer;
    padding: 2px 5px;
    border-radius: 3px;
    opacity: 0.7;
    transition: all 0.2s;
}
.code-action-btn:hover {
    opacity: 1;
    background-color: #3c3f41;
}
.code-content {
    padding: 0.8em;
    overflow-x: auto;
    background-color: #2b2b2b;
}
.code-content pre {
    margin: 0;
    padding: 0;
    background: none !important;
}
.code-content code {
    font-family: "JetBrains Mono", Consolas, Monaco, "Andale Mono", monospace !important;
    font-size: 14px !important;
    line-height: 1.4 !important;
    background: none !important;
    padding: 0 !important;
    color: #a9b7c6 !important;
}
.copy-success {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 5px 10px;
    border-radius: 3px;
    opacity: 0;
    transition: opacity 0.3s;
    pointer-events: none;
}
.copy-success.show {
    opacity: 1;
}
.code-error {
    padding: 10px;
    color: #ff6b6b;
    background-color: #2b2b2b;
    border-radius: 3px;
    text-align: center;
}
/* IntelliJ IDEA Darcula 主题精确匹配 */
.token.comment {
    color: #629755 !important;
    font-style: italic !important;
}
.token.keyword {
    color: #cc7832 !important;
    font-weight: bold !important;
}
.token.string {
    color: #6a8759 !important;
}
.token.number {
    color: #6897bb !important;
}
.token.operator {
    color: #a9b7c6 !important;
}
.token.class-name {
    color: #a9b7c6 !important;
}
.token.function {
    color: #ffc66d !important;
}
.token.punctuation {
    color: #a9b7c6 !important;
}
.token.property {
    color: #9876aa !important;
}
/* 特殊关键字颜色 */
.token.builtin {
    color: #cc7832 !important;
    font-weight: bold !important;
}
.token.important {
    color: #cc7832 !important;
    font-weight: bold !important;
}
/* 变量名颜色 */
.token.variable {
    color: #a9b7c6 !important;
}
/* 注解颜色 */
.token.annotation {
    color: #bbb529 !important;
}
/* 静态成员颜色 */
.token.static {
    color: #cc7832 !important;
    font-weight: bold !important;
}
/* 方法调用颜色 */
.token.method {
    color: #ffc66d !important;
}
/* 参数颜色 */
.token.parameter {
    color: #a9b7c6 !important;
}
@media (max-width: 768px) {
    .code-container {
        font-size: 12px;
    }
    .code-content {
        padding: 0.6em;
    }
}
`;