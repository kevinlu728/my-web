/**
 * @file particleBackground.js
 * @description 粒子背景组件，处理网站背景的粒子动画效果
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-03-09
 * 
 * 该组件负责创建和管理网站的粒子背景动画效果，使用particles.js库实现。
 * 主要功能包括：
 * - 加载粒子库
 * - 初始化粒子系统
 * - 配置粒子的外观、数量和行为
 * - 设置粒子的交互效果（悬停、点击）
 * 
 * 通过initParticleBackground函数暴露功能，可被主入口文件调用。
 */

import logger from '../utils/logger.js';

/**
 * 加载粒子库
 * @returns {Promise} 解析为加载成功或拒绝为加载失败
 */
function loadParticlesLibrary() {
    logger.debug('开始异步加载粒子库...');
    
    return new Promise((resolve, reject) => {
        // 如果已加载，直接返回成功
        if (typeof particlesJS !== 'undefined') {
            logger.debug('粒子库已存在，跳过加载');
            resolve();
            return;
        }
        
        // 加载CDN版本
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js';
        script.async = true;
        
        // 加载成功回调
        script.onload = function() {
            logger.info('✅ 粒子库(CDN)加载成功');
            resolve();
        };
        
        // 加载失败回调 - 尝试本地备份
        script.onerror = function() {
            logger.warn('⚠️ CDN粒子库加载失败，尝试本地备份');
            
            const backupScript = document.createElement('script');
            backupScript.src = '/assets/libs/particles/particles.min.js';
            backupScript.async = true;
            
            backupScript.onload = function() {
                logger.info('✅ 本地粒子库加载成功');
                resolve();
            };
            
            backupScript.onerror = function() {
                const error = new Error('粒子库加载失败（CDN和本地备份均失败）');
                logger.error(error.message);
                reject(error);
            };
            
            document.body.appendChild(backupScript);
        };
        
        document.body.appendChild(script);
    });
}

/**
 * 初始化粒子背景
 * 该函数负责加载粒子库并初始化粒子效果
 * @returns {Promise} 初始化结果的Promise
 */
export function initParticleBackground() {
    const particlesContainer = document.getElementById('particles-js');
    if (!particlesContainer) {
        logger.warn('粒子背景容器不存在，跳过初始化');
        return Promise.resolve();
    }
    
    // 返回一个Promise，在适当的时候解析
    return loadParticlesLibrary()
        .then(() => {
            // 加载完成后配置和初始化粒子
            try {
                particlesJS("particles-js", {
                    particles: {
                        number: { 
                            value: 120,
                            density: { 
                                enable: true, 
                                value_area: 800 
                            } 
                        },
                        color: { value: "#3498db" },
                        shape: { type: "circle" },
                        opacity: { 
                            value: 0.6,
                            random: false 
                        },
                        size: { 
                            value: 4,
                            random: true 
                        },
                        line_linked: {
                            enable: true,
                            distance: 150,
                            color: "#3498db",
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
                                    opacity: 0.6
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
        })
        .catch(error => {
            // 处理加载失败情况
            logger.error('粒子背景组件初始化失败:', error);
            // 隐藏粒子容器，避免空白区域
            particlesContainer.style.display = 'none';
            return false;
        });
}

export default { initParticleBackground }; 