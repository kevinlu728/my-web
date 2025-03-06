/**
 * 代码块懒加载工具
 */
class CodeLazyLoader {
    constructor() {
        this.observer = null;
        this.initObserver();
        this.addCodeStyles();
        this.loadPrism();
    }

    // 加载Prism.js
    loadPrism() {
        if (window.Prism) return;

        // 添加Prism CSS - 使用 Darcula 主题
        const prismCss = document.createElement('link');
        prismCss.rel = 'stylesheet';
        prismCss.href = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-okaidia.min.css';
        document.head.appendChild(prismCss);

        // 添加Prism JS
        const prismJs = document.createElement('script');
        prismJs.src = 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js';
        document.head.appendChild(prismJs);

        // 加载语言支持
        const prismJava = document.createElement('script');
        prismJava.src = 'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-java.min.js';
        document.head.appendChild(prismJava);
    }

    // 添加代码块样式
    addCodeStyles() {
        const style = document.createElement('style');
        style.textContent = `
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
            .copy-button {
                opacity: 0;
                transition: opacity 0.2s;
                border: none;
                background: none;
                color: #a9b7c6;
                cursor: pointer;
                font-size: 0.9em;
                padding: 4px 8px;
                border-radius: 3px;
            }
            .code-container:hover .copy-button {
                opacity: 1;
            }
            .copy-button:hover {
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
        document.head.appendChild(style);
    }

    // 初始化观察器
    initObserver() {
        if (this.observer) return;
        
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    const blockId = element.dataset.blockId;
                    if (blockId) {
                        this.loadCodeContent(element, blockId);
                        this.observer.unobserve(element);
                    }
                }
            });
        }, {
            rootMargin: '50px 0px',
            threshold: 0.1
        });
    }

    // 创建代码块占位符
    createPlaceholder(blockId) {
        return `
            <div class="lazy-block code-block" data-block-id="${blockId}">
                <div class="placeholder-content">
                    <i class="fas fa-code"></i>
                    <span>代码加载中</span>
                </div>
            </div>
        `;
    }

    // 加载代码内容
    async loadCodeContent(element, blockId) {
        try {
            element.innerHTML = `
                <div class="loading-spinner"></div>
                <div class="loading-text">加载中...</div>
            `;

            const codeContent = element.dataset.code || '';
            const language = element.dataset.language || 'plaintext';

            // 渲染代码块
            const codeHtml = this.renderCodeBlock(codeContent, language);
            element.innerHTML = codeHtml;

            // 添加复制功能
            const copyButton = element.querySelector('.copy-button');
            if (copyButton) {
                copyButton.addEventListener('click', () => {
                    navigator.clipboard.writeText(codeContent).then(() => {
                        const originalText = copyButton.innerHTML;
                        copyButton.innerHTML = '已复制';
                        copyButton.style.opacity = '1';
                        setTimeout(() => {
                            copyButton.innerHTML = originalText;
                            copyButton.style.opacity = '';
                        }, 2000);
                    });
                });
            }

            // 使用Prism进行语法高亮
            if (window.Prism) {
                const codeElement = element.querySelector('code');
                if (codeElement) {
                    Prism.highlightElement(codeElement);
                }
            }

        } catch (error) {
            console.error('加载代码块失败:', error);
            element.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>代码加载失败，点击重试</span>
                </div>
            `;
            element.onclick = () => this.loadCodeContent(element, blockId);
        }
    }

    // 渲染代码块
    renderCodeBlock(content, language) {
        return `
            <div class="code-container">
                <div class="code-header">
                    <span class="code-language">${language}</span>
                    <button class="copy-button">复制</button>
                </div>
                <div class="code-content">
                    <pre><code class="language-${language}">${this.escapeHtml(content)}</code></pre>
                </div>
            </div>
        `;
    }

    // HTML转义
    escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // 观察新元素
    observe(element) {
        if (element && this.observer) {
            this.observer.observe(element);
        }
    }
}

// 导出实例
export const codeLazyLoader = new CodeLazyLoader();

// 默认导出类
export default CodeLazyLoader; 