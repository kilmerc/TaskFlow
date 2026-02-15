const { computed } = Vue;

const ICONS = Object.freeze({
    'alert-triangle': [
        { tag: 'path', attrs: { d: 'm10.29 3.86-8.32 14.5A2 2 0 0 0 3.7 21h16.6a2 2 0 0 0 1.73-2.64l-8.32-14.5a2 2 0 0 0-3.42 0z' } },
        { tag: 'line', attrs: { x1: '12', y1: '9', x2: '12', y2: '13' } },
        { tag: 'line', attrs: { x1: '12', y1: '17', x2: '12.01', y2: '17' } }
    ],
    'layout-columns': [
        { tag: 'rect', attrs: { x: '3', y: '4', width: '18', height: '16', rx: '2' } },
        { tag: 'line', attrs: { x1: '12', y1: '4', x2: '12', y2: '20' } }
    ],
    'calendar-days': [
        { tag: 'rect', attrs: { x: '3', y: '4', width: '18', height: '18', rx: '2' } },
        { tag: 'line', attrs: { x1: '16', y1: '2', x2: '16', y2: '6' } },
        { tag: 'line', attrs: { x1: '8', y1: '2', x2: '8', y2: '6' } },
        { tag: 'line', attrs: { x1: '3', y1: '10', x2: '21', y2: '10' } },
        { tag: 'line', attrs: { x1: '8', y1: '14', x2: '8.01', y2: '14' } },
        { tag: 'line', attrs: { x1: '12', y1: '14', x2: '12.01', y2: '14' } },
        { tag: 'line', attrs: { x1: '16', y1: '14', x2: '16.01', y2: '14' } },
        { tag: 'line', attrs: { x1: '8', y1: '18', x2: '8.01', y2: '18' } },
        { tag: 'line', attrs: { x1: '12', y1: '18', x2: '12.01', y2: '18' } },
        { tag: 'line', attrs: { x1: '16', y1: '18', x2: '16.01', y2: '18' } }
    ],
    'layout-grid': [
        { tag: 'rect', attrs: { x: '3', y: '3', width: '7', height: '7', rx: '1' } },
        { tag: 'rect', attrs: { x: '14', y: '3', width: '7', height: '7', rx: '1' } },
        { tag: 'rect', attrs: { x: '14', y: '14', width: '7', height: '7', rx: '1' } },
        { tag: 'rect', attrs: { x: '3', y: '14', width: '7', height: '7', rx: '1' } }
    ],
    copy: [
        { tag: 'rect', attrs: { x: '9', y: '9', width: '13', height: '13', rx: '2' } },
        { tag: 'path', attrs: { d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' } }
    ],
    trash: [
        { tag: 'path', attrs: { d: 'M3 6h18' } },
        { tag: 'path', attrs: { d: 'M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2' } },
        { tag: 'path', attrs: { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6' } },
        { tag: 'line', attrs: { x1: '10', y1: '11', x2: '10', y2: '17' } },
        { tag: 'line', attrs: { x1: '14', y1: '11', x2: '14', y2: '17' } }
    ],
    download: [
        { tag: 'path', attrs: { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' } },
        { tag: 'polyline', attrs: { points: '7 10 12 15 17 10' } },
        { tag: 'line', attrs: { x1: '12', y1: '15', x2: '12', y2: '3' } }
    ],
    upload: [
        { tag: 'path', attrs: { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' } },
        { tag: 'polyline', attrs: { points: '17 8 12 3 7 8' } },
        { tag: 'line', attrs: { x1: '12', y1: '3', x2: '12', y2: '15' } }
    ],
    sun: [
        { tag: 'circle', attrs: { cx: '12', cy: '12', r: '4' } },
        { tag: 'line', attrs: { x1: '12', y1: '2', x2: '12', y2: '4' } },
        { tag: 'line', attrs: { x1: '12', y1: '20', x2: '12', y2: '22' } },
        { tag: 'line', attrs: { x1: '4.93', y1: '4.93', x2: '6.34', y2: '6.34' } },
        { tag: 'line', attrs: { x1: '17.66', y1: '17.66', x2: '19.07', y2: '19.07' } },
        { tag: 'line', attrs: { x1: '2', y1: '12', x2: '4', y2: '12' } },
        { tag: 'line', attrs: { x1: '20', y1: '12', x2: '22', y2: '12' } },
        { tag: 'line', attrs: { x1: '4.93', y1: '19.07', x2: '6.34', y2: '17.66' } },
        { tag: 'line', attrs: { x1: '17.66', y1: '6.34', x2: '19.07', y2: '4.93' } }
    ],
    moon: [
        { tag: 'path', attrs: { d: 'M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z' } }
    ],
    x: [
        { tag: 'line', attrs: { x1: '18', y1: '6', x2: '6', y2: '18' } },
        { tag: 'line', attrs: { x1: '6', y1: '6', x2: '18', y2: '18' } }
    ],
    'check-square': [
        { tag: 'rect', attrs: { x: '3', y: '3', width: '18', height: '18', rx: '2' } },
        { tag: 'path', attrs: { d: 'm9 12 2 2 4-4' } }
    ],
    'chevron-left': [{ tag: 'path', attrs: { d: 'm15 18-6-6 6-6' } }],
    'chevron-right': [{ tag: 'path', attrs: { d: 'm9 18 6-6-6-6' } }],
    'chevron-down': [{ tag: 'path', attrs: { d: 'm6 9 6 6 6-6' } }],
    'plus': [
        { tag: 'line', attrs: { x1: '12', y1: '5', x2: '12', y2: '19' } },
        { tag: 'line', attrs: { x1: '5', y1: '12', x2: '19', y2: '12' } }
    ],
    search: [
        { tag: 'circle', attrs: { cx: '11', cy: '11', r: '8' } },
        { tag: 'line', attrs: { x1: '21', y1: '21', x2: '16.65', y2: '16.65' } }
    ],
    clock: [
        { tag: 'circle', attrs: { cx: '12', cy: '12', r: '9' } },
        { tag: 'polyline', attrs: { points: '12 7 12 12 15 15' } }
    ],
    'grip-vertical': [
        { tag: 'circle', attrs: { cx: '9', cy: '6', r: '1' } },
        { tag: 'circle', attrs: { cx: '9', cy: '12', r: '1' } },
        { tag: 'circle', attrs: { cx: '9', cy: '18', r: '1' } },
        { tag: 'circle', attrs: { cx: '15', cy: '6', r: '1' } },
        { tag: 'circle', attrs: { cx: '15', cy: '12', r: '1' } },
        { tag: 'circle', attrs: { cx: '15', cy: '18', r: '1' } }
    ],
    ellipsis: [
        { tag: 'circle', attrs: { cx: '5', cy: '12', r: '1.5' } },
        { tag: 'circle', attrs: { cx: '12', cy: '12', r: '1.5' } },
        { tag: 'circle', attrs: { cx: '19', cy: '12', r: '1.5' } }
    ],
    pencil: [
        { tag: 'path', attrs: { d: 'M12 20h9' } },
        { tag: 'path', attrs: { d: 'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z' } }
    ],
    filter: [
        { tag: 'polygon', attrs: { points: '22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3' } }
    ]
});

const AppIcon = {
    name: 'AppIcon',
    inheritAttrs: false,
    props: {
        name: {
            type: String,
            required: true
        },
        size: {
            type: [String, Number],
            default: 16
        },
        strokeWidth: {
            type: [String, Number],
            default: 1.75
        },
        ariaHidden: {
            type: Boolean,
            default: true
        },
        label: {
            type: String,
            default: ''
        }
    },
    template: `
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="app-icon"
            :width="size"
            :height="size"
            :stroke-width="strokeWidth"
            :role="ariaHidden ? null : 'img'"
            :aria-hidden="ariaHidden ? 'true' : null"
            :aria-label="!ariaHidden && label ? label : null"
            v-bind="$attrs"
        >
            <component
                v-for="(node, index) in iconNodes"
                :is="node.tag"
                :key="index"
                v-bind="node.attrs"
            ></component>
        </svg>
    `,
    setup(props) {
        const iconNodes = computed(() => {
            return ICONS[props.name] || ICONS.x;
        });

        return {
            iconNodes
        };
    }
};

export default AppIcon;
