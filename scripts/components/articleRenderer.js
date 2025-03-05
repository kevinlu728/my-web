// 文章内容渲染模块

// 主渲染函数
export function renderNotionBlocks(blocks) {
    if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
        return '<p>没有内容</p>';
    }
    
    return blocks.map(block => {
        switch (block.type) {
            case 'paragraph':
                return renderParagraph(block);
            case 'heading_1':
                return renderHeading(block, 'h1');
            case 'heading_2':
                return renderHeading(block, 'h2');
            case 'heading_3':
                return renderHeading(block, 'h3');
            case 'bulleted_list_item':
                return renderListItem(block, 'ul');
            case 'numbered_list_item':
                return renderListItem(block, 'ol');
            case 'to_do':
                return renderTodo(block);
            case 'toggle':
                return renderToggle(block);
            case 'code':
                return renderCode(block);
            case 'image':
                return renderImage(block);
            default:
                return `<div>不支持的块类型: ${block.type}</div>`;
        }
    }).join('');
}

// 渲染段落
function renderParagraph(block) {
    if (!block.paragraph || !block.paragraph.rich_text) {
        return '<p></p>';
    }
    
    const text = block.paragraph.rich_text.map(richText => {
        return renderRichText(richText);
    }).join('');
    
    return `<p>${text || '&nbsp;'}</p>`;
}

// 渲染标题
function renderHeading(block, tag) {
    if (!block[block.type] || !block[block.type].rich_text) {
        return `<${tag}></${tag}>`;
    }
    
    const text = block[block.type].rich_text.map(richText => {
        return renderRichText(richText);
    }).join('');
    
    return `<${tag}>${text || '&nbsp;'}</${tag}>`;
}

// 渲染列表项
function renderListItem(block, listType) {
    if (!block[block.type] || !block[block.type].rich_text) {
        return `<li></li>`;
    }
    
    const text = block[block.type].rich_text.map(richText => {
        return renderRichText(richText);
    }).join('');
    
    return `<li>${text || '&nbsp;'}</li>`;
}

// 渲染待办事项
function renderTodo(block) {
    if (!block.to_do || !block.to_do.rich_text) {
        return `<div class="todo"></div>`;
    }
    
    const text = block.to_do.rich_text.map(richText => {
        return renderRichText(richText);
    }).join('');
    
    const checked = block.to_do.checked ? 'checked' : '';
    
    return `
        <div class="todo">
            <input type="checkbox" ${checked} disabled>
            <span>${text || '&nbsp;'}</span>
        </div>
    `;
}

// 渲染折叠块
function renderToggle(block) {
    if (!block.toggle || !block.toggle.rich_text) {
        return `<details><summary></summary></details>`;
    }
    
    const text = block.toggle.rich_text.map(richText => {
        return renderRichText(richText);
    }).join('');
    
    return `
        <details>
            <summary>${text || '&nbsp;'}</summary>
            <div>折叠内容</div>
        </details>
    `;
}

// 渲染代码块
function renderCode(block) {
    if (!block.code || !block.code.rich_text) {
        return `<pre><code></code></pre>`;
    }
    
    const text = block.code.rich_text.map(richText => {
        return richText.plain_text;
    }).join('');
    
    const language = block.code.language || '';
    
    return `
        <pre><code class="language-${language}">${text || '&nbsp;'}</code></pre>
    `;
}

// 渲染图片
function renderImage(block) {
    if (!block.image) {
        return `<div class="image-placeholder">图片</div>`;
    }
    
    let url = '';
    if (block.image.type === 'external') {
        url = block.image.external.url;
    } else if (block.image.type === 'file') {
        url = block.image.file.url;
    }
    
    if (!url) {
        return `<div class="image-placeholder">图片</div>`;
    }
    
    return `<img src="${url}" alt="图片" style="max-width: 100%;">`;
}

// 渲染富文本
function renderRichText(richText) {
    if (!richText || !richText.plain_text) {
        return '';
    }
    
    let text = richText.plain_text;
    
    // 转义 HTML 特殊字符
    text = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    
    // 应用文本样式
    if (richText.annotations) {
        if (richText.annotations.bold) {
            text = `<strong>${text}</strong>`;
        }
        if (richText.annotations.italic) {
            text = `<em>${text}</em>`;
        }
        if (richText.annotations.strikethrough) {
            text = `<del>${text}</del>`;
        }
        if (richText.annotations.underline) {
            text = `<u>${text}</u>`;
        }
        if (richText.annotations.code) {
            text = `<code>${text}</code>`;
        }
    }
    
    // 处理链接
    if (richText.href) {
        text = `<a href="${richText.href}" target="_blank">${text}</a>`;
    }
    
    return text;
} 