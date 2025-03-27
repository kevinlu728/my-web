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
import logger from './logger.js';

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
            logger.info('开始加载表格:', tableBlock);
            
            // 获取表格数据
            const tableDataStr = tableBlock.dataset.tableData || '{}';
            const blockId = tableBlock.dataset.blockId;
            logger.info('表格数据字符串:', tableDataStr);
            logger.info('表格块ID:', blockId);
            
            const tableData = JSON.parse(tableDataStr);
            logger.info('解析后的表格数据:', tableData);
            
            if (!tableData) {
                logger.error('无效的表格数据: 数据为空');
                tableBlock.innerHTML = '<div class="table-error">无效的表格数据</div>';
                return;
            }
            
            if (!tableData.rows) {
                logger.error('无效的表格数据: 缺少rows属性');
                tableBlock.innerHTML = '<div class="table-error">无效的表格数据 (缺少rows)</div>';
                return;
            }
            
            if (!Array.isArray(tableData.rows)) {
                logger.error('无效的表格数据: rows不是数组');
                tableBlock.innerHTML = '<div class="table-error">无效的表格数据 (rows不是数组)</div>';
                return;
            }
            
            if (tableData.rows.length === 0 && blockId) {
                // 如果表格数据为空但有blockId，尝试从API获取数据
                logger.info('表格数据为空，尝试从API获取数据');
                this.fetchTableData(tableBlock, blockId);
                return;
            }
            
            if (tableData.rows.length === 0) {
                logger.warn('表格数据为空: rows数组为空');
                tableBlock.innerHTML = '<div class="table-empty">空表格</div>';
                return;
            }
            
            // 渲染表格
            const tableHtml = this.renderTable(tableData);
            tableBlock.innerHTML = tableHtml;
            
            // 添加表格排序功能
            this.addTableSorting(tableBlock.querySelector('table'));
            
            logger.info('表格加载完成');
        } catch (error) {
            logger.error('加载表格失败:', error);
            tableBlock.innerHTML = `<div class="table-error">加载表格失败: ${error.message}</div>`;
        }
    }

    // 从API获取表格数据
    async fetchTableData(tableBlock, blockId) {
        try {
            logger.info(`从API获取表格数据: ${blockId}`);
            
            // 显示加载状态
            tableBlock.innerHTML = `
                <div class="table-loading">
                    <div>正在获取表格数据...</div>
                    <div class="table-info">表格ID: ${blockId}</div>
                </div>
            `;

            // 添加随机参数和版本号，避免缓存
            const timestamp = Date.now();
            const version = '1.1.0'; 
            
            // 尝试两种不同的API URL构建方式
            const apiUrl = `/api/blocks/${blockId}/children`;
            const directApiUrl = `${window.location.origin}/api/blocks/${blockId}/children`;
            
            // 构建带参数的URL
            const urlWithParams = `${apiUrl}?_=${timestamp}&v=${version}`;
            const fullUrlWithParams = `${directApiUrl}?_=${timestamp}&v=${version}&retry=true`;
            
            // 简化日志输出，仅保留关键信息
            logger.info('API请求URL:', apiUrl);
            
            // 添加请求头
            const headers = {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            };
            
            // 设置较长的超时时间
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 25000); // 25秒超时
            
            // 首先尝试相对URL
            try {
                logger.info('开始请求表格数据...');
                
                // 发起请求并记录时间
                const startTime = Date.now();
                const response = await fetch(urlWithParams, {
                    method: 'GET',
                    headers: headers,
                    credentials: 'same-origin',
                    signal: controller.signal,
                    cache: 'no-store',
                    mode: 'cors'
                });
                const endTime = Date.now();
                
                logger.info(`API响应状态: ${response.status} ${response.statusText}，耗时: ${endTime - startTime}ms`);
                
                // 减少响应头的详细记录
                // 只在非成功响应时记录响应头，有助于调试
                if (!response.ok) {
                    const responseHeaders = {};
                    response.headers.forEach((value, key) => {
                        // 只记录关键响应头
                        if (['content-type', 'cache-control', 'content-length'].includes(key.toLowerCase())) {
                            responseHeaders[key] = value;
                        }
                    });
                    logger.info('关键响应头:', responseHeaders);
                    throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
                }
                
                // 处理响应内容
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error(`非JSON响应: ${contentType}`);
                }
                
                // 读取响应内容为文本
                const text = await response.text();
                logger.info(`API响应长度: ${text.length}字节`);
                
                if (!text || text.trim().length === 0) {
                    throw new Error('空响应');
                }
                
                // 解析JSON
                try {
                    const data = JSON.parse(text);
                    
                    // 检查数据格式
                    if (!data || typeof data !== 'object') {
                        throw new Error(`无效的响应数据格式: ${typeof data}`);
                    }
                    
                    // 清理超时计时器
                    clearTimeout(timeoutId);
                    
                    // 渲染表格
                    this.processAPIResponse(tableBlock, data, blockId);
                    return; // 成功处理，返回
                } catch (jsonError) {
                    logger.error('JSON解析失败:', jsonError.message);
                    // 只在开发环境下记录响应文本片段
                    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                        logger.error('响应文本片段:', text.substring(0, 200));
                    }
                    throw new Error(`JSON解析失败: ${jsonError.message}`);
                }
            } catch (firstAttemptError) {
                // 第一次尝试失败，记录错误并尝试使用完整URL
                logger.error('第一次API请求失败:', firstAttemptError.message);
                
                // 尝试使用完整URL调用API
                logger.info('尝试使用完整URL重试...');
                
                const response = await fetch(fullUrlWithParams, {
                    method: 'GET',
                    headers: headers,
                    credentials: 'same-origin',
                    signal: controller.signal,
                    cache: 'no-store',
                    mode: 'cors' 
                });
                
                logger.info(`第二次尝试状态: ${response.status} ${response.statusText}`);
                
                if (!response.ok) {
                    throw new Error(`两次API请求均失败: ${response.status} ${response.statusText}`);
                }
                
                const text = await response.text();
                const data = JSON.parse(text);
                
                // 清理超时计时器
                clearTimeout(timeoutId);
                
                // 渲染表格
                this.processAPIResponse(tableBlock, data, blockId);
            }
        } catch (error) {
            // 安全地清理超时计时器，确保变量已定义
            try {
                if (typeof timeoutId !== 'undefined') {
                    clearTimeout(timeoutId);
                }
            } catch (timerError) {
                logger.warn('清理计时器错误:', timerError);
            }
            
            // 检查是否是中止信号错误，提供更友好的消息
            if (error.name === 'AbortError') {
                logger.warn('请求被中止 - 可能是超时或页面导航中断');
                this.handleTableError(tableBlock, blockId, new Error('请求超时或被中断'));
                return;
            }
            
            logger.error('获取表格数据最终失败:', error.message);
            
            // 处理错误显示
            this.handleTableError(tableBlock, blockId, error);
        }
    }
    
    // 处理API响应并渲染表格
    processAPIResponse(tableBlock, data, blockId) {
        try {
            logger.info('处理API响应数据...');
            
            // 检查results字段
            if (!data.results) {
                logger.warn('响应数据缺少results字段');
                tableBlock.innerHTML = '<div class="table-error">无效的表格数据: 缺少results字段</div>';
                return;
            }
            
            logger.info(`获取到${data.results.length}行表格数据`);
            
            // 如果没有数据，显示空表格消息
            if (data.results.length === 0) {
                tableBlock.innerHTML = '<div class="table-empty">表格数据为空</div>';
                return;
            }
            
            // 创建表格数据对象
            const tableData = {
                rows: data.results.map(row => {
                    // 检查是否是表格行
                    if (row.type === 'table_row' && row.table_row && row.table_row.cells) {
                        return row.table_row.cells;
                    }
                    return [[{ type: 'text', text: { content: `非表格数据: ${row.type}` } }]];
                }),
                hasColumnHeader: true,
                hasRowHeader: false
            };
            
            // 渲染表格
            const tableHtml = this.renderTable(tableData);
            tableBlock.innerHTML = tableHtml;
            
            // 添加表格排序功能
            this.addTableSorting(tableBlock.querySelector('table'));
            
            logger.info('表格加载完成');
        } catch (error) {
            logger.error('处理API响应时出错:', error.message);
            tableBlock.innerHTML = `<div class="table-error">处理表格数据失败: ${error.message}</div>`;
        }
    }
    
    // 处理表格错误
    handleTableError(tableBlock, blockId, error) {
        // 确保错误信息正确显示
        let errorMessage = "未知错误";
        let errorDetails = "";
        
        if (error) {
            if (typeof error === 'string') {
                errorMessage = error;
            } else if (error instanceof Error) {
                errorMessage = error.message || error.toString();
                if (error.stack) {
                    // 只提取堆栈的第一行作为详情，避免过长的堆栈信息
                    errorDetails = error.stack.split('\n')[0];
                }
            } else if (typeof error === 'object') {
                try {
                    errorMessage = error.message || JSON.stringify(error);
                } catch (e) {
                    errorMessage = "无法序列化的错误对象";
                }
            } else {
                errorMessage = String(error);
            }
        }
        
        logger.info('最终错误信息:', errorMessage);
        
        // 创建错误显示元素
        const errorContainer = document.createElement('div');
        errorContainer.className = 'table-error-container';
        
        // 主要错误信息
        const errorMessageElem = document.createElement('div');
        errorMessageElem.className = 'table-error';
        errorMessageElem.innerHTML = `获取表格数据失败: ${errorMessage}`;
        errorContainer.appendChild(errorMessageElem);
        
        // 表格ID
        const idInfo = document.createElement('div');
        idInfo.className = 'table-error-details';
        idInfo.innerHTML = `表格ID: ${blockId}`;
        errorContainer.appendChild(idInfo);
        
        // 错误详情
        if (errorDetails) {
            const detailsElem = document.createElement('div');
            detailsElem.className = 'table-error-details';
            detailsElem.innerHTML = errorDetails;
            errorContainer.appendChild(detailsElem);
        }
        
        // 刷新按钮
        const refreshButton = document.createElement('button');
        refreshButton.className = 'table-refresh-button';
        refreshButton.textContent = '刷新表格';
        refreshButton.onclick = () => {
            logger.info('手动刷新表格');
            this.fetchTableData(tableBlock, blockId);
        };
        errorContainer.appendChild(refreshButton);
        
        // 替换表格内容
        tableBlock.innerHTML = '';
        tableBlock.appendChild(errorContainer);
    }

    // 渲染表格
    renderTable(tableData) {
        const { rows, hasColumnHeader, hasRowHeader } = tableData;
        
        // 处理空数据情况
        if (!rows || rows.length === 0) {
            logger.warn('表格数据为空');
            return '<div class="table-empty">空表格</div>';
        }
        
        // 分析表格结构
        logger.info('表格数据行数:', rows.length);
        
        // 检查每行的列数
        const columnCounts = rows.map(row => row.length);
        logger.info('每行的列数:', columnCounts);
        
        // 确定实际列数 - 使用最大列数确保所有数据都能显示
        const maxColumnCount = Math.max(...columnCounts);
        // 但如果所有行的列数都一致，就使用这个一致的列数
        const isConsistentColumns = new Set(columnCounts).size === 1;
        const columnCount = isConsistentColumns ? columnCounts[0] : maxColumnCount;
        
        logger.info('实际列数:', columnCount);
        
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
        // 内联实现HTML转义，避免调用this.escapeHtml
        const escapeHtml = (text) => {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };
        
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
            return escapeHtml(cell);
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
                    return escapeHtml(String(item));
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
                
                content = escapeHtml(content);
                
                // 应用文本样式
                if (item.annotations) {
                    if (item.annotations.bold) content = `<strong>${content}</strong>`;
                    if (item.annotations.italic) content = `<em>${content}</em>`;
                    if (item.annotations.strikethrough) content = `<del>${content}</del>`;
                    if (item.annotations.underline) content = `<u>${content}</u>`;
                }
                
                return content;
            }).join('');
            
            return renderedContent || '&nbsp;';
        }
        
        // 处理对象类型
        if (typeof cell === 'object' && cell !== null) {
            return escapeHtml(JSON.stringify(cell));
        }
        
        return escapeHtml(String(cell));
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
    processAllTables(container = document) {
        // 接受可选的容器参数，默认为整个文档
        const tableBlocks = container.querySelectorAll('.lazy-block.table-block');
        
        if (tableBlocks.length === 0) {
            logger.info('没有找到表格块');
            return;
        }
        
        logger.info(`找到 ${tableBlocks.length} 个表格块`);
        
        // 如果之前已存在观察器，先断开与所有元素的连接
        if (this.observer) {
            this.observer.disconnect();
        }
        
        tableBlocks.forEach(tableBlock => {
            // 检查表格是否已经加载
            const isLoaded = tableBlock.querySelector('table') !== null;
            if (isLoaded) {
                logger.info('表格已加载，跳过');
                return;
            }
            
            if (this.observer) {
                logger.info('使用IntersectionObserver观察表格块');
                this.observer.observe(tableBlock);
            } else {
                // 如果不支持 IntersectionObserver，直接加载
                logger.info('不支持IntersectionObserver，直接加载表格');
                this.loadTable(tableBlock);
            }
        });
    }
}

// 创建单例
export const tableLazyLoader = new TableLazyLoader();

// 将实例添加到全局对象，确保可以在全局范围内访问
if (typeof window !== 'undefined') {
    window.tableLazyLoader = tableLazyLoader;
    logger.info('表格懒加载器已注册为全局对象');
}