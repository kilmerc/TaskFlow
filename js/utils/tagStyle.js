const TAG_HUES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

export function getTagToneClass(tag) {
    if (typeof tag !== 'string' || !tag.length) {
        return 'tag-tone-0';
    }

    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
        hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }

    const paletteIndex = Math.abs(hash) % TAG_HUES.length;
    return `tag-tone-${paletteIndex}`;
}
