/**
 * AEGIS Core Voice - Utilities
 */
export const utils = {
    stripMarkdown: (text) => {
        if (!text) return "";
        return text
            .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // links
            .replace(/[*_~`]/g, '')                // styles
            .replace(/#+\s+/g, '')                  // headers
            .trim();
    }
};
