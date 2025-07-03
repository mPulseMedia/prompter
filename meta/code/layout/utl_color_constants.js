// __const_global
// Global color constants used across all template files and components

const COLORS = {
    // Core theme colors
    BG: '#1e1e1e',
    TEXT: '#ffffff',
    GRAY: '#4a4a4a',
    GRAY_DARK: '#4e5561',
    HOVER: '#2d2d2d',
    EDIT_BORDER: '#007AFF',
    GREEN: '#2ea043',
    
    // Syntax highlighting colors (Cursor.ai theme)
    FUNCTION_DEF_YELLOW: '#dcdcaa',
    FILE_BLUE: '#9cdcfe',
    CSS_PINK: '#ce9178',
    COMMENT_GRAY: '#8a8a8a',
    
    // Big page specific colors
    FOLDER_BLUE: '#569cd6',
    FUNCTION_CALL_ORANGE: '#7a3c07'
};

// CSS custom properties string for use in templates
const CSS_VARIABLES = `
    :root {
        --bg:          ${COLORS.BG};
        --text:        ${COLORS.TEXT};
        --gray:        ${COLORS.GRAY};
        --gray-dark:   ${COLORS.GRAY_DARK};
        --hover:       ${COLORS.HOVER};
        --edit-border: ${COLORS.EDIT_BORDER};
        --green:       ${COLORS.GREEN};
        
        /* Cursor.ai syntax colors */
        --function-def-yellow: ${COLORS.FUNCTION_DEF_YELLOW};
        --file-blue:       ${COLORS.FOLDER_BLUE};
        --css-pink:        ${COLORS.CSS_PINK};
        --comment-gray:    ${COLORS.COMMENT_GRAY};
        
        /* Big page specific colors */
        --folder-blue: ${COLORS.FOLDER_BLUE};
        --function-call-orange: ${COLORS.FUNCTION_CALL_ORANGE};
    }`;

module.exports = {
    COLORS,
    CSS_VARIABLES
};