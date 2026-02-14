import { PRIORITY_VALUES } from './taskFilters.js';

export const SORT_MODES = ['manual', 'dueDate', 'priority', 'createdAt'];
export const DEFAULT_SORT_MODE = 'manual';

const PRIORITY_RANK = PRIORITY_VALUES.reduce((acc, priority, index) => {
    acc[priority] = index;
    return acc;
}, {});

export function normalizeSortMode(sortMode) {
    return SORT_MODES.includes(sortMode) ? sortMode : DEFAULT_SORT_MODE;
}

function toTimestamp(value) {
    const timestamp = Date.parse(value || '');
    return Number.isFinite(timestamp) ? timestamp : null;
}

function compareManualRank(taskA, taskB, manualRankMap) {
    if (!(manualRankMap instanceof Map)) {
        return 0;
    }
    const rankA = manualRankMap.has(taskA.id) ? manualRankMap.get(taskA.id) : Number.MAX_SAFE_INTEGER;
    const rankB = manualRankMap.has(taskB.id) ? manualRankMap.get(taskB.id) : Number.MAX_SAFE_INTEGER;
    return rankA - rankB;
}

function compareCreatedAt(taskA, taskB) {
    const createdA = toTimestamp(taskA.createdAt) || 0;
    const createdB = toTimestamp(taskB.createdAt) || 0;
    return createdB - createdA;
}

function compareDueDate(taskA, taskB) {
    const dueA = toTimestamp(taskA.dueDate);
    const dueB = toTimestamp(taskB.dueDate);
    if (dueA === null && dueB === null) return 0;
    if (dueA === null) return 1;
    if (dueB === null) return -1;
    return dueA - dueB;
}

function comparePriority(taskA, taskB) {
    const rankA = Object.prototype.hasOwnProperty.call(PRIORITY_RANK, taskA.priority)
        ? PRIORITY_RANK[taskA.priority]
        : Number.MAX_SAFE_INTEGER;
    const rankB = Object.prototype.hasOwnProperty.call(PRIORITY_RANK, taskB.priority)
        ? PRIORITY_RANK[taskB.priority]
        : Number.MAX_SAFE_INTEGER;
    return rankA - rankB;
}

function compareTaskId(taskA, taskB) {
    return String(taskA.id || '').localeCompare(String(taskB.id || ''));
}

function compareTasks(taskA, taskB, sortMode, manualRankMap) {
    if (!taskA && !taskB) return 0;
    if (!taskA) return 1;
    if (!taskB) return -1;

    let primaryComparison = 0;
    if (sortMode === 'dueDate') {
        primaryComparison = compareDueDate(taskA, taskB);
    } else if (sortMode === 'priority') {
        primaryComparison = comparePriority(taskA, taskB);
    } else if (sortMode === 'createdAt') {
        primaryComparison = compareCreatedAt(taskA, taskB);
    } else {
        primaryComparison = compareManualRank(taskA, taskB, manualRankMap);
    }

    if (primaryComparison !== 0) {
        return primaryComparison;
    }

    const manualComparison = compareManualRank(taskA, taskB, manualRankMap);
    if (manualComparison !== 0) {
        return manualComparison;
    }

    const createdAtComparison = compareCreatedAt(taskA, taskB);
    if (createdAtComparison !== 0) {
        return createdAtComparison;
    }

    return compareTaskId(taskA, taskB);
}

export function buildWorkspaceManualRankMap(workspace, columnTaskOrder) {
    const rankMap = new Map();
    if (!workspace || !Array.isArray(workspace.columns)) {
        return rankMap;
    }

    let rank = 0;
    workspace.columns.forEach(columnId => {
        const order = Array.isArray(columnTaskOrder[columnId]) ? columnTaskOrder[columnId] : [];
        order.forEach(taskId => {
            if (!rankMap.has(taskId)) {
                rankMap.set(taskId, rank);
                rank += 1;
            }
        });
    });
    return rankMap;
}

export function sortTaskObjects(tasks, options = {}) {
    const source = Array.isArray(tasks) ? tasks : [];
    const sortMode = normalizeSortMode(options.sortMode);
    const manualRankMap = options.manualRankMap instanceof Map ? options.manualRankMap : new Map();

    return [...source].sort((taskA, taskB) => compareTasks(taskA, taskB, sortMode, manualRankMap));
}

export function sortTaskIds(taskIds, tasksById, options = {}) {
    const source = Array.isArray(taskIds) ? taskIds : [];
    const sortMode = normalizeSortMode(options.sortMode);
    const manualRankMap = options.manualRankMap instanceof Map ? options.manualRankMap : new Map();

    if (sortMode === DEFAULT_SORT_MODE) {
        return [...source];
    }

    return [...source].sort((taskAId, taskBId) => {
        const taskA = tasksById[taskAId];
        const taskB = tasksById[taskBId];
        return compareTasks(taskA, taskB, sortMode, manualRankMap);
    });
}
