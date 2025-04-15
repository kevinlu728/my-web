/**
 * @file mathLazyLoader.js
 * @description 数学公式懒加载工具，实现公式的延迟加载和渲染
 * @author 陆凯
 * @version 1.1.0
 * @created 2024-03-15
 * @updated 2025-04-15
 * 
 * 该模块实现了数学公式的懒加载功能，优化页面加载性能：
 * - 使用IntersectionObserver监测公式可见性
 * - 公式进入视口时才加载和渲染
 * - 使用KaTeX库提供高质量数学公式渲染
 * - 支持块级公式和内联公式
 * - 提供加载失败时的降级显示
 * 
 * 主要方法：
 * - initialize: 初始化懒加载系统
 * - loadEquation: 加载公式数据并渲染
 * - renderEquation: 使用KaTeX渲染公式
 * - loadAllEquations: 加载页面中所有公式
 * - getEquationIdentifier: 获取公式的唯一标识符
 * 
 * 事件处理：
 * - 监听KaTeX资源加载成功/失败事件
 * - 提供公式加载状态跟踪
 */

import logger from '../utils/logger.js';
import { katexLoader } from '../resource/katexLoader.js';
import { resourceEvents, RESOURCE_EVENTS } from '../resource/resourceEvents.js';

class MathLazyLoader {
    constructor() {
        this.observer = null;
        this.loadingEquations = new Set(); // 跟踪正在加载的公式
    }

    initialize() {
        logger.info('初始化数学公式懒加载...');
        this.initResourceEventListeners();
        this.loadMathResources();
        this.initIntersectionObserver();
        this.addInlineStyles();
    }

    initResourceEventListeners() {
        // 创建加载状态跟踪对象
        const loadStatus = {
            'katex-core': false,
            'katex-auto-render': false,
            'katex-theme': false
        };
        
        // 监听资源加载成功事件
        resourceEvents.on(RESOURCE_EVENTS.LOADING_SUCCESS, (data) => {
            // 更新加载状态
            if (data.resourceId === 'katex-core' || data.resourceId === 'katex-auto-render' || data.resourceId === 'katex-theme') {
                loadStatus[data.resourceId] = true;
                logger.info(`🔄 资源 ${data.resourceId} 加载成功 [来源: ${data.sender || '未知'}]`);
                
                // 检查所有必要资源是否都已加载
                if (loadStatus['katex-core'] && loadStatus['katex-auto-render'] && loadStatus['katex-theme']) {
                    logger.info('✅ KaTeX核心、自动渲染和主题都已加载成功，准备加载公式');
                    
                    // 延迟以确保样式完全应用
                    setTimeout(() => {
                        this.loadAllEquations();
                    }, 300);
                }
            }
        });
        
        // 监听资源加载失败事件，处理降级方案
        resourceEvents.on(RESOURCE_EVENTS.LOADING_FAILURE, (data) => {
            if (data.resourceId === 'katex-core') {
                logger.warn(`⚠️ KaTeX核心加载失败，公式功能可能不可用 [来源: ${data.sender || '未知'}]`);
            }
        });
    }

    loadMathResources() {
        if (!window.katex) {
            logger.info('正在加载渲染数学公式所需的资源(当前使用KaTeX库)...');
            katexLoader.loadKatexResources()
                .then(() => {
                    // 这里只打印日志，真正的渲染会在事件监听器中触发
                    logger.info('KaTeX库加载成功');
                })
                .catch(error => {
                    logger.error('KaTeX库加载失败:', error.message);
                });
        }
    }

    initIntersectionObserver() {
        try {
            this.observer = new IntersectionObserver(this.onIntersection.bind(this), {
                rootMargin: '100px',
                threshold: 0.1
            });
            
            const equationBlocks = document.querySelectorAll('.equation-block');
            logger.info(`找到 ${equationBlocks.length} 个公式块`);
            
            equationBlocks.forEach(block => this.observer.observe(block));
        } catch (error) {
            logger.error('初始化公式懒加载失败:', error.message);
            
            // 降级处理：立即加载所有公式
            document.querySelectorAll('.equation-block').forEach(block => this.loadEquation(block));
        }
    }

    // 处理公式块可见性
    onIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                this.loadEquation(entry.target);
                this.observer.unobserve(entry.target);  
            }
        });
    }
    
    // 添加内联样式，确保公式块在没有KaTeX时也能显示
    addInlineStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .equation-block {
                margin: 1.5em 0;
                overflow-x: auto;
                overflow-y: hidden;
                text-align: center;
                padding: 0.5em 0;
            }
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
            .katex-error {
                color: #cc0000;
                background-color: #ffeeee;
                padding: 0.5em;
                border-radius: 3px;
                border: 1px solid #ffcccc;
                margin: 0.5em 0;
            }            
            .equation-placeholder {
                background-color: #f8f8f8;
                border: 1px solid #ddd;
                border-radius: 3px;
                padding: 1em;
                margin: 1em 0;
                color: #666;
                text-align: center;
            }            
            .waiting-for-katex {
                position: relative;
            }            
            .inline-equation {
                display: inline-block;
                vertical-align: middle;
            }
        `;
        document.head.appendChild(style);
    }

    // 加载所有公式
    loadAllEquations() {
        const equationBlocks = document.querySelectorAll('.equation-block:not(.processed)');
        logger.info(`找到 ${equationBlocks.length} 个公式块`);

        // 断开旧的观察器连接
        if (this.observer) {
            this.observer.disconnect();
        }
        
        // 确保每个公式能完整渲染
        equationBlocks.forEach(block => {
            // 标记为已处理，防止重复处理
            block.classList.add('katex-processed');
            // 检查公式块是否已经渲染
            if (block.querySelector('.katex')) return;
            this.loadEquation(block);
        });
        
        // 处理内联公式
        // this.loadInlineEquations();
    }
    
    // 处理内联公式
    loadInlineEquations() {
        const inlineEquations = document.querySelectorAll('.inline-equation:not(.processed)');
        logger.info(`找到 ${inlineEquations.length} 个内联公式块`);
        
        inlineEquations.forEach(block => {
            // 检查公式是否已经渲染
            if (block.querySelector('.katex')) return;
            
            // 内联公式通常较小，可以直接加载而不使用观察器
            this.loadEquation(block);
        });
    }

    // 加载公式
    loadEquation(equationBlock) {
        // 避免重复加载
        if (equationBlock.classList.contains('processed') || this.loadingEquations.has(equationBlock)) {
            return;
        }

        const equationId = this.getEquationIdentifier(equationBlock);
        logger.info(`开始加载${equationId}`);
        this.loadingEquations.add(equationBlock);

        try {
            // 获取公式数据
            const formula = equationBlock.dataset.formula;
            
            this.renderEquation(equationBlock, formula);
        } catch (error) {
            logger.error('加载公式失败:', error);
            equationBlock.innerHTML = '<div class="katex-error">加载公式失败</div>';
        }
    }

    // 使用KaTeX渲染公式
    renderEquation(equationBlock, formula) {
        // 检查数据有效性
        if (!formula) {
            logger.warn('无效的公式数据');
            return;
        }
        
        try {
            // 先检查KaTeX是否真的可用
            if (!window.katex || typeof window.katex.renderToString !== 'function') {
                logger.warn('KaTeX库尚未可用，稍后重试渲染公式');

                // 保存公式数据到dataset，以便后续渲染
                equationBlock.dataset.formula = JSON.stringify(formula);
                equationBlock.innerHTML = `<div class="equation-loading">正在初始化公式组件...</div>`;

                // 回退到基本显示
                equationBlock.innerHTML = `<div class="katex-display">${formula}</div>`;
                logger.warn('KaTeX不可用，使用基本显示');
                
                // 延迟重试
                setTimeout(() => {
                    if (window.katex && typeof window.katex.renderToString === 'function') {
                        logger.info('KaTeX现在可用，重试渲染公式');
                        this.renderEquation(equationBlock, formula);
                    }
                }, 1000);
                return;
            }

            // 确定是否为显示模式（独立公式块）
            const displayMode = !equationBlock.classList.contains('inline-equation');
            
            // 清空现有内容，解决重复显示问题
            equationBlock.innerHTML = '';
            
            const renderedHtml = window.katex.renderToString(formula, {
                displayMode: displayMode,
                throwOnError: false,
                strict: false
            });
            
            // 更新内容
            equationBlock.innerHTML = renderedHtml;
        } catch (error) {
            logger.error('渲染公式失败:', error.message);
            equationBlock.innerHTML = `<div class="katex-error">渲染公式失败: ${error.message}</div>`;
        }
    }

    // 因为equationBlock.id是空的，所以通过以下代码获取更有意义的标识符
    getEquationIdentifier(equationBlock) {
        // 尝试多种方式获取公式标识
        const blockId = equationBlock.getAttribute('data-block-id');
        const dataSource = equationBlock.getAttribute('data-source');
        const equationIndex = Array.from(document.querySelectorAll('.equation-block')).indexOf(equationBlock);
        
        // 返回最有意义的标识方式
        if (blockId) {
            return `公式(ID:${blockId.substring(0, 8)}...)`;
        } else if (dataSource) {
            return `公式(源:${dataSource})`;
        } else {
            return `公式#${equationIndex + 1}`;
        }
    }

}

// 创建并导出单例
export const mathLazyLoader = new MathLazyLoader();
export default mathLazyLoader;