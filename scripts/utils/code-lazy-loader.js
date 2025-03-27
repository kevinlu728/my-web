/**
 * @file code-lazy-loader.js
 * @description 代码块懒加载工具，实现代码块的延迟加载和语法高亮
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-03-09
 * 
 * 该模块实现了代码块的懒加载和语法高亮功能：
 * - 使用IntersectionObserver监测代码块可见性
 * - 代码块进入视口时才加载和渲染
 * - 支持多种编程语言的语法高亮
 * - 支持代码块的复制功能
 * - 支持代码行号显示
 * 
 * 主要方法：
 * - loadCode: 加载代码内容并应用语法高亮
 * - highlightCode: 对代码应用语法高亮
 * - processAllCodeBlocks: 处理页面中的所有代码块
 * - addCopyButton: 为代码块添加复制按钮
 * 
 * 导出单例codeLazyLoader供其他模块使用。
 */

import { codeStyles, addCodeStylesToDocument } from '../styles/code-styles.js';
import logger from './logger.js';

class CodeLazyLoader {
    constructor() {
        this.observer = null;
        this.initObserver();
        this.addInlineStyles();
        addCodeStylesToDocument();
        
        // 默认使用高亮，但使用懒加载方式
        this.shouldLoadPrism = true;
        
        // 检查是否有代码块
        setTimeout(() => {
            if (document.querySelectorAll('.lazy-block.code-block').length > 0) {
                this.loadPrismLibrary(); // 预加载Prism库，但不立即应用
            }
        }, 500);
    }

    // 添加内联样式，确保代码块在没有Prism时也能显示
    addInlineStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .code-container {
                margin: 1.5rem 0;
                border-radius: 5px;
                overflow: hidden;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            
            .code-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.5rem 1rem;
                background: #2d2d2d;
                color: #f8f8f2;
            }
            
            .code-content {
                background: #272822;
                overflow-x: auto;
                position: relative;
            }
            
            .code-content pre {
                margin: 0;
                padding: 1rem;
                font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
                font-size: 0.9rem;
                line-height: 1.5;
            }
            
            .code-content code {
                font-family: inherit;
                display: block;
                color: #f8f8f2;
            }
            
            /* 确保未高亮时的代码也可读 */
            .no-highlight {
                color: #f8f8f2 !important;
                white-space: pre-wrap;
            }
            
            /* 等待高亮时的样式 */
            .waiting-for-highlight {
                position: relative;
            }
            
            /* 复制按钮样式 */
            .code-action-btn {
                background: transparent;
                border: none;
                color: #f8f8f2;
                font-size: 0.9rem;
                cursor: pointer;
                padding: 0.2rem 0.5rem;
                opacity: 0.7;
                transition: opacity 0.2s;
            }
            
            .code-action-btn:hover {
                opacity: 1;
            }
            
            /* 复制成功提示 */
            .copy-success {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 0.5rem 1rem;
                border-radius: 4px;
                opacity: 0;
                transition: opacity 0.3s;
                pointer-events: none;
                z-index: 100;
            }
            
            .copy-success.show {
                opacity: 1;
            }
        `;
        document.head.appendChild(style);
    }

    // 加载Prism库，但不应用高亮
    loadPrismLibrary() {
        // 如果已在加载，跳过
        if (window.prismLoading || window.prismLoaded) return;
        
        // 标记为正在加载中
        window.prismLoading = true;
        logger.info('预加载Prism库...');
        
        try {
            // 加载外部Prism库而不是内置版本
            const prismScript = document.createElement('script');
            prismScript.src = 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js';
            prismScript.onload = () => {
                logger.info('Prism核心库加载完成');
                
                // 加载额外的语言组件
                this.loadPrismComponents(['java', 'javascript', 'cpp', 'python', 'bash']);
                
                window.prismLoaded = true;
                window.prismLoading = false;
            };
            prismScript.onerror = () => {
                logger.error('Prism核心库加载失败，尝试备用源');
                // 尝试备用源
                prismScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js';
                // 备用源也失败的处理在onload里已经包含
            };
            
            document.head.appendChild(prismScript);
        } catch (error) {
            logger.error('加载Prism库失败:', error);
            window.prismLoaded = false;
            window.prismLoading = false;
        }
    }
    
    // 加载Prism语言组件
    loadPrismComponents(languages) {
        languages.forEach(lang => {
            const script = document.createElement('script');
            script.src = `https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-${lang}.min.js`;
            script.onerror = () => {
                logger.warn(`${lang}语言组件加载失败，尝试备用源`);
                script.src = `https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-${lang}.min.js`;
            };
            document.head.appendChild(script);
        });
    }
    
    // 处理等待中的代码块
    processWaitingBlocks() {
        if (!window.prismLoaded || !window.Prism) return;
        
        try {
            document.querySelectorAll('.waiting-for-highlight').forEach(block => {
                const codeElement = block.querySelector('code');
                if (codeElement) {
                    try {
                        // 使用浏览器的Prism库高亮
                        window.Prism.highlightElement(codeElement);
                    } catch (e) {
                        logger.warn('高亮处理失败', e);
                    }
                    block.classList.remove('waiting-for-highlight');
                    codeElement.classList.remove('no-highlight');
                }
            });
        } catch (e) {
            logger.warn('处理等待块失败', e);
        }
    }

    // 初始化观察器
    initObserver() {
        if ('IntersectionObserver' in window) {
            this.observer = new IntersectionObserver(this.onIntersection.bind(this), {
                rootMargin: '150px 0px', // 提前一点加载
                threshold: 0.01
            });
        }
    }

    // 代码块进入视图时加载高亮
    onIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const codeBlock = entry.target;
                this.loadCode(codeBlock);
                this.observer.unobserve(codeBlock);
            }
        });
    }

    // 加载代码
    loadCode(codeBlock) {
        try {
            // 获取代码数据
            const codeData = JSON.parse(codeBlock.dataset.codeData || '{}');
            
            if (!codeData || !codeData.code) {
                logger.error('无效的代码数据:', codeData);
                codeBlock.innerHTML = '<div class="code-error">无效的代码数据</div>';
                return;
            }
            
            // 渲染代码但不立即高亮
            const codeHtml = this.renderCodeWithoutPrism(codeData);
            codeBlock.innerHTML = codeHtml;
            
            // 添加复制功能
            this.addCopyButton(codeBlock);
            
            // 确保Prism库已加载
            if (!window.prismLoaded && !window.prismLoading && this.shouldLoadPrism) {
                this.loadPrismLibrary();
            }
            
            // 标记为等待高亮
            if (this.shouldLoadPrism) {
                codeBlock.classList.add('waiting-for-highlight');
                
                // 如果Prism已加载，立即高亮
                if (window.prismLoaded && window.Prism) {
                    this.highlightCode(codeBlock);
                } else {
                    // 否则，设置一个轮询器，在Prism加载后高亮
                    const checkInterval = setInterval(() => {
                        if (window.prismLoaded && window.Prism) {
                            this.highlightCode(codeBlock);
                            clearInterval(checkInterval);
                        }
                    }, 200);
                    
                    // 防止无限等待
                    setTimeout(() => clearInterval(checkInterval), 5000);
                }
            }
        } catch (error) {
            logger.error('加载代码失败:', error);
            codeBlock.innerHTML = '<div class="code-error">加载代码失败</div>';
        }
    }

    // 渲染代码块 - 无高亮版本 (保持原有方法)
    renderCodeWithoutPrism(codeData) {
        try {
            const { code, language, caption } = codeData;
            const safeLanguage = language || 'text';
            
            let html = '<div class="code-container">';
            
            // 添加代码头部
            html += '<div class="code-header">';
            html += `<div class="code-language">${safeLanguage}</div>`;
            if (caption) {
                html += `<div class="code-caption">${this.escapeHtml(caption)}</div>`;
            }
            html += '<div class="code-actions">';
            html += '<button class="code-action-btn copy-btn" title="复制代码"><i class="fas fa-copy"></i></button>';
            html += '</div></div>';
            
            // 添加代码内容 - 默认不使用高亮
            html += '<div class="code-content">';
            html += `<pre><code class="language-${safeLanguage} no-highlight">${this.escapeHtml(code || '')}</code></pre>`;
            html += '</div>';
            
            // 添加复制成功提示
            html += '<div class="copy-success">已复制</div>';
            html += '</div>';
            
            return html;
        } catch (error) {
            logger.error('渲染代码块失败:', error);
            return `<div class="code-error">渲染代码块失败: ${error.message}</div>`;
        }
    }

    // 维持现有的方法 (但简化逻辑)
    getSafePrismLanguage(language) {
        const languageMap = {
            'js': 'javascript',
            'ts': 'typescript',
            'py': 'python',
            'plain': 'text',
            'plaintext': 'text'
        };
        return languageMap[language?.toLowerCase()] || language || 'text';
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 高亮代码 - 使用浏览器Prism库
    highlightCode(codeBlock) {
        try {
            const codeElement = codeBlock.querySelector('code');
            if (!codeElement) return;
            
            // 如果Prism已加载，使用Prism高亮
            if (window.Prism && typeof window.Prism.highlightElement === 'function') {
                window.Prism.highlightElement(codeElement);
                codeBlock.classList.remove('waiting-for-highlight');
                codeElement.classList.remove('no-highlight');
            } else {
                // 标记为等待高亮
                codeBlock.classList.add('waiting-for-highlight');
            }
        } catch (error) {
            logger.warn('高亮代码失败:', error);
        }
    }

    // 添加复制按钮功能 (保留原有代码)
    addCopyButton(codeBlock) {
        const copyBtn = codeBlock.querySelector('.copy-btn');
        const codeElement = codeBlock.querySelector('code');
        const successElement = codeBlock.querySelector('.copy-success');
        
        if (copyBtn && codeElement) {
            copyBtn.addEventListener('click', () => {
                const code = codeElement.textContent;
                
                // 使用 Clipboard API
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(code)
                        .then(() => this.showCopySuccess(successElement))
                        .catch(err => logger.error('复制失败:', err));
                } else {
                    // 回退方法
                    const textarea = document.createElement('textarea');
                    textarea.value = code;
                    textarea.style.position = 'fixed';
                    textarea.style.opacity = '0';
                    document.body.appendChild(textarea);
                    textarea.select();
                    
                    try {
                        document.execCommand('copy');
                        this.showCopySuccess(successElement);
                    } catch (err) {
                        logger.error('复制失败:', err);
                    }
                    
                    document.body.removeChild(textarea);
                }
            });
        }
    }

    // 显示复制成功提示 (保留原有代码)
    showCopySuccess(element) {
        if (!element) return;
        
        element.classList.add('show');
        
        setTimeout(() => {
            element.classList.remove('show');
        }, 2000);
    }

    // 处理页面中的所有代码块
    processAllCodeBlocks(container = document) {
        const codeBlocks = container.querySelectorAll('.lazy-block.code-block');
        if (codeBlocks.length === 0) return;
        
        logger.info(`找到 ${codeBlocks.length} 个代码块，准备懒加载...`);
        
        // 如果有代码块，确保Prism库已加载
        if (codeBlocks.length > 0 && this.shouldLoadPrism) {
            this.loadPrismLibrary();
        }
        
        // 断开旧的观察器连接
        if (this.observer) {
            this.observer.disconnect();
        }
        
        // 处理代码块
        codeBlocks.forEach(codeBlock => {
            // 检查代码块是否已经加载
            if (codeBlock.querySelector('pre')) return;
            
            if (this.observer) {
                this.observer.observe(codeBlock);
            } else {
                this.loadCode(codeBlock);
            }
        });
    }
}

// 创建单例
export const codeLazyLoader = new CodeLazyLoader();

// 将实例添加到全局对象
if (typeof window !== 'undefined') {
    window.codeLazyLoader = codeLazyLoader;
    
    // 简化事件处理 - 仅在DOM加载完成时处理一次
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => codeLazyLoader.processAllCodeBlocks(), 100);
    });
    
    // 处理动态加载的内容
    window.addEventListener('contentLoaded', (event) => {
        const container = event.detail?.container || document;
        codeLazyLoader.processAllCodeBlocks(container);
    });
} 