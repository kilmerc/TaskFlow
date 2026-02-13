import { store, mutations, hydrate } from '../js/store.js';

const expect = chai.expect;

const BASELINE_STATE = {
    appVersion: '1.1',
    theme: 'light',
    currentWorkspaceId: 'ws_base',
    workspaces: [{
        id: 'ws_base',
        name: 'Baseline',
        columns: ['col_todo', 'col_inprogress', 'col_done']
    }],
    columns: {
        col_todo: { id: 'col_todo', workspaceId: 'ws_base', title: 'To Do', showCompleted: false },
        col_inprogress: { id: 'col_inprogress', workspaceId: 'ws_base', title: 'In Progress', showCompleted: false },
        col_done: { id: 'col_done', workspaceId: 'ws_base', title: 'Done', showCompleted: false }
    },
    tasks: {},
    columnTaskOrder: {
        col_todo: [],
        col_inprogress: [],
        col_done: []
    },
    activeFilters: {
        tags: [],
        priorities: []
    }
};

describe('Store', () => {
    beforeEach(() => {
        localStorage.clear();
        hydrate(JSON.parse(JSON.stringify(BASELINE_STATE)));
    });

    it('should add a workspace', () => {
        const initialCount = store.workspaces.length;
        mutations.addWorkspace('Test Workspace');

        expect(store.workspaces).to.have.lengthOf(initialCount + 1);
        expect(store.workspaces[store.workspaces.length - 1].name).to.equal('Test Workspace');
        expect(store.currentWorkspaceId).to.equal(store.workspaces[store.workspaces.length - 1].id);
    });

    it('should add default columns to new workspace', () => {
        mutations.addWorkspace('WS1');
        const ws = store.workspaces[store.workspaces.length - 1];
        expect(ws.columns).to.have.lengthOf(3);
        expect(store.columns[ws.columns[0]].title).to.equal('To Do');
    });

    it('should delete a workspace', () => {
        mutations.addWorkspace('WS1');
        const id = store.workspaces[store.workspaces.length - 1].id;
        const countBeforeDelete = store.workspaces.length;

        mutations.deleteWorkspace(id);
        expect(store.workspaces).to.have.lengthOf(countBeforeDelete - 1);
    });

    it('should add a task with parsed tags and default null priority', () => {
        const colId = store.workspaces[0].columns[0];
        mutations.addTask(colId, 'New Task #test');

        const taskIds = store.columnTaskOrder[colId];
        expect(taskIds).to.have.lengthOf(1);

        const task = store.tasks[taskIds[0]];
        expect(task.title).to.equal('New Task');
        expect(task.tags).to.include('test');
        expect(task.priority).to.equal(null);
    });

    it('should normalize and dedupe tags on updateTask', () => {
        const colId = store.workspaces[0].columns[0];
        mutations.addTask(colId, 'Tag Normalization Task');
        const taskId = store.columnTaskOrder[colId][0];

        mutations.updateTask(taskId, {
            tags: [' Team Ops ', 'team-ops', '#TEAM_ops', '']
        });

        expect(store.tasks[taskId].tags).to.deep.equal(['team-ops', 'team_ops']);
    });

    it('should move a task between columns', () => {
        const col1 = store.workspaces[0].columns[0];
        const col2 = store.workspaces[0].columns[1];

        mutations.addTask(col1, 'Moving Task');
        const taskId = store.columnTaskOrder[col1][0];

        mutations.moveTask(taskId, col1, col2, 0);

        expect(store.columnTaskOrder[col1]).to.have.lengthOf(0);
        expect(store.columnTaskOrder[col2]).to.have.lengthOf(1);
        expect(store.tasks[taskId].columnId).to.equal(col2);
    });

    it('should delete a task', () => {
        const colId = store.workspaces[0].columns[0];
        mutations.addTask(colId, 'Task to delete');
        const taskId = store.columnTaskOrder[colId][0];

        mutations.deleteTask(taskId);

        expect(store.tasks[taskId]).to.be.undefined;
        expect(store.columnTaskOrder[colId]).to.have.lengthOf(0);
    });

    it('should set and clear task priority', () => {
        const colId = store.workspaces[0].columns[0];
        mutations.addTask(colId, 'Priority Task');
        const taskId = store.columnTaskOrder[colId][0];

        mutations.setTaskPriority(taskId, 'II');
        expect(store.tasks[taskId].priority).to.equal('II');

        mutations.setTaskPriority(taskId, null);
        expect(store.tasks[taskId].priority).to.equal(null);
    });

    it('should toggle tag and priority filters independently', () => {
        mutations.toggleTagFilter('urgent');
        mutations.togglePriorityFilter('I');

        expect(store.activeFilters.tags).to.deep.equal(['urgent']);
        expect(store.activeFilters.priorities).to.deep.equal(['I']);

        mutations.toggleTagFilter('urgent');
        mutations.togglePriorityFilter('I');

        expect(store.activeFilters.tags).to.deep.equal([]);
        expect(store.activeFilters.priorities).to.deep.equal([]);
    });

    it('should clear both filter groups', () => {
        mutations.toggleTagFilter('ops');
        mutations.togglePriorityFilter('III');

        mutations.clearFilters();

        expect(store.activeFilters.tags).to.deep.equal([]);
        expect(store.activeFilters.priorities).to.deep.equal([]);
    });

    it('should migrate legacy activeFilter and normalize missing/invalid priority on hydrate', () => {
        hydrate({
            appVersion: '1.0',
            theme: 'light',
            currentWorkspaceId: 'ws_base',
            workspaces: BASELINE_STATE.workspaces,
            columns: BASELINE_STATE.columns,
            columnTaskOrder: {
                col_todo: ['task_1', 'task_2'],
                col_inprogress: [],
                col_done: []
            },
            tasks: {
                task_1: {
                    id: 'task_1',
                    columnId: 'col_todo',
                    title: 'Legacy Missing Priority',
                    tags: ['legacy'],
                    description: '',
                    color: 'gray',
                    dueDate: null,
                    subtasks: [],
                    isCompleted: false,
                    completedAt: null,
                    createdAt: new Date().toISOString()
                },
                task_2: {
                    id: 'task_2',
                    columnId: 'col_todo',
                    title: 'Legacy Invalid Priority',
                    tags: ['legacy'],
                    priority: 'V',
                    description: '',
                    color: 'gray',
                    dueDate: null,
                    subtasks: [],
                    isCompleted: false,
                    completedAt: null,
                    createdAt: new Date().toISOString()
                }
            },
            activeFilter: ['legacy']
        });

        expect(store.activeFilters.tags).to.deep.equal(['legacy']);
        expect(store.activeFilters.priorities).to.deep.equal([]);
        expect(store.tasks.task_1.priority).to.equal(null);
        expect(store.tasks.task_2.priority).to.equal(null);
    });
});
