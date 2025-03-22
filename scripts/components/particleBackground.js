/**
 * @file particleBackground.js
 * @description 粒子背景组件，处理网站背景的粒子动画效果
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-03-09
 * 
 * 该组件负责创建和管理网站的粒子背景动画效果，使用particles.js库实现。
 * 主要功能包括：
 * - 初始化粒子系统
 * - 配置粒子的外观、数量和行为
 * - 设置粒子的交互效果（悬停、点击）
 * 
 * 通过initParticleBackground函数暴露功能，可被主入口文件调用。
 * 依赖于外部库particles.js。
 */

export function initParticleBackground() {
    const particlesContainer = document.getElementById('particles-js');
    if (!particlesContainer) {
        console.warn('粒子背景容器不存在，跳过初始化');
        return;
    }
    
    // 检查粒子库是否已加载
    if (typeof particlesJS === 'undefined') {
        console.error('particles.js 库未加载，无法初始化粒子背景');
        return;
    }
    
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
        console.log('✅ 粒子背景初始化成功');
    } catch (error) {
        console.error('粒子背景初始化失败:', error);
    }
}

export default { initParticleBackground }; 