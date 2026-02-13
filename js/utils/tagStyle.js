const TAG_HUES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

export function getTagStyle(tag) {
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
        hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = TAG_HUES[Math.abs(hash) % TAG_HUES.length];
    return {
        backgroundColor: `hsl(${hue}, 70%, 90%)`,
        color: `hsl(${hue}, 80%, 25%)`,
        border: `1px solid hsl(${hue}, 60%, 80%)`
    };
}
