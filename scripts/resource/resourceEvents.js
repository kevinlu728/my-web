/**
 * @file resourceEvents.js
 * @description 资源加载事件常量和工具
 */

// 资源事件类型
export const ResourceEvents = {
    LOADING_START: 'resourceLoadingStart',
    LOADING_COMPLETE: 'resourceLoadingComplete',
    LOADING_ERROR: 'resourceLoadingError',
    FALLBACK_ACTIVATED: 'resourceFallbackActivated',
    STATE_CHANGED: 'resourceStateChanged'
};

// 资源状态
export const ResourceState = {
    INITIAL: 'initial',
    LOADING: 'loading',
    LOADED: 'loaded',
    ERROR: 'error',
    FALLBACK: 'fallback'
};

// 资源类型
export const ResourceType = {
    FONT_AWESOME: 'font-awesome',
    BOOTSTRAP_ICONS: 'bootstrap-icons',
    PRISM: 'prism',
    KATEX: 'katex',
    GRIDJS: 'gridjs'
}; 