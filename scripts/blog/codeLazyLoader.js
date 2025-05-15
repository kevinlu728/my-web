/**
 * @file codeLazyLoader.js
 * @description 代码块懒加载工具，负责代码块的延迟加载、语法高亮和交互功能
 * @author 陆凯
 * @version 1.2.0
 * @created 2024-03-09
 * @updated 2024-07-12
 * @updated 2024-08-30 - 修复内联样式导致的代码块灰色背景问题
 * @updated 2024-08-30 - 修复代码块字体大小变化问题，恢复原始字体大小
 * 
 * 该模块实现了代码块的懒加载和语法高亮功能：
 * - 使用IntersectionObserver监测代码块可见性，实现按需加载
 * - 代码块进入视口时才执行渲染，提高页面加载性能
 * - 支持多种编程语言的语法高亮（通过Prism.js）
 * - 内置代码复制功能，改善用户体验
 * - 支持自动降级处理，在不支持现代API的浏览器中仍能正常工作
 * - 与prismLoader模块协同工作，优化资源加载顺序
 * 
 * 主要方法：
 * - initialize: 初始化懒加载和资源加载
 * - loadCode: 加载并渲染单个代码块
 * - highlightCode: 使用Prism对代码应用语法高亮
 * - loadAllCodeBlocks: 立即加载页面中的所有代码块
 * - addCopyButton: 为代码块添加复制按钮和复制功能
 * 
 * 依赖关系：
 * - 需要prismLoader模块加载Prism.js核心和语言组件
 * - 监听resourceEvents事件来协调资源加载
 */

import logger from '../utils/logger.js';
import { prismLoader } from '../resource/prismLoader.js';
import { resourceEvents, RESOURCE_EVENTS } from '../resource/resourceEvents.js';

class CodeLazyLoader {
    constructor() {
        this.observer = null;
    }

    initialize() {
        logger.info('初始化代码块懒加载...');
        this.initResourceEventListeners();
        this.loadCodeHighlightResources();
        this.initIntersectionObserver();    
        this.addInlineStyles();
        this.addCodeStylesToDocument();
        this.loadAllCodeBlocks();
    }

    initResourceEventListeners() {
        // 创建加载状态跟踪对象
        const loadStatus = {
            'prism-core': false,
            'prism-theme': false
        };

        // 监听资源加载成功事件
        resourceEvents.on(RESOURCE_EVENTS.LOADING_SUCCESS, (data) => {
            // 更新加载状态
            if (data.resourceId === 'prism-core' || data.resourceId === 'prism-theme') {
                loadStatus[data.resourceId] = true;
                logger.info(`🔄 资源 ${data.resourceId} 加载成功 [来源: ${data.sender || '未知'}]`);
                
                // 检查所有必要资源是否都已加载
                if (loadStatus['prism-core'] && loadStatus['prism-theme']) {
                    logger.info('✅ Prism核心和主题都已加载成功,准备加载语言组件');
                    
                    // 延迟加载，确保核心库和主题已完全初始化
                    setTimeout(() => {
                        // 防止重复加载
                        if (!window.prismLanComponentsLoading) {
                            window.prismLanComponentsLoading = true;
                            
                            // 加载语言组件
                            prismLoader.loadPrismLanguageComponents();
                        }
                    }, 200);
                }
            } else if (data.resourceId.startsWith('prism-lan-components')) {
                // logger.info(`🔄 资源 ${data.resourceId} 加载成功 [来源: ${data.sender || '未知'}]`);
            } else if (data.resourceId === 'prism-all-lan-components') {
                logger.info(`✅ 所有Prism语言组件加载完成：已加载 ${data.loadedCount}/${data.requestedCount} 个组件`);
                // 延迟一点时间，确保Prism已完全初始化所有语言
                setTimeout(() => {
                    this.highlightAll();
                }, 200);
            }
        });

        // 监听资源加载失败事件，处理降级方案
        resourceEvents.on(RESOURCE_EVENTS.LOADING_FAILURE, (data) => {
            if (data.resourceId === 'prism-core') {
                logger.warn(`⚠️ Prism核心加载失败,代码高亮功能可能不可用 [来源: ${data.sender || '未知'}]`);
            }
        });
    }

    loadCodeHighlightResources() {
        if (!window.prism) {
            logger.info('正在加载渲染代码所需的资源(当前使用Prism库)...');
            prismLoader.loadPrismResources()
                .then(() => {
                    // 这里只打印日志，真正的渲染会在事件监听器中触发
                    logger.info('Prism库加载成功');
                })
                .catch(error => {
                    logger.error('Prism库加载失败:', error.message);
                });
        }
    }

    initIntersectionObserver() {
        try {
            this.observer = new IntersectionObserver(this.onIntersection.bind(this), {
                rootMargin: '100px',
                threshold: 0.1
            });
            
            const codeBlocks = document.querySelectorAll('.lazy-block.code-block');
            logger.info(`找到 ${codeBlocks.length} 个代码块`);
            
            codeBlocks.forEach(block => this.observer.observe(block));
        } catch (error) {
            logger.error('初始化代码块懒加载失败:', error.message);
            
            // 降级处理：立即加载所有代码块
            document.querySelectorAll('.lazy-block.code-block').forEach(block => this.loadCode(block));
        }
    }

    // 处理代码块可见性
    onIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                this.loadCode(entry.target);
                this.observer.unobserve(entry.target);
            }
        });
    }
    
    // 添加内联样式，确保代码块在没有Prism时也能显示
    addInlineStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* 修复：移除顶层代码块容器的背景和边框样式 */
            .lazy-block.code-block {
                background: none;
                background-color: transparent;
                padding: 0;
                margin: 0;
                box-shadow: none;
                border: none;
            }
            
            /* 保留内部代码容器的样式 */
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
                padding: 0.8em;
                font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
                font-size: 14px;
                line-height: 1.4;
            }
            .code-content code {
                font-family: "JetBrains Mono", Consolas, Monaco, "Andale Mono", monospace;
                font-size: 14px;
                line-height: 1.4;
                display: block;
                color: #f8f8f2;
                background: none;
                padding: 0;
            }            
            .no-highlight {
                color: #f8f8f2;
                white-space: pre-wrap;
            }
            .waiting-for-highlight {
                position: relative;
            }
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

    /**
     * 将代码块样式添加到文档中
     * 优先使用外部CSS文件，如果加载失败则回退到内联样式
     */
    addCodeStylesToDocument() {
        // 检查样式是否已添加
        if (document.querySelector('link[data-id="code-styles"]') || 
            document.querySelector('style[data-id="code-styles"]')) {
            return;
        }
        
        // 尝试加载外部CSS文件
        const linkElement = document.createElement('link');
        linkElement.setAttribute('data-id', 'code-styles');
        linkElement.rel = 'stylesheet';
        // CSS文件路径
        const CSS_FILE_PATH = '/styles/blog/code-block.css';
        linkElement.href = CSS_FILE_PATH;
        
        // 添加加载错误处理
        linkElement.onerror = () => {
            logger.warn('无法加载代码块样式文件，使用内联样式作为备份');
            this.addInlineStyles();
        };
        
        // 添加到文档头部
        document.head.appendChild(linkElement);
    }

    // 加载所有代码块
    loadAllCodeBlocks() {
        const codeBlocks = document.querySelectorAll('.lazy-block.code-block:not(.processed)');
        logger.info(`找到 ${codeBlocks.length} 个代码块`);

        // 断开旧的观察器连接
        if (this.observer) {
            this.observer.disconnect();
        }
        
        // 确保每个代码块能完整渲染
        codeBlocks.forEach(block => {
            this.loadCode(block);
        });
        
        return codeBlocks.length;
    }
    // 加载代码
    loadCode(codeBlock) {
        const codeId = this.getCodeIdentifier(codeBlock);

        logger.info(`开始加载代码块${codeId}`);

        try {
            // 获取代码数据
            const codeData = JSON.parse(codeBlock.dataset.codeData || '{}');
            
            if (!codeData || !codeData.code) {
                logger.error('无效的代码数据:', codeData);
                codeBlock.innerHTML = '<div class="code-error">无效的代码数据</div>';
                return;
            }
            
            // 渲染代码但不立即高亮
            const codeHtml = this.renderCodeWithoutHighlight(codeData);
            codeBlock.innerHTML = codeHtml;
            
            // 添加复制功能
            this.addCopyButton(codeBlock);
            
            // 标记为等待高亮
            codeBlock.classList.add('waiting-for-highlight');

            this.highlightCode(codeBlock, codeData);
        } catch (error) {
            logger.error('加载代码失败:', error);
            codeBlock.innerHTML = '<div class="code-error">加载代码失败</div>';
        }
    }

    // 渲染代码块 - 无高亮版本 (保持原有方法)
    renderCodeWithoutHighlight(codeData) {
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
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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

    // 高亮所有代码块
    highlightAllCodeBlocks() {
        document.querySelectorAll('.waiting-for-highlight').forEach(block => {
            const codeData = JSON.parse(block.dataset.codeData || '{}');
            this.highlightCode(block, codeData);
        });
    }

    // 高亮代码 - 使用Prism库的
    highlightCode(codeBlock, codeData) {
        // 检查数据有效性
        if (!codeData || !codeData.code) {
            logger.warn('无效的代码数据:', codeData);
            return;
        }

        try {
            // 先检查Prism是否真的可用
            if (!window.Prism || typeof window.Prism.highlightElement !== 'function') {
                logger.warn('Prism库尚未可用，稍后重试高亮代码');
                
                // 保存表格数据到dataset，以便后续渲染
                codeBlock.dataset.codeData = JSON.stringify(codeData);
                codeBlock.classList.add('waiting-for-highlight');
                
                // 延迟重试
                setTimeout(() => {
                    if (window.Prism && typeof window.Prism.highlightElement === 'function') {
                        logger.info('Prism现在可用，重试高亮代码');
                        this.highlightCode(codeBlock, codeData);
                    }
                }, 1000);
                return;
            }
            const codeElement = codeBlock.querySelector('code');
            if (!codeElement) return;
            
            window.Prism.highlightElement(codeElement);
            codeBlock.classList.remove('waiting-for-highlight');
            codeElement.classList.remove('no-highlight');
            
        } catch (error) {
            logger.warn('高亮代码失败:', error.message);
        }
    }

    // 高亮所有代码 - 使用Prism库的highlightAll方法
    highlightAll() {
        try {
            if (window.Prism && typeof window.Prism.highlightAll === 'function') {
                window.Prism.highlightAll();
            }
        } catch (error) {
            logger.warn('高亮所有代码失败:', error.message);
        }
    }

    // 因为codeBlock.id是空的，所以通过以下代码获取更有意义的标识符
    getCodeIdentifier(codeBlock) {
        // 尝试多种方式获取代码标识
        const blockId = codeBlock.getAttribute('data-block-id');
        const dataSource = codeBlock.getAttribute('data-source');
        const codeIndex = Array.from(document.querySelectorAll('.code-block')).indexOf(codeBlock);
        
        // 返回最有意义的标识方式
        if (blockId) {
            return `代码(ID:${blockId.substring(0, 8)}...)`;
        } else if (dataSource) {
            return `代码(源:${dataSource})`;
        } else {
            return `代码#${codeIndex + 1}`;
        }
    }
}

// 创建单例
export const codeLazyLoader = new CodeLazyLoader();
export default codeLazyLoader;