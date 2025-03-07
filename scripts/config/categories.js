// 分类配置
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