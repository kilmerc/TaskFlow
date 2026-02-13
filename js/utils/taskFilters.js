export const PRIORITY_VALUES = ['I', 'II', 'III', 'IV'];

export function normalizePriority(priority) {
    return PRIORITY_VALUES.includes(priority) ? priority : null;
}

export function taskMatchesFilters(task, activeFilters) {
    if (!task) return false;

    const filters = activeFilters || {};
    const tags = Array.isArray(filters.tags) ? filters.tags : [];
    const priorities = Array.isArray(filters.priorities) ? filters.priorities : [];

    const matchesTags = tags.length === 0 || (
        Array.isArray(task.tags) &&
        task.tags.some(tag => tags.includes(tag))
    );

    const matchesPriorities = priorities.length === 0 || (
        task.priority &&
        priorities.includes(task.priority)
    );

    return matchesTags && matchesPriorities;
}

export function hasActiveFilters(activeFilters) {
    const filters = activeFilters || {};
    const tags = Array.isArray(filters.tags) ? filters.tags : [];
    const priorities = Array.isArray(filters.priorities) ? filters.priorities : [];
    return tags.length > 0 || priorities.length > 0;
}
