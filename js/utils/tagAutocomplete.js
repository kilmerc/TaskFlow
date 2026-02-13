import { normalizeTag } from './tagParser.js';

function isTokenChar(char) {
    return /[A-Za-z0-9_-]/.test(char);
}

function isHashBoundary(text, hashIndex) {
    if (hashIndex <= 0) return true;
    return /\s/.test(text[hashIndex - 1]);
}

export function getActiveHashToken(text, caretIndex) {
    if (typeof text !== 'string') return null;
    if (typeof caretIndex !== 'number') return null;

    const clampedCaret = Math.max(0, Math.min(caretIndex, text.length));
    if (!text.length || clampedCaret === 0) return null;

    let hashIndex = -1;

    let scan = clampedCaret - 1;
    while (scan >= 0 && isTokenChar(text[scan])) {
        scan -= 1;
    }

    if (scan >= 0 && text[scan] === '#') {
        hashIndex = scan;
    } else if (text[clampedCaret - 1] === '#') {
        hashIndex = clampedCaret - 1;
    }

    if (hashIndex === -1 || !isHashBoundary(text, hashIndex)) {
        return null;
    }

    let tokenEnd = hashIndex + 1;
    while (tokenEnd < text.length && isTokenChar(text[tokenEnd])) {
        tokenEnd += 1;
    }

    if (clampedCaret < hashIndex + 1 || clampedCaret > tokenEnd) {
        return null;
    }

    return {
        start: hashIndex,
        end: tokenEnd,
        query: text.slice(hashIndex + 1, clampedCaret)
    };
}

export function replaceHashToken(text, range, tagValue) {
    if (typeof text !== 'string') {
        return { text: '', caretIndex: 0 };
    }

    if (!range || typeof range.start !== 'number' || typeof range.end !== 'number') {
        return { text, caretIndex: text.length };
    }

    const normalized = normalizeTag(tagValue);
    if (!normalized) {
        return { text, caretIndex: range.end };
    }

    const start = Math.max(0, Math.min(range.start, text.length));
    const end = Math.max(start, Math.min(range.end, text.length));
    const prefix = text.slice(0, start);
    const suffix = text.slice(end);

    const insertion = `#${normalized}`;
    const needsTrailingSpace = suffix.length === 0 || !/^[\s.,!?;:)]/.test(suffix);
    const spacer = needsTrailingSpace ? ' ' : '';

    const nextText = `${prefix}${insertion}${spacer}${suffix}`;
    const caretIndex = (prefix + insertion + spacer).length;

    return {
        text: nextText,
        caretIndex
    };
}

export function getWorkspaceTags(workspaceId, appStore) {
    if (!workspaceId || !appStore || !appStore.tasks || !appStore.columns) {
        return [];
    }

    const tags = new Set();
    Object.values(appStore.tasks).forEach(task => {
        if (!task || !Array.isArray(task.tags) || !task.tags.length) {
            return;
        }

        const column = appStore.columns[task.columnId];
        if (!column || column.workspaceId !== workspaceId) {
            return;
        }

        task.tags.forEach(tag => tags.add(tag));
    });

    return Array.from(tags).sort((a, b) => a.localeCompare(b));
}
