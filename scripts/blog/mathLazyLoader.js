/**
 * @file mathLazyLoader.js
 * @description 数学公式懒加载工具，实现公式的延迟加载和渲染
 * @version 1.0.0
 */

import logger from '../utils/logger.js';
import { katexLoader } from '../resource/katexLoader.js';

class MathLazyLoader {
    constructor() {
        this.observer = null;
        this.initObserver();
        this.addInlineStyles();
        
        // 默认使用KaTeX，但使用懒加载方式
        this.shouldLoadKatex = true;
        
        // 检查是否有公式块
        setTimeout(() => {
            if (document.querySelectorAll('.equation-block').length > 0) {
                // 预加载KaTeX资源
                katexLoader.loadKatexResources();
            }
        }, 500);
    }

    // 添加内联样式，确保公式块在没有KaTeX时也能显示
    addInlineStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* 公式块基础样式 */
            .equation-block {
                margin: 1.5em 0;
                overflow-x: auto;
                overflow-y: hidden;
                text-align: center;
                padding: 0.5em 0;
            }
            
            /* 未加载KaTeX时的样式 */
            .equation-block .katex-display {
                font-family: Georgia, 'Times New Roman', serif;
                white-space: pre-wrap;
                word-break: break-word;
                color: #333;
                padding: 8px;
                border-left: 3px solid #ddd;
                background-color: #f9f9f9;
                overflow-x: auto;
            }
            
            /* 错误提示样式 */
            .katex-error {
                color: #cc0000;
                background-color: #ffeeee;
                padding: 0.5em;
                border-radius: 3px;
                border: 1px solid #ffcccc;
                margin: 0.5em 0;
            }
            
            /* 占位符样式 */
            .equation-placeholder {
                background-color: #f8f8f8;
                border: 1px solid #ddd;
                border-radius: 3px;
                padding: 1em;
                margin: 1em 0;
                color: #666;
                text-align: center;
            }
            
            /* 等待加载样式 */
            .waiting-for-katex {
                position: relative;
            }
            
            /* 内联公式样式 */
            .inline-equation {
                display: inline-block;
                vertical-align: middle;
            }
        `;
        document.head.appendChild(style);
    }

    // 初始化观察器
    initObserver() {
        if (!window.IntersectionObserver) {
            logger.warn('浏览器不支持IntersectionObserver，公式将直接加载');
            return;
        }
        
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const equationBlock = entry.target;
                    this.loadEquation(equationBlock);
                    this.observer.unobserve(equationBlock);
                }
            });
        });
    }

    // 加载公式
    loadEquation(equationBlock) {
        try {
            // 获取公式数据
            const formula = equationBlock.dataset.formula;
            
            if (!formula) {
                logger.warn('无效的公式数据');
                return;
            }
            
            // 标记为等待KaTeX加载
            equationBlock.classList.add('waiting-for-katex');
            
            // 如果KaTeX已加载，立即渲染
            if (window.katexLoaded && window.katex) {
                this.renderEquation(equationBlock, formula);
            } else {
                // 否则，加载KaTeX资源并渲染公式
                katexLoader.loadKatexResources()
                    .then(success => {
                        if (success && window.katex) {
                            this.renderEquation(equationBlock, formula);
                        } else {
                            // 如果加载失败，设置轮询器检查KaTeX是否可用
                            const checkInterval = setInterval(() => {
                                if (window.katexLoaded && window.katex) {
                                    this.renderEquation(equationBlock, formula);
                                    clearInterval(checkInterval);
                                }
                            }, 200);
                            
                            // 防止无限等待
                            setTimeout(() => clearInterval(checkInterval), 5000);
                        }
                    });
            }
        } catch (error) {
            logger.error('加载公式失败:', error);
            equationBlock.innerHTML = '<div class="katex-error">加载公式失败</div>';
        }
    }

    // 使用KaTeX渲染公式
    renderEquation(equationBlock, formula) {
        try {
            // 确定是否为显示模式（独立公式块）
            const displayMode = !equationBlock.classList.contains('inline-equation');
            
            // 使用KaTeX渲染
            if (window.katex && typeof window.katex.renderToString === 'function') {
                // 清空现有内容，解决重复显示问题
                equationBlock.innerHTML = '';
                
                const renderedHtml = window.katex.renderToString(formula, {
                    displayMode: displayMode,
                    throwOnError: false,
                    strict: false
                });
                
                // 更新内容
                equationBlock.innerHTML = renderedHtml;
                equationBlock.classList.remove('waiting-for-katex');
            } else {
                // 回退到基本显示
                equationBlock.innerHTML = `<div class="katex-display">${formula}</div>`;
                logger.warn('KaTeX不可用，使用基本显示');
            }
        } catch (error) {
            logger.error('渲染公式失败:', error);
            equationBlock.innerHTML = `<div class="katex-error">渲染公式失败: ${error.message}</div>`;
        }
    }

    // 处理页面中的所有公式块
    processAllEquations(container = document) {
        const equationBlocks = container.querySelectorAll('.equation-block:not(.katex-processed)');
        if (equationBlocks.length === 0) return;
        
        logger.info(`找到 ${equationBlocks.length} 个公式块，准备懒加载...`);
        
        // 如果有公式块，确保KaTeX资源已加载或正在加载
        if (equationBlocks.length > 0 && this.shouldLoadKatex) {
            if (!window.katexLoaded && !window.katexLoading) {
                katexLoader.loadKatexResources();
            }
        }
        
        // 断开旧的观察器连接
        if (this.observer) {
            this.observer.disconnect();
        }
        
        // 处理公式块
        equationBlocks.forEach(equationBlock => {
            // 标记为已处理，防止重复处理
            equationBlock.classList.add('katex-processed');
            
            // 检查公式块是否已经渲染
            if (equationBlock.querySelector('.katex')) return;
            
            if (this.observer) {
                this.observer.observe(equationBlock);
            } else {
                this.loadEquation(equationBlock);
            }
        });
        
        // 处理内联公式
        this.processInlineEquations(container);
    }
    
    // 处理内联公式
    processInlineEquations(container = document) {
        const inlineEquations = container.querySelectorAll('.inline-equation');
        if (inlineEquations.length === 0) return;
        
        logger.info(`找到 ${inlineEquations.length} 个内联公式，准备处理...`);
        
        // 处理内联公式
        inlineEquations.forEach(equation => {
            // 检查公式是否已经渲染
            if (equation.querySelector('.katex')) return;
            
            const formula = equation.dataset.formula;
            if (!formula) return;
            
            // 内联公式通常较小，可以直接加载而不使用观察器
            this.loadEquation(equation);
        });
    }
}

// 创建单例实例
const mathLazyLoader = new MathLazyLoader();

// 将实例添加到全局对象
if (typeof window !== 'undefined') {
    window.mathLazyLoader = mathLazyLoader;
    
    // DOM加载完成时处理一次
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => mathLazyLoader.processAllEquations(), 100);
    });
    
    // 处理动态加载的内容
    window.addEventListener('contentLoaded', (event) => {
        const container = event.detail?.container || document;
        mathLazyLoader.processAllEquations(container);
    });
}

// 导出单例和类
export { mathLazyLoader, MathLazyLoader };
export default mathLazyLoader; 