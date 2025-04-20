import logger from './logger.js';
import { ModuleType } from '../life/lifeViewManager.js';

/**
 * 生成 SVG 图片数据 URL，优化版
 * @param {number} width 宽度
 * @param {number} height 高度
 * @param {string} type 类型 (MOVIE/FOOTBALL/TRAVEL)
 * @param {number} index 索引
 * @returns {string} SVG 图片的 Data URL
 */
function generateSvgImage(width, height, type, index) {
    // 根据类型设置不同的背景色
    let bgColor, textColor = '#fff';
    let title = '';
    
    switch(type) {
        case 'MOVIE':
            // 紫色系 - HSL色相270-290
            bgColor = getRandomColor(280, 70, 45); 
            title = `电影 ${index}`;
            break;
        case 'FOOTBALL':
            // 绿色系 - HSL色相120
            bgColor = getRandomColor(120, 65, 45); 
            title = `足球 ${index}`;
            break;
        case 'TRAVEL':
            // 蓝色系 - HSL色相210-230
            bgColor = getRandomColor(210, 75, 50); 
            title = `旅行 ${index}`;
            break;
        default:
            bgColor = '#cccccc';
    }
    
    // 创建具有适当纵横比的SVG
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <defs>
            <linearGradient id="grad${index}_${type}" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:${bgColor};stop-opacity:1" />
                <stop offset="100%" style="stop-color:${getDarkerColor(bgColor)};stop-opacity:1" />
            </linearGradient>
            <pattern id="grid${index}" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="20" height="20" fill="none"/>
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
            </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad${index}_${type})" />
        <rect width="100%" height="100%" fill="url(#grid${index})" />
        <rect x="${width*0.05}" y="${height*0.05}" width="${width*0.9}" height="${height*0.9}" 
            fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2" />
        <text x="50%" y="50%" font-family="Arial" font-size="${Math.min(width, height) / 8}px" fill="${textColor}" 
            text-anchor="middle" dominant-baseline="middle" font-weight="bold">${title}</text>
    </svg>`;
    
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * 获取稍暗的颜色，用于渐变效果
 * @param {string} color HSL颜色
 * @returns {string} 更暗的HSL颜色
 */
function getDarkerColor(color) {
    // 从hsl(h, s%, l%)格式中提取值
    const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (!match) return color;
    
    const h = parseInt(match[1]);
    const s = parseInt(match[2]);
    // 降低亮度创建暗色
    const l = Math.max(parseInt(match[3]) - 20, 10);
    
    return `hsl(${h}, ${s}%, ${l}%)`;
}

/**
 * 生成HSL随机颜色，增加变化范围
 * @param {number} h 色相基准值 
 * @param {number} s 饱和度基准值
 * @param {number} l 亮度基准值
 * @returns {string} HSL颜色值
 */
function getRandomColor(h, s, l) {
    // 增大色相随机范围，提供更多颜色变化
    const hue = h + Math.floor(Math.random() * 30 - 15);
    const saturation = s + Math.floor(Math.random() * 25);
    const lightness = l + Math.floor(Math.random() * 20 - 10);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * 生成模拟照片数据
 * @returns {Array} 模拟照片数据数组
 */
export function generateMockPhotos() {
    const mockPhotos = [];
    
    // 电影模块照片 - 保持竖向比例特点
    for (let i = 1; i <= 9; i++) {
        // 随机生成不同的电影海报比例
        let width, height;
        const posterType = Math.floor(Math.random() * 3);
        
        if (posterType === 0) {
            // 2:3比例
            width = 200;
            height = 300;
        } else if (posterType === 1) {
            // 更窄的海报
            width = 180;
            height = 400;
        } else {
            // 方形海报
            width = 300;
            height = 300;
        }
        
        // 生成SVG图片URL
        const imageUrl = generateSvgImage(width, height, 'MOVIE', i);
        
        mockPhotos.push({
            id: `movie-${i}`,
            title: `电影 ${i}`,
            type: 'MOVIE',
            thumbnailUrl: imageUrl,
            highResUrl: imageUrl,
            date: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
            tags: ['电影', '海报'],
            metadata: {
                director: `导演 ${i}`,
                year: 2020 + Math.floor(i / 3),
                rating: (Math.random() * 2 + 7).toFixed(1),
                comment: `这是电影${i}的简短评论，描述电影的特点和感受。`
            },
            width: width,
            height: height
        });
    }
    
    // 足球模块照片 - 更宽的横向照片，突出赛场风景
    for (let i = 1; i <= 9; i++) {
        let width, height;
        const photoType = Math.floor(Math.random() * 3);
        
        if (photoType === 0) {
            // 超宽屏幅 - 足球场全景
            width = 300;  // 更宽
            height = 200;
        } else if (photoType === 1) {
            // 比赛场景
            width = 400;
            height = 300;
        } else {
            // 方形照片
            width = 500;
            height = 500;
        }
        
        // 生成SVG图片URL
        const imageUrl = generateSvgImage(width, height, 'FOOTBALL', i);
        
        mockPhotos.push({
            id: `football-${i}`,
            title: `足球赛事 ${i}`,
            type: 'FOOTBALL',
            thumbnailUrl: imageUrl,
            highResUrl: imageUrl,
            date: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
            tags: ['足球', '比赛'],
            metadata: {
                match: `比赛 ${i}`,
                location: `场地 ${i}`,
                result: `${Math.floor(Math.random() * 5)}:${Math.floor(Math.random() * 3)}`,
                description: `这是足球比赛${i}的精彩瞬间，记录了比赛的关键时刻。`
            },
            width: width,
            height: height
        });
    }
    
    // 旅游模块照片 - 混合尺寸，突出风景多样性
    for (let i = 1; i <= 9; i++) {
        let width, height;
        const photoType = Math.floor(Math.random() * 4);
        
        if (photoType === 0) {
            // 全景照片 - 非常宽
            width = 520;
            height = 200;
        } else if (photoType === 1) {
            // 标准风景照片
            width = 400;
            height = 300;
        } else if (photoType === 2) {
            // 人像照片 - 竖版
            width = 280;
            height = 400;
        } else {
            // 方形照片 - Instagram风格
            width = 350;
            height = 350;
        }
        
        // 生成SVG图片URL
        const imageUrl = generateSvgImage(width, height, 'TRAVEL', i);
        
        mockPhotos.push({
            id: `travel-${i}`,
            title: `旅行地点 ${i}`,
            type: 'TRAVEL',
            thumbnailUrl: imageUrl,
            highResUrl: imageUrl,
            date: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
            tags: ['旅游', '风景'],
            metadata: {
                location: `地点 ${i}`,
                country: `国家 ${i}`,
                description: `这是旅行地点${i}的美丽风景，记录了旅行的难忘瞬间。`
            },
            width: width,
            height: height
        });
    }
    
    return mockPhotos;
}