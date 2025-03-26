/**
 * @file placeholder-templates.js
 * @description 提供网站各处使用的占位图模板
 */

// 文章加载占位图模板
export const getArticlePlaceholder = () => {
  return `
    <div class="placeholder-content">
        <div class="placeholder-image loading-animation">
            <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="#d0d0d0" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                <line x1="8" y1="6" x2="16" y2="6"></line>
                <line x1="8" y1="10" x2="14" y2="10"></line>
                <line x1="8" y1="14" x2="12" y2="14"></line>
            </svg>
        </div>
        <div class="placeholder-text">正在加载文章...</div>
        <div class="placeholder-hint">请稍候片刻...</div>
    </div>
  `;
}; 