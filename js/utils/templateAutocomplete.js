import { normalizeTag } from './tagParser.js';

function isTokenChar(char) {
    return /[A-Za-z0-9_-]/.test(char);
}

export function getActiveSlashToken(text, caretIndex) {
    if (typeof text !== 'string' || typeof caretIndex !== 'number') {
        return null;
    }

    const clampedCaret = Math.max(0, Math.min(caretIndex, text.length));
    if (!text.startsWith('/')) {
        return null;
    }

    let tokenEnd = 1;
    while (tokenEnd < text.length && isTokenChar(text[tokenEnd])) {
        tokenEnd += 1;
    }

    if (clampedCaret < 1 || clampedCaret > tokenEnd) {
        return null;
    }

    return {
        start: 0,
        end: tokenEnd,
        query: text.slice(1, clampedCaret)
    };
}

export function replaceSlashToken(text, range, templateName) {
    if (typeof text !== 'string') {
        return { text: '', caretIndex: 0 };
    }

    if (!range || typeof range.start !== 'number' || typeof range.end !== 'number') {
        return { text, caretIndex: text.length };
    }

    const normalized = normalizeTag(templateName);
    if (!normalized) {
        return { text, caretIndex: range.end };
    }

    const start = Math.max(0, Math.min(range.start, text.length));
    const end = Math.max(start, Math.min(range.end, text.length));
    const prefix = text.slice(0, start);
    const suffix = text.slice(end);

    const insertion = `/${normalized}`;
    const needsTrailingSpace = suffix.length === 0 || !/^[\s.,!?;:)]/.test(suffix);
    const spacer = needsTrailingSpace ? ' ' : '';

    const nextText = `${prefix}${insertion}${spacer}${suffix}`;
    const caretIndex = (prefix + insertion + spacer).length;

    return {
        text: nextText,
        caretIndex
    };
}

export function parseTemplateCommand(text) {
    if (typeof text !== 'string' || !text.startsWith('/')) {
        return null;
    }

    const value = text.slice(1);
    let index = 0;
    while (index < value.length && !/\s/.test(value[index])) {
        index += 1;
    }

    const templateName = value.slice(0, index);
    const remainder = index >= value.length ? '' : value.slice(index).trim();

    return {
        templateName,
        remainder
    };
}
