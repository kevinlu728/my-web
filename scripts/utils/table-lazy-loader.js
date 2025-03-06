/**
 * 表格懒加载工具
 */
class TableLazyLoader {
    constructor() {
        this.observer = null;
        this.initObserver();
        this.addTableStyles();
    }

    // 添加表格样式
    addTableStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .lazy-block.table-block {
                background: none !important;
                padding: 0 !important;
                margin: 0 !important;
            }
            .table-container {
                overflow-x: auto;
                margin: 0.2rem 0;
                background: none;
                border-radius: 3px;
                border: 1px solid #e0e0e0;
            }
            .table-container table {
                background: none;
                width: 100%;
                table-layout: auto;
                margin: 0;
                padding: 0;
            }
            .notion-table {
                border-collapse: collapse;
                font-size: 14px;
                margin: 0;
                padding: 0;
                background: none !important;
            }
            .notion-table tr {
                background: none !important;
            }
            .notion-table th,
            .notion-table td {
                border: 1px solid #e0e0e0;
                padding: 5px 12px;
                text-align: left;
                background: none;
                word-break: break-word;
                max-width: 400px;
                margin: 0;
            }
            .notion-table th {
                background-color: #fafafa;
                font-weight: 500;
                color: rgb(55, 53, 47);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .notion-table td {
                color: rgb(55, 53, 47);
                min-width: 100px;
            }
            /* 加载状态样式调整 */
            .loading-spinner,
            .loading-text,
            .error-message {
                margin: 0.2rem 0;
            }
            @media (max-width: 768px) {
                .notion-table {
                    font-size: 12px;
                }
                .notion-table th,
                .notion-table td {
                    padding: 4px 8px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // 初始化观察器
    initObserver() {
        if (this.observer) return;
        
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    const blockId = element.dataset.blockId;
                    // 只有未加载过的表格才进行加载
                    if (blockId && element.dataset.loaded !== 'true') {
                        this.loadTableContent(element, blockId);
                    }
                }
            });
        }, {
            rootMargin: '50px 0px',
            threshold: 0.1
        });
    }

    // 创建表格占位符
    createPlaceholder(blockId) {
        return `
            <div class="lazy-block table-block" data-block-id="${blockId}" data-loaded="false">
                <div class="placeholder-content">
                    <i class="fas fa-table"></i>
                    <span>表格加载中</span>
                </div>
            </div>
        `;
    }

    // 加载表格内容
    async loadTableContent(element, blockId) {
        // 如果表格已经加载过，不再重复加载
        if (element.dataset.loaded === 'true') {
            return;
        }

        try {
            element.innerHTML = `
                <div class="loading-spinner"></div>
                <div class="loading-text">加载中...</div>
            `;

            const response = await fetch(`/api/blocks/${blockId}/children`);
            if (!response.ok) throw new Error(`获取表格数据失败: ${response.status}`);
            
            const data = await response.json();
            if (!data.results) throw new Error('无效的表格数据');

            console.log('获取到表格数据:', data);

            const tableHtml = this.renderTableBlock({
                table: { 
                    has_column_header: true,
                    has_row_header: false
                },
                children: data.results
            });
            
            element.innerHTML = tableHtml;
            
            // 标记表格已加载
            element.dataset.loaded = 'true';
            
            // 取消观察
            if (this.observer) {
                this.observer.unobserve(element);
            }

            // 调整列宽
            this.adjustColumnWidths(element);

        } catch (error) {
            console.error('加载表格失败:', error);
            element.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>表格加载失败，点击重试</span>
                </div>
            `;
            element.onclick = () => {
                element.dataset.loaded = 'false'; // 重置加载状态
                this.loadTableContent(element, blockId);
            };
        }
    }

    // 调整列宽
    adjustColumnWidths(element) {
        const table = element.querySelector('table');
        if (!table) return;

        const rows = table.rows;
        if (rows.length === 0) return;

        const columnCount = rows[0].cells.length;
        const columnWidths = new Array(columnCount).fill(0);
        const minWidth = 100; // 最小列宽
        
        // 计算每列的最大内容宽度
        for (let i = 0; i < rows.length; i++) {
            const cells = rows[i].cells;
            for (let j = 0; j < cells.length; j++) {
                const cell = cells[j];
                // 创建一个临时span来测量内容宽度
                const span = document.createElement('span');
                span.style.position = 'absolute';
                span.style.visibility = 'hidden';
                span.style.whiteSpace = 'nowrap';
                span.innerHTML = cell.innerHTML;
                document.body.appendChild(span);
                const width = span.offsetWidth;
                document.body.removeChild(span);
                
                // 更新最大宽度
                columnWidths[j] = Math.max(columnWidths[j], width + 40); // 添加内边距
            }
        }

        // 应用列宽
        let tableWidth = table.offsetWidth;
        let totalWidth = columnWidths.reduce((a, b) => a + b, 0);
        let scale = tableWidth / totalWidth;

        // 创建colgroup
        let colgroup = document.createElement('colgroup');
        columnWidths.forEach(width => {
            let col = document.createElement('col');
            let adjustedWidth = Math.max(minWidth, Math.floor(width * scale));
            col.style.width = `${adjustedWidth}px`;
            colgroup.appendChild(col);
        });

        // 如果表格已经有colgroup，替换它
        const existingColgroup = table.querySelector('colgroup');
        if (existingColgroup) {
            table.replaceChild(colgroup, existingColgroup);
        } else {
            table.insertBefore(colgroup, table.firstChild);
        }
    }

    // 渲染表格
    renderTableBlock(block) {
        if (!block.children || block.children.length === 0) {
            console.warn('表格数据为空');
            return '<div class="table-error">表格数据为空</div>';
        }

        console.log('渲染表格数据:', block);

        let tableHtml = '<div class="table-container"><table class="notion-table">';
        const hasColumnHeader = block.table.has_column_header;
        
        block.children.forEach((row, rowIndex) => {
            if (!row.table_row || !row.table_row.cells) {
                console.warn(`行数据格式不正确:`, row);
                return;
            }
            
            const cells = row.table_row.cells;
            tableHtml += '<tr>';
            
            cells.forEach((cell, colIndex) => {
                const isHeader = hasColumnHeader && rowIndex === 0;
                const cellTag = isHeader ? 'th' : 'td';
                
                const cellContent = cell.map(textObj => {
                    let content = textObj.plain_text || '';
                    if (textObj.annotations) {
                        if (textObj.annotations.bold) content = `<strong>${content}</strong>`;
                        if (textObj.annotations.italic) content = `<em>${content}</em>`;
                        if (textObj.annotations.strikethrough) content = `<del>${content}</del>`;
                        if (textObj.annotations.underline) content = `<u>${content}</u>`;
                        if (textObj.annotations.code) content = `<code>${content}</code>`;
                    }
                    if (textObj.href) {
                        content = `<a href="${textObj.href}" target="_blank">${content}</a>`;
                    }
                    return content;
                }).join('');
                
                tableHtml += `<${cellTag}>${cellContent || '&nbsp;'}</${cellTag}>`;
            });
            
            tableHtml += '</tr>';
        });
        
        tableHtml += '</table></div>';
        return tableHtml;
    }

    // 观察新元素
    observe(element) {
        if (element && this.observer) {
            this.observer.observe(element);
        }
    }
}

// 导出实例
export const tableLazyLoader = new TableLazyLoader();

// 默认导出类
export default TableLazyLoader; 