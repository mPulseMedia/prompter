// HTML extraction module for converting HTML back to txt format

// Extract lines from index HTML (li elements)
function index_html_extract(html_content) {
    console.log('Extracting index lines from HTML');
    
    // Match all li elements and extract their text content
    const li_regex = /<li[^>]*>([^<]+)<\/li>/g;
    const lines    = [];
    let match;
    
    while ((match = li_regex.exec(html_content)) !== null) {
        lines.push(match[1].trim());
    }
    
    console.log(`Extracted ${lines.length} lines from index HTML`);
    return lines;
}

// Extract lines from outline HTML (div elements with indentation)
function outline_html_extract(html_content) {
    console.log('Extracting outline lines from HTML');
    
    // Match div elements with margin-left style
    const div_regex = /<div\s+style="margin-left:\s*(\d+)px[^"]*"[^>]*>([^<]+)<\/div>|<div\s+style="margin-left:\s*(\d+)px[^"]*"[^>]*>\s*<span[^>]*>([^<]+)<\/span>\s*<span[^>]*>([^<]+)<\/span>\s*<\/div>/g;
    const lines     = [];
    let match;
    
    while ((match = div_regex.exec(html_content)) !== null) {
        if (match[2]) {
            // Simple div with text
            const indent_px = parseInt(match[1]);
            const tab_count = Math.floor(indent_px / 60);
            const tabs      = '\t'.repeat(tab_count);
            const text      = match[2].trim();
            lines.push(tabs + text);
        } else if (match[5]) {
            // Div with outline number and text spans
            const indent_px      = parseInt(match[3]);
            const tab_count      = Math.floor(indent_px / 60);
            const tabs           = '\t'.repeat(tab_count);
            const outline_number = match[4].trim();
            const text_content   = match[5].trim();
            lines.push(tabs + outline_number + ' ' + text_content);
        }
    }
    
    console.log(`Extracted ${lines.length} lines from outline HTML`);
    return lines;
}

// General extraction function
function field_text_extract(html_content, file_type) {
    if (file_type === 'app_index' || file_type === 'index') {
        return index_html_extract(html_content);
    } else if (file_type === 'start_file' || file_type === 'outline') {
        return outline_html_extract(html_content);
    }
    return [];
}

// Export the functions
module.exports = {
    field_text_extract,
    index_html_extract,
    outline_html_extract
}; 