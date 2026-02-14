export const PRIORITY_VALUES = ['I', 'II', 'III', 'IV'];

export function normalizePriority(priority) {
    return PRIORITY_VALUES.includes(priority) ? priority : null;
}

function normalizeSearchQuery(searchQuery) {
    if (typeof searchQuery !== 'string') {
        return '';
    }
    return searchQuery.trim().toLowerCase();
}

function taskMatchesSearchQuery(task, normalizedQuery) {
    if (!normalizedQuery) {
        return true;
    }

    const title = typeof task.title === 'string' ? task.title.toLowerCase() : '';
    const description = typeof task.description === 'string' ? task.description.toLowerCase() : '';
    const tags = Array.isArray(task.tags)
        ? task.tags.filter(tag => typeof tag === 'string').map(tag => tag.toLowerCase())
        : [];

    return title.includes(normalizedQuery)
        || description.includes(normalizedQuery)
        || tags.some(tag => tag.includes(normalizedQuery));
}

export function taskMatchesFilters(task, activeFilters, searchQuery = '') {
    if (!task) return false;

    const filters = activeFilters || {};
    const tags = Array.isArray(filters.tags) ? filters.tags : [];
    const priorities = Array.isArray(filters.priorities) ? filters.priorities : [];
    const normalizedQuery = normalizeSearchQuery(searchQuery);

    const matchesTags = tags.length === 0 || (
        Array.isArray(task.tags) &&
        task.tags.some(tag => tags.includes(tag))
    );

    const matchesPriorities = priorities.length === 0 || (
        task.priority &&
        priorities.includes(task.priority)
    );

    return matchesTags && matchesPriorities && taskMatchesSearchQuery(task, normalizedQuery);
}

export function hasActiveFilters(activeFilters) {
    const filters = activeFilters || {};
    const tags = Array.isArray(filters.tags) ? filters.tags : [];
    const priorities = Array.isArray(filters.priorities) ? filters.priorities : [];
    return tags.length > 0 || priorities.length > 0;
}
