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

// 文章树骨架屏模板
export const getArticleTreeSkeletonTemplate = () => {
  return `
    <div class="article-tree-skeleton">
        <li class="skeleton-category">
            <span class="skeleton-toggle skeleton-pulse"></span>
            <span class="skeleton-icon skeleton-pulse"></span>
            <span class="skeleton-name skeleton-cat-name-1 skeleton-pulse"></span>
            <span class="skeleton-spacer"></span>
            <span class="skeleton-count skeleton-pulse"></span>
        </li>
        <li class="skeleton-category">
            <span class="skeleton-toggle skeleton-pulse"></span>
            <span class="skeleton-icon skeleton-pulse"></span>
            <span class="skeleton-name skeleton-cat-name-2 skeleton-pulse"></span>
            <span class="skeleton-spacer"></span>
            <span class="skeleton-count skeleton-pulse"></span>
        </li>
        <li class="skeleton-category">
            <span class="skeleton-toggle skeleton-pulse"></span>
            <span class="skeleton-icon skeleton-pulse"></span>
            <span class="skeleton-name skeleton-cat-name-3 skeleton-pulse"></span>
            <span class="skeleton-spacer"></span>
            <span class="skeleton-count skeleton-pulse"></span>
        </li>
        <li class="skeleton-category">
            <span class="skeleton-toggle skeleton-pulse"></span>
            <span class="skeleton-icon skeleton-pulse"></span>
            <span class="skeleton-name skeleton-cat-name-4 skeleton-pulse"></span>
            <span class="skeleton-spacer"></span>
            <span class="skeleton-count skeleton-pulse"></span>
        </li>
        <li class="skeleton-category">
            <span class="skeleton-toggle skeleton-pulse"></span>
            <span class="skeleton-icon skeleton-pulse"></span>
            <span class="skeleton-name skeleton-cat-name-5 skeleton-pulse"></span>
            <span class="skeleton-spacer"></span>
            <span class="skeleton-count skeleton-pulse"></span>
        </li>
        <li class="skeleton-category">
            <span class="skeleton-toggle skeleton-pulse"></span>
            <span class="skeleton-icon skeleton-pulse"></span>
            <span class="skeleton-name skeleton-cat-name-6 skeleton-pulse"></span>
            <span class="skeleton-spacer"></span>
            <span class="skeleton-count skeleton-pulse"></span>
        </li>
    </div>
  `;
};

// 添加欢迎页面骨架屏模板
export const getWelcomePageSkeletonTemplate = () => {
  return `
    <div class="welcome-page-skeleton">
      <div class="welcome-page-skeleton-header">
        <div class="welcome-page-skeleton-title skeleton-pulse"></div>
        <div class="welcome-page-skeleton-subtitle skeleton-pulse"></div>
      </div>
      
      <div class="welcome-page-skeleton-content">
        <div class="welcome-page-skeleton-section">
          <div class="welcome-page-skeleton-section-title skeleton-pulse"></div>
          <div class="welcome-page-skeleton-list">
            <div class="welcome-page-skeleton-list-item skeleton-pulse"></div>
            <div class="welcome-page-skeleton-list-item skeleton-pulse"></div>
            <div class="welcome-page-skeleton-list-item skeleton-pulse"></div>
          </div>
        </div>
        
        <div class="welcome-page-skeleton-section">
          <div class="welcome-page-skeleton-section-title skeleton-pulse"></div>
          <div class="welcome-page-skeleton-category-tags">
            <div class="welcome-page-skeleton-category-tag welcome-page-skeleton-category-tag-1 skeleton-pulse"></div>
            <div class="welcome-page-skeleton-category-tag welcome-page-skeleton-category-tag-2 skeleton-pulse"></div>
            <div class="welcome-page-skeleton-category-tag welcome-page-skeleton-category-tag-3 skeleton-pulse"></div>
            <div class="welcome-page-skeleton-category-tag welcome-page-skeleton-category-tag-4 skeleton-pulse"></div>
            <div class="welcome-page-skeleton-category-tag welcome-page-skeleton-category-tag-5 skeleton-pulse"></div>
            <div class="welcome-page-skeleton-category-tag welcome-page-skeleton-category-tag-6 skeleton-pulse"></div>
          </div>
        </div>
        
        <div class="welcome-page-skeleton-section">
          <div class="welcome-page-skeleton-section-title skeleton-pulse"></div>
          <div class="welcome-page-skeleton-recent-articles">
            <div class="welcome-page-skeleton-article-item skeleton-pulse"></div>
            <div class="welcome-page-skeleton-article-item skeleton-pulse"></div>
            <div class="welcome-page-skeleton-article-item skeleton-pulse"></div>
            <div class="welcome-page-skeleton-article-item skeleton-pulse"></div>
            <div class="welcome-page-skeleton-article-item skeleton-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}; 

export const getArticlePageSkeletonTemplate = () => {
  return `
  <div class="article-skeleton">
      <!-- 文章标题区域 -->
      <div class="article-skeleton-header">
          <div class="article-skeleton-title skeleton-pulse"></div>
      </div>
      
      <!-- 文章内容区域 - 3个段落 -->
      <div class="article-skeleton-content">
          <!-- 段落1 -->
          <div class="article-skeleton-section">
              <div class="article-skeleton-section-title skeleton-pulse"></div>
              <div class="article-skeleton-section-content">
                  <div class="article-skeleton-section-line article-skeleton-section-line-full skeleton-pulse"></div>
                  <div class="article-skeleton-section-line article-skeleton-section-line-full skeleton-pulse"></div>
                  <div class="article-skeleton-section-line article-skeleton-section-line-medium skeleton-pulse"></div>
                  <div class="article-skeleton-section-line article-skeleton-section-line-full skeleton-pulse"></div>
                  <div class="article-skeleton-section-line article-skeleton-section-line-short skeleton-pulse"></div>
              </div>
          </div>
          
          <!-- 段落2 -->
          <div class="article-skeleton-section">
              <div class="article-skeleton-section-title skeleton-pulse"></div>
              <div class="article-skeleton-section-content">
                  <div class="article-skeleton-section-line article-skeleton-section-line-full skeleton-pulse"></div>
                  <div class="article-skeleton-section-line article-skeleton-section-line-full skeleton-pulse"></div>
                  <div class="article-skeleton-section-line article-skeleton-section-line-short skeleton-pulse"></div>
                  <div class="article-skeleton-section-line article-skeleton-section-line-full skeleton-pulse"></div>
                  <div class="article-skeleton-section-line article-skeleton-section-line-full skeleton-pulse"></div>
                  <div class="article-skeleton-section-line article-skeleton-section-line-medium skeleton-pulse"></div>
              </div>
          </div>
      </div>
  </div>
`;
};