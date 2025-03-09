/**
 * @file categories.js
 * @description 文章分类配置，定义网站的文章分类结构
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-03-07
 * 
 * 该模块定义了网站的文章分类结构：
 * - 定义分类的名称、slug和图标
 * - 定义分类的层级关系（主分类和子分类）
 * - 定义分类的显示顺序
 * - 定义分类的特殊属性（如是否在导航中显示）
 * 
 * 分类数据被categoryManager使用，用于生成分类导航和文章筛选。
 * 每个分类包含id, name, slug, icon等属性，可选包含children表示子分类。
 * 
 * 该模块导出分类数组，可被其他模块导入使用。
 */

export const categoryConfig = {
    // 分类名称映射
    nameMap: {
        'all': '全部文章',
        'Test': '测试',
        'Computer Basis': '计算机基础',
        'Data Structure and Algorithm': '数据结构和算法',
        '未分类': '未分类'
    },
    
    // 分类颜色配置
    colors: {
        'Test': {
            bg: '#F5F5F5',
            color: '#666666',
            hoverBg: '#E8E8E8'
        },
        'Computer Basis': {
            bg: '#EBF5FB',
            color: '#2E86C1',
            hoverBg: '#D6EAF8'
        },
        'Data Structure and Algorithm': {
            bg: '#e8f5e9',      // 柔和的浅绿色背景
            color: '#2e7d32',   // 深绿色文字
            hoverBg: '#c8e6c9'  // 悬停时的背景色
        },
        'default': {
            bg: '#f8f9fa',
            color: '#718096',
            hoverBg: '#e2e8f0'
        }
    }
};