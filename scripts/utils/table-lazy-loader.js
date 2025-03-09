/**
 * @file table-lazy-loader.js
 * @description 表格懒加载工具，实现表格的延迟加载和交互功能
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-03-09
 * 
 * 该模块实现了表格的懒加载功能，提高页面加载性能：
 * - 使用IntersectionObserver监测表格可见性
 * - 表格进入视口时才加载和渲染
 * - 支持表格排序功能
 * - 支持从API动态获取表格数据
 * - 处理各种错误情况和边缘情况
 * 
 * 主要方法：
 * - loadTable: 加载表格数据并渲染
 * - renderTable: 将表格数据渲染为HTML
 * - processAllTables: 处理页面中的所有表格
 * - addTableSorting: 添加表格排序功能
 * 
 * 导出单例tableLazyLoader供其他模块使用。
 */

import { tableStyles, addTableStylesToDocument } from '../styles/table-styles.js';

class TableLazyLoader {
    constructor() {
        this.observer = null;
        this.initObserver();
        addTableStylesToDocument();
    }

    // 初始化 IntersectionObserver
    initObserver() {
        if ('IntersectionObserver' in window) {
            this.observer = new IntersectionObserver(this.onIntersection.bind(this), {
                rootMargin: '100px 0px', // 提前100px开始加载
                threshold: 0.01 // 当表格有1%进入视口时触发
            });
        }
    }

    // 处理表格懒加载
    onIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const tableBlock = entry.target;
                this.loadTable(tableBlock);
                this.observer.unobserve(tableBlock);
            }
        });
    }

    // 加载表格
    loadTable(tableBlock) {
        try {
            console.log('开始加载表格:', tableBlock);
            
            // 获取表格数据
            const tableDataStr = tableBlock.dataset.tableData || '{}';
            const blockId = tableBlock.dataset.blockId;
            console.log('表格数据字符串:', tableDataStr);
            console.log('表格块ID:', blockId);
            
            const tableData = JSON.parse(tableDataStr);
            console.log('解析后的表格数据:', tableData);
            
            if (!tableData) {
                console.error('无效的表格数据: 数据为空');
                tableBlock.innerHTML = '<div class="table-error">无效的表格数据</div>';
                return;
            }
            
            if (!tableData.rows) {
                console.error('无效的表格数据: 缺少rows属性');
                tableBlock.innerHTML = '<div class="table-error">无效的表格数据 (缺少rows)</div>';
                return;
            }
            
            if (!Array.isArray(tableData.rows)) {
                console.error('无效的表格数据: rows不是数组');
                tableBlock.innerHTML = '<div class="table-error">无效的表格数据 (rows不是数组)</div>';
                return;
            }
            
            if (tableData.rows.length === 0 && blockId) {
                // 如果表格数据为空但有blockId，尝试从API获取数据
                console.log('表格数据为空，尝试从API获取数据');
                this.fetchTableData(tableBlock, blockId);
                return;
            }
            
            if (tableData.rows.length === 0) {
                console.warn('表格数据为空: rows数组为空');
                tableBlock.innerHTML = '<div class="table-empty">空表格</div>';
                return;
            }
            
            // 渲染表格
            const tableHtml = this.renderTable(tableData);
            tableBlock.innerHTML = tableHtml;
            
            // 添加表格排序功能
            this.addTableSorting(tableBlock.querySelector('table'));
            
            console.log('表格加载完成');
        } catch (error) {
            console.error('加载表格失败:', error);
            tableBlock.innerHTML = `<div class="table-error">加载表格失败: ${error.message}</div>`;
        }
    }

    // 从API获取表格数据
    async fetchTableData(tableBlock, blockId) {
        try {
            console.log(`从API获取表格数据: ${blockId}`);
            tableBlock.innerHTML = '<div class="table-loading">正在获取表格数据...</div>';

            // 从配置中获取 API 基础 URL
            const config = window.config || {};
            const apiBaseUrl = config.api?.baseUrl || '/api';
            const apiUrl = `${apiBaseUrl}/blocks/${blockId}/children`;
            
            console.log('API URL:', apiUrl);
            
            // 添加超时处理
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
            
            try {
                const response = await fetch(apiUrl, { signal: controller.signal });
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`获取表格数据失败: ${response.status}`, errorText);
                    throw new Error(`获取表格数据失败: ${response.status}`);
                }
                
                const data = await response.json();
                if (!data.results) {
                    console.error('无效的表格数据:', data);
                    throw new Error('无效的表格数据');
                }

                console.log(`获取到表格数据: ${data.results.length} 行`);
                
                // 创建表格数据对象
                const tableData = {
                    rows: data.results.map(row => {
                        if (row.table_row && row.table_row.cells) {
                            return row.table_row.cells;
                        }
                        return [];
                    }),
                    hasColumnHeader: true, // 默认第一行为表头
                    hasRowHeader: false
                };

                // 渲染表格
                const tableHtml = this.renderTable(tableData);
                tableBlock.innerHTML = tableHtml;
                
                // 添加表格排序功能
                this.addTableSorting(tableBlock.querySelector('table'));
                
                console.log('表格加载完成');
            } catch (error) {
                clearTimeout(timeoutId);
                
                if (error.name === 'AbortError') {
                    throw new Error('表格加载超时');
                }
                
                throw error;
            }
        } catch (error) {
            console.error('从API获取表格数据失败:', error);
            tableBlock.innerHTML = `<div class="table-error">获取表格数据失败: ${error.message}</div>`;
        }
    }

    /**
     * 渲染表格
     * @param {Object} tableData - 表格数据对象
     * @param {Array} tableData.rows - 表格行数据
     * @param {boolean} tableData.hasColumnHeader - 是否有列表头
     * @param {boolean} tableData.hasRowHeader - 是否有行表头
     * @returns {string} 渲染后的HTML字符串
     */
    renderTable(tableData) {
        const { rows, hasColumnHeader, hasRowHeader } = tableData;
        
        // 处理空数据情况
        if (!rows || rows.length === 0) {
            console.warn('表格数据为空');
            return '<div class="table-empty">空表格</div>';
        }
        
        // 分析表格结构
        console.log('表格数据行数:', rows.length);
        
        // 检查每行的列数
        const columnCounts = rows.map(row => row.length);
        console.log('每行的列数:', columnCounts);
        
        // 确定实际列数 - 使用最大列数确保所有数据都能显示
        const maxColumnCount = Math.max(...columnCounts);
        // 但如果所有行的列数都一致，就使用这个一致的列数
        const isConsistentColumns = new Set(columnCounts).size === 1;
        const columnCount = isConsistentColumns ? columnCounts[0] : maxColumnCount;
        
        console.log('实际列数:', columnCount);
        
        // 构建表格HTML
        let html = '<div class="table-container">';
        html += '<table>';
        
        // 渲染表头
        if (hasColumnHeader && rows.length > 0) {
            html += '<thead><tr>';
            
            // 处理表头行
            for (let i = 0; i < columnCount; i++) {
                const cell = i < rows[0].length ? rows[0][i] : '';
                html += `<th>${this.renderCell(cell)}</th>`;
            }
            
            html += '</tr></thead>';
        }
        
        // 渲染表体
        html += '<tbody>';
        const startRow = hasColumnHeader ? 1 : 0;
        
        for (let i = startRow; i < rows.length; i++) {
            html += '<tr>';
            
            // 渲染每一列
            for (let j = 0; j < columnCount; j++) {
                const cell = j < rows[i].length ? rows[i][j] : '';
                const isRowHeader = hasRowHeader && j === 0;
                
                // 检测单元格内容类型
                let cellClass = '';
                if (typeof cell === 'string' && cell.length > 50) {
                    cellClass = 'long-text';
                } else if (typeof cell === 'number') {
                    cellClass = 'number-cell';
                } else if (Array.isArray(cell) && cell.length > 0) {
                    // 检查富文本数组的总长度
                    const textContent = cell.map(item => {
                        if (typeof item === 'string') return item;
                        if (item && item.plain_text) return item.plain_text;
                        if (item && item.text && item.text.content) return item.text.content;
                        return '';
                    }).join('');
                    
                    if (textContent.length > 50) {
                        cellClass = 'long-text';
                    }
                }
                
                if (isRowHeader) {
                    html += `<th scope="row">${this.renderCell(cell)}</th>`;
                } else {
                    html += `<td class="${cellClass}">${this.renderCell(cell)}</td>`;
                }
            }
            
            html += '</tr>';
        }
        
        html += '</tbody></table></div>';
        
        return html;
    }

    /**
     * 渲染单元格内容
     * @param {*} cell - 单元格数据，可能是字符串、数字、数组或对象
     * @returns {string} 渲染后的HTML字符串
     */
    renderCell(cell) {
        // 处理空值
        if (cell === null || cell === undefined) {
            return '&nbsp;';
        }
        
        // 处理空数组
        if (Array.isArray(cell) && cell.length === 0) {
            return '&nbsp;';
        }
        
        // 处理空字符串
        if (typeof cell === 'string' && cell.trim() === '') {
            return '&nbsp;';
        }
        
        // 处理字符串类型
        if (typeof cell === 'string') {
            return this.escapeHtml(cell);
        }
        
        // 处理数字类型
        if (typeof cell === 'number') {
            return cell.toString();
        }
        
        // 处理数组类型（Notion API 富文本格式）
        if (Array.isArray(cell)) {
            // 处理数组中的每个元素
            const renderedContent = cell.map(item => {
                // 如果元素不是对象，直接返回字符串形式
                if (typeof item !== 'object' || item === null) {
                    return this.escapeHtml(String(item));
                }
                
                // 提取文本内容
                let content = '';
                
                // 尝试从不同属性中提取文本
                if (item.plain_text !== undefined) {
                    content = item.plain_text;
                } else if (item.text && item.text.content !== undefined) {
                    content = item.text.content;
                } else if (item.content !== undefined) {
                    content = item.content;
                } else if (item.text !== undefined && typeof item.text === 'string') {
                    content = item.text;
                }
                
                // 如果没有找到文本内容，返回空字符串
                if (!content) {
                    return '';
                }
                
                // 应用文本样式
                if (item.annotations) {
                    if (item.annotations.bold) content = `<strong>${content}</strong>`;
                    if (item.annotations.italic) content = `<em>${content}</em>`;
                    if (item.annotations.strikethrough) content = `<del>${content}</del>`;
                    if (item.annotations.underline) content = `<u>${content}</u>`;
                    if (item.annotations.code) content = `<code>${content}</code>`;
                    
                    // 处理颜色
                    if (item.annotations.color && item.annotations.color !== 'default') {
                        content = `<span class="color-${item.annotations.color}">${content}</span>`;
                    }
                }
                
                // 处理链接
                if (item.href) {
                    content = `<a href="${this.escapeHtml(item.href)}" target="_blank" rel="noopener noreferrer">${content}</a>`;
                }
                
                    return content;
                }).join('');
                
            return renderedContent || '&nbsp;';
        }
        
        // 处理对象类型
        if (typeof cell === 'object') {
            // 处理不同类型的对象
            if (cell.type === 'text') {
                return this.escapeHtml(cell.text?.content || cell.plain_text || '') || '&nbsp;';
            }
            
            if (cell.type === 'link') {
                const url = cell.url || '';
                const text = cell.text || cell.url || '';
                return `<a href="${this.escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(text)}</a>`;
            }
            
            // 尝试从对象的不同属性中提取文本
            if (cell.plain_text) {
                return this.escapeHtml(cell.plain_text) || '&nbsp;';
            }
            
            if (cell.content) {
                return this.escapeHtml(cell.content) || '&nbsp;';
            }
            
            if (cell.text) {
                if (typeof cell.text === 'string') {
                    return this.escapeHtml(cell.text) || '&nbsp;';
                } else if (typeof cell.text === 'object' && cell.text.content) {
                    return this.escapeHtml(cell.text.content) || '&nbsp;';
                }
            }
        }
        
        // 如果无法识别类型，尝试转换为字符串
        try {
            const stringValue = JSON.stringify(cell);
            return stringValue !== '{}' && stringValue !== '[]' 
                ? this.escapeHtml(stringValue) 
                : '&nbsp;';
        } catch (e) {
            console.error('无法渲染单元格:', e);
            return '&nbsp;';
        }
    }

    // 转义HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 添加表格排序功能
    addTableSorting(table) {
        if (!table) return;
        
        const headers = table.querySelectorAll('th');
        headers.forEach((header, index) => {
            if (header.getAttribute('scope') === 'row') return;
            
            header.style.cursor = 'pointer';
            header.title = '点击排序';
            header.dataset.sortDirection = 'none';
            header.dataset.columnIndex = index;
            
            // 添加排序图标
            const sortIcon = document.createElement('span');
            sortIcon.className = 'sort-icon';
            sortIcon.innerHTML = '⇅';
            sortIcon.style.marginLeft = '5px';
            sortIcon.style.fontSize = '12px';
            sortIcon.style.opacity = '0.5';
            header.appendChild(sortIcon);
            
            header.addEventListener('click', () => this.sortTable(table, index, header));
        });
    }

    // 排序表格
    sortTable(table, columnIndex, header) {
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        
        // 获取当前排序方向
        const currentDirection = header.dataset.sortDirection;
        const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
        
        // 更新所有表头的排序方向
        table.querySelectorAll('th').forEach(th => {
            th.dataset.sortDirection = 'none';
            th.querySelector('.sort-icon').innerHTML = '⇅';
            th.querySelector('.sort-icon').style.opacity = '0.5';
        });
        
        // 更新当前表头的排序方向
        header.dataset.sortDirection = newDirection;
        header.querySelector('.sort-icon').innerHTML = newDirection === 'asc' ? '↑' : '↓';
        header.querySelector('.sort-icon').style.opacity = '1';
        
        // 排序行
        rows.sort((rowA, rowB) => {
            const cellA = rowA.querySelectorAll('td, th')[columnIndex];
            const cellB = rowB.querySelectorAll('td, th')[columnIndex];
            
            if (!cellA || !cellB) return 0;
            
            const valueA = cellA.textContent.trim();
            const valueB = cellB.textContent.trim();
            
            // 尝试数字排序
            const numA = parseFloat(valueA);
            const numB = parseFloat(valueB);
            
            if (!isNaN(numA) && !isNaN(numB)) {
                return newDirection === 'asc' ? numA - numB : numB - numA;
            }
            
            // 字符串排序
            return newDirection === 'asc' 
                ? valueA.localeCompare(valueB, 'zh-CN') 
                : valueB.localeCompare(valueA, 'zh-CN');
        });
        
        // 重新添加排序后的行
        rows.forEach(row => tbody.appendChild(row));
    }

    // 处理页面中的所有表格
    processAllTables() {
        const tableBlocks = document.querySelectorAll('.lazy-block.table-block');
        
        if (tableBlocks.length === 0) {
            console.log('没有找到表格块');
            return;
        }
        
        console.log(`找到 ${tableBlocks.length} 个表格块`);
        
        tableBlocks.forEach(tableBlock => {
            // 检查表格是否已经加载
            const isLoaded = tableBlock.querySelector('table') !== null;
            if (isLoaded) {
                console.log('表格已加载，跳过');
                return;
            }
            
            if (this.observer) {
                console.log('使用IntersectionObserver观察表格块');
                this.observer.observe(tableBlock);
            } else {
                // 如果不支持 IntersectionObserver，直接加载
                console.log('不支持IntersectionObserver，直接加载表格');
                this.loadTable(tableBlock);
            }
        });
    }
}

// 创建单例
export const tableLazyLoader = new TableLazyLoader();