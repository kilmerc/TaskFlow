var parseTagsFromTitle = (function () {
    return function (rawTitle) {
        if (!rawTitle) return { title: '', tags: [] };

        const tagRegex = /#(\w[\w-]*)/g;
        const tags = [];
        let match;

        while ((match = tagRegex.exec(rawTitle)) !== null) {
            tags.push(match[1].toLowerCase());
        }

        // Remove tags from title and clean up extra spaces
        const cleanTitle = rawTitle.replace(tagRegex, '').replace(/\s{2,}/g, ' ').trim();

        // Deduplicate tags
        const uniqueTags = [...new Set(tags)];

        return {
            title: cleanTitle || 'Untitled Task', // Fallback for empty title 
            tags: uniqueTags
        };
    };
})();

// Export for ES modules (if we were using them directly, but for now we attach to window/global based on earlier pattern? 
// No, the plan says `js/utils/tagParser.js`. The `app.js` likely needs to import it or it needs to be a global if no modules.
// Tech stack spec says "No build system", "Vue 2 via CDN". 
// `store.js` uses `export const store`. So we can use ES modules if `type="module"` is used in index.html.
// Let's check `index.html` to see if it uses `type="module"`.
// Wait, I can't check index.html right now without a tool call.
// But `store.js` had `export`, so ES modules ARE used.
// So I will export it.

export { parseTagsFromTitle };
