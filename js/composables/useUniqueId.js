let uniqueIdSeed = 0;

export function useUniqueId(prefix = 'id') {
    const { ref } = Vue;
    uniqueIdSeed += 1;
    return ref(`${prefix}-${uniqueIdSeed}`);
}
