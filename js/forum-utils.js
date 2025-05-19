// Utility functions for forum content processing

// Escape HTML to prevent XSS
export function escapeHTML(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Process text for greentext and links
export function processGreentextAndLinks(text) {
    if (!text) return '';
    
    // Escape HTML first
    let processed = escapeHTML(text);
    
    // Process greentext (lines starting with >)
    processed = processed.replace(/^(&gt;.*)$/gm, '<span class="greentext">$1</span>');
    
    // Replace URLs with links
    processed = processed.replace(
        /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g, 
        '<a href="$1" target="_blank">$1</a>'
    );
    
    return processed;
}

// Extract image URL from content if it exists
export function extractImageHtml(content, imageUrl = null) {
    // First check if we have a direct image URL from the server (attached image)
    if (imageUrl) {
        return `<img src="${escapeHTML(imageUrl)}" class="post-image" onclick="window.open(this.src, '_blank')">`;
    }
    
    // Otherwise, look for image URLs in the content
    if (!content) return '';
    
    // Find image URL in content (basic pattern matching)
    const imgMatch = content.match(/(https?:\/\/.*?\.(?:png|jpg|jpeg|gif|webp))/i);
    if (imgMatch) {
        return `<img src="${escapeHTML(imgMatch[0])}" class="post-image" onclick="window.open(this.src, '_blank')">`;
    }
    
    return '';
}

// Format timestamp helper
export function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
} 