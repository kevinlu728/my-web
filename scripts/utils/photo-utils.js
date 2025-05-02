import logger from './logger.js';

/********以下是照片列表的数据处理相关工具函数 ******/
/**
 * 处理照片列表数据，转换为应用需要的格式
 * @param {Array} photos 从API获取的原始照片数据
 * @returns {Array} 处理后的照片数据
 */
export function processPhotoListData(photos) {
    if (!photos || !Array.isArray(photos)) {
        logger.error('无效的照片数据:', photos);
        return [];
    }
    
    return photos.map(photo => {
        try {
            // 提取标题
            const title = photo.properties.Title?.title?.[0]?.plain_text || '无标题';
            
            // 提取缩略图URL（新增）
            let thumbnailUrl = '';
            if (photo.properties['Thumbnail']?.url) {
                thumbnailUrl = photo.properties['Thumbnail'].url;
            } else if (photo.properties['Thumbnail']?.files?.[0]?.file?.url) {
                thumbnailUrl = photo.properties['Thumbnail'].files[0].file.url;
            } else if (photo.properties['Thumbnail']?.files?.[0]?.external?.url) {
                thumbnailUrl = photo.properties['Thumbnail'].files[0].external.url;
            }
            
            // 提取原始图片URL（字段名变更）
            let originalUrl = '';
            if (photo.properties['Original Image']?.url) {
                originalUrl = photo.properties['Original Image'].url;
            } else if (photo.properties['Original Image']?.files?.[0]?.file?.url) {
                originalUrl = photo.properties['Original Image'].files[0].file.url;
            } else if (photo.properties['Original Image']?.files?.[0]?.external?.url) {
                originalUrl = photo.properties['Original Image'].files[0].external.url;
            }
            
            // 提取日期
            const dateStr = photo.properties['Photo Date']?.date?.start;
            const date = dateStr ? new Date(dateStr) : new Date();
            
            // 提取分类 (多选)
            let categories = [];
            if (photo.properties.Category?.multi_select) {
                categories = photo.properties.Category.multi_select.map(item => item.name);
            }
            // 向后兼容 - 保留单个category字段，使用第一个分类或"未分类"
            const category = categories.length > 0 ? categories[0] : '未分类';
            
            // 提取描述
            const description = photo.properties.Description?.rich_text?.[0]?.plain_text || '';

            // 提取自定义字段
            const extendedField = photo.properties['Extend Field']?.rich_text?.[0]?.plain_text || '';
            const extendedFieldType = photo.properties['Extend Field Type']?.select?.name || '无额外字段';
            
            return {
                id: photo.id,
                title,
                thumbnailUrl,  // 新增字段
                originalUrl,   // 改名字段
                coverUrl: thumbnailUrl || originalUrl, // 兼容现有代码，优先使用缩略图
                date,
                category,      // 向后兼容 - 使用第一个分类
                categories,    // 新增 - 所有分类的数组
                description,
                extendedField,
                extendedFieldType,
                raw: photo // 保留原始数据
            };
        } catch (err) {
            logger.error('处理照片数据失败:', err, photo);
            return null;
        }
    }).filter(photo => photo !== null); // 过滤掉处理失败的照片
}

/**
 * 搜索照片
 * @param {Array} photos 照片列表
 * @param {string} searchTerm 搜索词
 * @returns {Array} 匹配的照片
 */
export function searchPhotos(photos, searchTerm) {
    if (!searchTerm || !photos || photos.length === 0) return photos;

    const term = searchTerm.toLowerCase();
    logger.info(`搜索照片，关键词: "${term}"`);

    return photos.filter(photo => {
        // 搜索标题匹配
        const titleMatch = photo.title?.toLowerCase().includes(term);
        
        // 搜索分类匹配 (检查所有分类)
        let categoryMatch = false;
        if (photo.categories && Array.isArray(photo.categories)) {
            categoryMatch = photo.categories.some(cat => 
                cat.toLowerCase().includes(term)
            );
        } else if (photo.category) {
            // 向后兼容 - 如果没有categories数组，使用单个category
            categoryMatch = photo.category.toLowerCase().includes(term);
        }
        
        return titleMatch || categoryMatch;
    });
}