/**
 * @file particleBackground.js
 * @description 粒子背景组件，处理网站背景的粒子动画效果
 * @author 陆凯
 * @version 1.1.0
 * @created 2024-03-09
 * @updated 2024-07-12
 * 
 * 该组件负责创建和管理网站的粒子背景动画效果，使用particles.js库实现。
 * 采用类设计模式实现状态管理和功能封装，通过单例模式对外提供服务。
 * 
 * 主要功能：
 * - 粒子库资源加载管理（通过particleLoader）
 * - 资源加载事件监听与处理
 * - 粒子系统初始化与配置
 * - 粒子渲染与交互效果设置（悬停、点击）
 * - 失败重试机制与降级处理
 */

import logger from '../utils/logger.js';
import { particleLoader } from '../resource/particleLoader.js';
import { resourceEvents, RESOURCE_EVENTS } from '../resource/resourceEvents.js';


class ParticleBackground {
    constructor() {
        this.particlesContainer = null;
    }

    initialize() {
        this.particlesContainer = document.getElementById('particles-js');
        if (!this.particlesContainer) {
            logger.warn('粒子背景容器不存在，跳过初始化');
            return Promise.resolve();
        }

        logger.info('初始化粒子背景...');
        this.initResourceEventListeners();
        this.loadParticleResources();
    }

    initResourceEventListeners() {
        // 创建加载状态跟踪对象
        const loadStatus = {
            'particles': false,
        };
        
        // 监听资源加载成功事件
        resourceEvents.on(RESOURCE_EVENTS.LOADING_SUCCESS, (data) => {
            // 更新加载状态
            if (data.resourceId === 'particles') {
                loadStatus[data.resourceId] = true;
                logger.info(`🔄 资源 ${data.resourceId} 加载成功 [来源: ${data.sender || '未知'}]`);
                
                // 检查所有必要资源是否都已加载
                if (loadStatus['particles']) {
                    logger.info('✅ Particles加载成功，准备配置和初始化粒子背景');
                    
                    // 延迟以确保样式完全应用
                    setTimeout(() => {
                        // 配置和初始化粒子
                        this.renderParticleBackground();
                    }, 300);
                }
            }
        });
        
        // 监听资源加载失败事件，处理降级方案
        resourceEvents.on(RESOURCE_EVENTS.LOADING_FAILURE, (data) => {
            if (data.resourceId === 'particles') {
                logger.warn(`⚠️ Particles加载失败，粒子背景可能不可用 [来源: ${data.sender || '未知'}]`);
                // 隐藏粒子容器，避免空白区域。（经测试是否隐藏容器对显示效果没有影响，暂时注释掉）
                // particlesContainer.style.display = 'none';
            }
        });
    }

    loadParticleResources() {
        if (typeof particlesJS === 'undefined')  {
            logger.info('正在加载粒子背景所需的资源(当前使用Particles库)...');
            particleLoader.loadParticleResources()
                .then(() => {
                    // 这里只打印日志，真正的渲染会在事件监听器中触发
                    logger.info('Particles库加载成功');
                })
                .catch(error => {
                    logger.error('Particles库加载失败:', error.message);
                });
        }
    }
    
    renderParticleBackground() {
        try {
            // 先检查Particles是否真的可用
            if (typeof particlesJS === 'undefined') {
                logger.warn('Particles库尚未可用，稍后重试渲染粒子背景');
                
                // 延迟重试
                setTimeout(() => {
                    if (typeof particlesJS !== 'undefined') {
                        logger.info('Particles库现在可用，重试渲染粒子背景');
                        this.renderParticleBackground();
                    }
                }, 1000);
                return;
            }
    
            particlesJS("particles-js", {
                particles: {
                    number: { 
                        value: 120,
                        density: { 
                            enable: true, 
                            value_area: 800 
                        } 
                    },
                    color: { value: "#4299e1" },
                    shape: { type: "circle" },
                    opacity: { 
                        value: 0.5,
                        random: false 
                    },
                    size: { 
                        value: 4,
                        random: true 
                    },
                    line_linked: {
                        enable: true,
                        distance: 150,
                        color: "#64b5f6",
                        opacity: 0.3,
                        width: 1
                    },
                    move: { 
                        enable: true, 
                        speed: 2,
                        direction: "none",
                        random: true,
                        straight: false,
                        out_mode: "bounce"
                    },
                },
                interactivity: {
                    detect_on: "canvas",
                    events: { 
                        onhover: { 
                            enable: true, 
                            mode: "grab" 
                        },
                        onclick: {
                            enable: true,
                            mode: "push"
                        },
                        resize: true
                    },
                    modes: {
                        grab: {
                            distance: 140,
                            line_linked: {
                                opacity: 0.5
                            }
                        }
                    }
                },
                retina_detect: true
            });
            logger.info('粒子背景初始化成功');
            return true;
        } catch (error) {
            logger.error('粒子背景初始化失败:', error);
            throw error;
        }
    }
}

// 创建并导出单例
export const particleBackground = new ParticleBackground();
export default particleBackground;