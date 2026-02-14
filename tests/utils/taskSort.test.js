import {
    buildWorkspaceManualRankMap,
    sortTaskIds,
    sortTaskObjects
} from '../../js/utils/taskSort.js';

const expect = chai.expect;

describe('taskSort utility', () => {
    const workspace = {
        id: 'ws_1',
        columns: ['col_1', 'col_2']
    };

    const columnTaskOrder = {
        col_1: ['task_a', 'task_b'],
        col_2: ['task_c']
    };

    const tasksById = {
        task_a: { id: 'task_a', dueDate: '2026-03-20', priority: 'IV', createdAt: '2026-01-02T10:00:00.000Z' },
        task_b: { id: 'task_b', dueDate: '2026-03-18', priority: 'I', createdAt: '2026-01-04T10:00:00.000Z' },
        task_c: { id: 'task_c', dueDate: null, priority: null, createdAt: '2026-01-03T10:00:00.000Z' }
    };

    const manualRankMap = buildWorkspaceManualRankMap(workspace, columnTaskOrder);

    it('should build deterministic manual rank map from workspace column order', () => {
        expect(manualRankMap.get('task_a')).to.equal(0);
        expect(manualRankMap.get('task_b')).to.equal(1);
        expect(manualRankMap.get('task_c')).to.equal(2);
    });

    it('should sort task objects by due date, priority, and created date', () => {
        const tasks = Object.values(tasksById);

        const dueDateSorted = sortTaskObjects(tasks, { sortMode: 'dueDate', manualRankMap });
        expect(dueDateSorted.map(task => task.id)).to.deep.equal(['task_b', 'task_a', 'task_c']);

        const prioritySorted = sortTaskObjects(tasks, { sortMode: 'priority', manualRankMap });
        expect(prioritySorted.map(task => task.id)).to.deep.equal(['task_b', 'task_a', 'task_c']);

        const createdSorted = sortTaskObjects(tasks, { sortMode: 'createdAt', manualRankMap });
        expect(createdSorted.map(task => task.id)).to.deep.equal(['task_b', 'task_c', 'task_a']);
    });

    it('should preserve manual order for task ids in manual mode and sort in non-manual mode', () => {
        const input = ['task_b', 'task_a', 'task_c'];
        const manual = sortTaskIds(input, tasksById, { sortMode: 'manual', manualRankMap });
        const byPriority = sortTaskIds(input, tasksById, { sortMode: 'priority', manualRankMap });

        expect(manual).to.deep.equal(input);
        expect(byPriority).to.deep.equal(['task_b', 'task_a', 'task_c']);
    });

    it('should apply manual rank tie-breaker for equal primary sort values', () => {
        const tiedTasks = [
            { id: 'task_x', dueDate: '2026-04-01', priority: 'II', createdAt: '2026-01-01T00:00:00.000Z' },
            { id: 'task_y', dueDate: '2026-04-01', priority: 'II', createdAt: '2026-01-01T00:00:00.000Z' }
        ];
        const tieRankMap = new Map([
            ['task_y', 0],
            ['task_x', 1]
        ]);

        const sorted = sortTaskObjects(tiedTasks, { sortMode: 'dueDate', manualRankMap: tieRankMap });
        expect(sorted.map(task => task.id)).to.deep.equal(['task_y', 'task_x']);
    });
});
