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

    // 渲染表格
    renderTable(tableData) {
        const { rows, hasColumnHeader, hasRowHeader } = tableData;
        
        if (!rows || rows.length === 0) {
            console.warn('表格数据为空');
            return '<div class="table-empty">空表格</div>';
        }
        
        console.log('渲染表格数据:', { 
            rowsCount: rows.length, 
            hasColumnHeader, 
            hasRowHeader,
            firstRow: rows[0]
        });
        
        let html = '<div class="table-container"><table class="notion-table">';
        
        // 渲染表头
        if (hasColumnHeader && rows.length > 0) {
            html += '<thead><tr>';
            rows[0].forEach((cell, cellIndex) => {
                const isRowHeader = hasRowHeader && cellIndex === 0;
                html += `<th${isRowHeader ? ' scope="col"' : ''}>${this.renderCell(cell)}</th>`;
            });
            html += '</tr></thead>';
        }
        
        // 渲染表体
        html += '<tbody>';
        const startRow = hasColumnHeader ? 1 : 0;
        for (let i = startRow; i < rows.length; i++) {
            html += '<tr>';
            rows[i].forEach((cell, cellIndex) => {
                const isRowHeader = hasRowHeader && cellIndex === 0 && !hasColumnHeader;
                if (isRowHeader) {
                    html += `<th scope="row">${this.renderCell(cell)}</th>`;
                } else {
                    html += `<td>${this.renderCell(cell)}</td>`;
                }
            });
            html += '</tr>';
        }
        html += '</tbody></table></div>';
        
        return html;
    }

    // 渲染单元格
    renderCell(cell) {
        if (!cell) return '';
        
        console.log('渲染单元格:', { type: typeof cell, value: cell });
        
        if (typeof cell === 'string') {
            return this.escapeHtml(cell);
        }
        
        if (typeof cell === 'number') {
            return cell.toString();
        }
        
        if (Array.isArray(cell)) {
            // 处理数组类型的单元格（Notion API 格式）
            return cell.map(textObj => {
                let content = textObj.plain_text || '';
                
                // 应用文本样式
                if (textObj.annotations) {
                    if (textObj.annotations.bold) content = `<strong>${content}</strong>`;
                    if (textObj.annotations.italic) content = `<em>${content}</em>`;
                    if (textObj.annotations.strikethrough) content = `<del>${content}</del>`;
                    if (textObj.annotations.underline) content = `<u>${content}</u>`;
                    if (textObj.annotations.code) content = `<code>${content}</code>`;
                }
                
                // 处理链接
                if (textObj.href) {
                    content = `<a href="${textObj.href}" target="_blank">${content}</a>`;
                }
                
                return content;
            }).join('');
        }
        
        if (typeof cell === 'object') {
            if (cell.type === 'text') {
                return this.escapeHtml(cell.text || '');
            }
            
            if (cell.type === 'link') {
                return `<a href="${this.escapeHtml(cell.url || '')}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(cell.text || cell.url || '')}</a>`;
            }
            
            if (cell.plain_text) {
                return this.escapeHtml(cell.plain_text);
            }
            
            if (cell.content) {
                return this.escapeHtml(cell.content);
            }
        }
        
        // 如果无法识别类型，尝试转换为字符串
        try {
            return this.escapeHtml(JSON.stringify(cell));
        } catch (e) {
            console.error('无法渲染单元格:', e);
            return '';
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