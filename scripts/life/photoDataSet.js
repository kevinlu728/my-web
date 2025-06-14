/*
* 照片数据类
* 统一管理生活频道的照片数据
*/

import logger from '../utils/logger.js';

class PhotoDataSet {
    constructor() {
        this.photos = [];
        this.filteredPhotos = [];  // 过滤后的照片数组
        this.currentModulePhotos = [];  // 当前模块的照片数组，目前和filteredPhotos没有区别，历史遗留
    }

    initialize(photos) {
        this.photos = photos;
        this.filteredPhotos = photos;  // 初始时过滤的照片和所有照片相同
    }

    getPhotos() {
        return this.photos;
    }

    setPhotos(photos) {
        this.photos = photos;
    }

    getFilteredPhotos() {
        return this.filteredPhotos;
    }

    setFilteredPhotos(filteredPhotos) {
        this.filteredPhotos = filteredPhotos;
    }

    getCurrentModulePhotos() {
        if (this.currentModulePhotos && this.currentModulePhotos.length > 0) {
            return this.currentModulePhotos;
        }
        return this.photos;
    }

    setCurrentModulePhotos(currentModulePhotos) {
        this.currentModulePhotos = currentModulePhotos;
    }

    appendPhotos(newPhotos) {
        //打印原来的照片数量
        logger.info('原来的照片数量: ' + this.photos.length);

        this.photos = [...this.photos, ...newPhotos];

        //打印新的照片数量
        logger.info('新的照片数量: ' + this.photos.length);
    }

    cleanup() {
        this.setFilteredPhotos([]);
        this.setCurrentModulePhotos([]);
        this.setPhotos([]);
    }
}

export const photoDataSet = new PhotoDataSet();
export default PhotoDataSet;