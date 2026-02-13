export function normalizeTag(raw) {
    if (raw === null || raw === undefined) return '';

    const value = String(raw)
        .trim()
        .replace(/^#+/, '')
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9_-]/g, '');

    return value;
}

export function normalizeTagList(tags) {
    if (!Array.isArray(tags)) return [];

    const normalized = [];
    const seen = new Set();

    tags.forEach(rawTag => {
        const tag = normalizeTag(rawTag);
        if (!tag || seen.has(tag)) return;
        seen.add(tag);
        normalized.push(tag);
    });

    return normalized;
}

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

    let match;
    while ((match = tagRegex.exec(rawTitle)) !== null) {
        tags.push(match[1]);
    }

    const cleanTitle = rawTitle.replace(tagRegex, '').trim().replace(/\s+/g, ' ');

    return {
        title: cleanTitle,
        tags: normalizeTagList(tags)
    };
}
