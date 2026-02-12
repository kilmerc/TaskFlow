export function parseTagsFromTitle(rawTitle) {
    const tagRegex = /#(\w[\w-]*)/g;
    const tags = [];
    let match;
    while ((match = tagRegex.exec(rawTitle)) !== null) {
        tags.push(match[1].toLowerCase());
    }
    const cleanTitle = rawTitle.replace(tagRegex, '').replace(/\s{2,}/g, ' ').trim();
    return { title: cleanTitle, tags: [...new Set(tags)] };
}
