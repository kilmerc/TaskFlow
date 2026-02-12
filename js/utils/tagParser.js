/**
 * Parses a raw task title string to extract inline tags.
 * Tags are identified by the '#' character followed by alphanumeric characters.
 * 
 * @param {string} rawTitle - The input text containing the title and tags.
 * @returns {Object} An object containing the cleaned title and an array of unique tags.
 */
export function parseTagsFromTitle(rawTitle) {
    if (!rawTitle) {
        return { title: '', tags: [] };
    }

    const tagRegex = /#([\w-]+)/g;
    const tags = [];
    const titleParts = [];

    // Split by spaces to preserve word boundaries, but regex is good for extraction.
    // However, we need to remove the tags from the title string.

    // Better approach: replace tags with empty string to get title, and match to get tags.

    let match;
    while ((match = tagRegex.exec(rawTitle)) !== null) {
        tags.push(match[1].toLowerCase());
    }

    // Remove tags from title
    const cleanTitle = rawTitle.replace(tagRegex, '').trim().replace(/\s+/g, ' ');

    // Deduplicate tags
    const uniqueTags = [...new Set(tags)];

    return {
        title: cleanTitle,
        tags: uniqueTags
    };
}
