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

class CodeLazyLoader {
    constructor() {
        this.observer = null;
        this.initObserver();
        addCodeStylesToDocument();
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

    // 初始化观察器
    initObserver() {
        if ('IntersectionObserver' in window) {
            this.observer = new IntersectionObserver(this.onIntersection.bind(this), {
                rootMargin: '100px 0px',
                threshold: 0.01
            });
        }
    }

    // 处理代码块懒加载
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
                console.error('无效的代码数据:', codeData);
                codeBlock.innerHTML = '<div class="code-error">无效的代码数据</div>';
                return;
            }
            
            // 渲染代码块
            const codeHtml = this.renderCode(codeData);
            codeBlock.innerHTML = codeHtml;
            
            // 高亮代码
            this.highlightCode(codeBlock);
            
            // 添加复制功能
            this.addCopyButton(codeBlock);
        } catch (error) {
            console.error('加载代码失败:', error);
            codeBlock.innerHTML = '<div class="code-error">加载代码失败</div>';
        }
    }

    // 渲染代码块
    renderCode(codeData) {
        const { code, language, caption } = codeData;
        
        let html = '<div class="code-container">';
        
        // 添加代码头部
        html += '<div class="code-header">';
        html += `<div class="code-language">${language || 'text'}</div>`;
        if (caption) {
            html += `<div class="code-caption">${caption}</div>`;
        }
        html += '<div class="code-actions">';
        html += '<button class="code-action-btn copy-btn" title="复制代码"><i class="fas fa-copy"></i></button>';
        html += '</div></div>';
        
        // 添加代码内容
        html += '<div class="code-content">';
        html += `<pre><code class="language-${language || 'text'}">${this.escapeHtml(code)}</code></pre>`;
        html += '</div>';
        
        // 添加复制成功提示
        html += '<div class="copy-success">已复制</div>';
        
        html += '</div>';
        
        return html;
    }

    // 转义HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 高亮代码
    highlightCode(codeBlock) {
        if (window.Prism) {
            Prism.highlightAllUnder(codeBlock);
        }
    }

    // 添加复制按钮功能
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
                        .catch(err => console.error('复制失败:', err));
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
                        console.error('复制失败:', err);
                    }
                    
                    document.body.removeChild(textarea);
                }
            });
        }
    }

    // 显示复制成功提示
    showCopySuccess(element) {
        if (!element) return;
        
        element.classList.add('show');
        
        setTimeout(() => {
            element.classList.remove('show');
        }, 2000);
    }

    // 处理页面中的所有代码块
    processAllCodeBlocks() {
        const codeBlocks = document.querySelectorAll('.lazy-block.code-block');
        
        if (codeBlocks.length === 0) {
            return;
        }
        
        console.log(`找到 ${codeBlocks.length} 个代码块`);
        
        codeBlocks.forEach(codeBlock => {
            if (this.observer) {
                this.observer.observe(codeBlock);
            } else {
                // 如果不支持 IntersectionObserver，直接加载
                this.loadCode(codeBlock);
            }
        });
    }
}

// 创建单例
export const codeLazyLoader = new CodeLazyLoader(); 