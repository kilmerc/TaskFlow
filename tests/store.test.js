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
    },
    activeTaskId: null,
    taskModalMode: null,
    taskModalDraft: null
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

    it('should return the new column id from addColumn', () => {
        const workspaceId = store.currentWorkspaceId;
        const columnId = mutations.addColumn(workspaceId, 'Backlog');

        expect(columnId).to.be.a('string');
        expect(store.columns[columnId]).to.exist;
        expect(store.columns[columnId].title).to.equal('Backlog');
        expect(store.columnTaskOrder[columnId]).to.deep.equal([]);
        expect(store.workspaces[0].columns).to.include(columnId);
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

    it('should reject invalid createTask payloads and create valid tasks', () => {
        const colId = store.workspaces[0].columns[0];

        expect(mutations.createTask({ title: '', columnId: colId })).to.equal(null);
        expect(mutations.createTask({ title: 'Missing Column', columnId: 'col_missing' })).to.equal(null);

        const taskId = mutations.createTask({
            title: 'Created Task',
            columnId: colId,
            tags: ['Created', 'created'],
            priority: null
        });

        expect(taskId).to.be.a('string');
        expect(store.tasks[taskId]).to.exist;
        expect(store.tasks[taskId].title).to.equal('Created Task');
        expect(store.tasks[taskId].isCompleted).to.equal(false);
        expect(store.tasks[taskId].completedAt).to.equal(null);
        expect(store.columnTaskOrder[colId]).to.include(taskId);
    });

    it('should create tasks with due date and priority from createTask payload', () => {
        const colId = store.workspaces[0].columns[0];
        const taskId = mutations.createTask({
            title: 'Scheduled Priority Task',
            columnId: colId,
            dueDate: '2026-02-20',
            priority: 'III'
        });

        expect(taskId).to.be.a('string');
        expect(store.tasks[taskId].dueDate).to.equal('2026-02-20');
        expect(store.tasks[taskId].priority).to.equal('III');
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

    it('should move a task when updateTask changes columnId', () => {
        const col1 = store.workspaces[0].columns[0];
        const col2 = store.workspaces[0].columns[1];

        mutations.addTask(col1, 'Editable Column Task');
        const taskId = store.columnTaskOrder[col1][0];

        mutations.updateTask(taskId, { columnId: col2 });

        expect(store.tasks[taskId].columnId).to.equal(col2);
        expect(store.columnTaskOrder[col1]).to.not.include(taskId);
        expect(store.columnTaskOrder[col2]).to.include(taskId);
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

    it('should delete all data and persist reset snapshot immediately', () => {
        const colId = store.workspaces[0].columns[0];
        mutations.addTask(colId, 'Task before full reset');

        expect(Object.keys(store.tasks)).to.have.lengthOf(1);

        mutations.deleteAllData();

        expect(Object.keys(store.tasks)).to.have.lengthOf(0);
        expect(store.workspaces).to.have.lengthOf(1);
        expect(store.workspaces[0].name).to.equal('My Workspace');
        expect(store.workspaces[0].columns).to.have.lengthOf(3);

        const raw = localStorage.getItem('taskflow_data');
        expect(raw).to.be.a('string');

        const persisted = JSON.parse(raw);
        expect(Object.keys(persisted.tasks || {})).to.have.lengthOf(0);
        expect(persisted.workspaces).to.have.lengthOf(1);
        expect(persisted.workspaces[0].name).to.equal('My Workspace');
        expect(persisted.workspaces[0].columns).to.have.lengthOf(3);
    });

    it('should reorder subtasks', () => {
        const colId = store.workspaces[0].columns[0];
        mutations.addTask(colId, 'Task with subtasks');
        const taskId = store.columnTaskOrder[colId][0];

        mutations.addSubtask(taskId, 'First');
        mutations.addSubtask(taskId, 'Second');
        mutations.addSubtask(taskId, 'Third');
        mutations.updateSubtask(taskId, 1, { done: true });

        const current = store.tasks[taskId].subtasks;
        const reordered = [current[2], current[0], current[1]];
        mutations.reorderSubtasks(taskId, reordered);

        expect(store.tasks[taskId].subtasks.map(st => st.text)).to.deep.equal(['Third', 'First', 'Second']);
        expect(store.tasks[taskId].subtasks.map(st => st.done)).to.deep.equal([false, false, true]);
    });

    it('should preserve subtask text and done values when reordering', () => {
        const colId = store.workspaces[0].columns[0];
        mutations.addTask(colId, 'Task with subtasks');
        const taskId = store.columnTaskOrder[colId][0];

        mutations.addSubtask(taskId, 'Alpha');
        mutations.addSubtask(taskId, 'Beta');
        mutations.addSubtask(taskId, 'Gamma');
        mutations.updateSubtask(taskId, 0, { done: true });
        mutations.updateSubtask(taskId, 2, { done: true });

        const beforeMap = store.tasks[taskId].subtasks.reduce((acc, st) => {
            acc[st.text] = st.done;
            return acc;
        }, {});

        const current = store.tasks[taskId].subtasks;
        mutations.reorderSubtasks(taskId, [current[1], current[2], current[0]]);

        const afterMap = store.tasks[taskId].subtasks.reduce((acc, st) => {
            acc[st.text] = st.done;
            return acc;
        }, {});

        expect(afterMap).to.deep.equal(beforeMap);
    });

    it('should no-op reorderSubtasks on invalid task id', () => {
        const colId = store.workspaces[0].columns[0];
        mutations.addTask(colId, 'Task with subtasks');
        const taskId = store.columnTaskOrder[colId][0];

        mutations.addSubtask(taskId, 'Only subtask');
        const before = JSON.stringify(store.tasks[taskId].subtasks);

        expect(() => mutations.reorderSubtasks('task_missing', [])).to.not.throw();
        expect(JSON.stringify(store.tasks[taskId].subtasks)).to.equal(before);
    });

    it('should no-op reorderSubtasks when subtasks is missing or non-array', () => {
        const colId = store.workspaces[0].columns[0];
        mutations.addTask(colId, 'Task with subtasks');
        const taskId = store.columnTaskOrder[colId][0];

        store.tasks[taskId].subtasks = null;

        expect(() => mutations.reorderSubtasks(taskId, [{ text: 'X', done: false }])).to.not.throw();
        expect(store.tasks[taskId].subtasks).to.equal(null);
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

    it('should normalize invalid task columnId and rebuild columnTaskOrder on hydrate', () => {
        hydrate({
            appVersion: '1.1',
            theme: 'light',
            currentWorkspaceId: 'ws_base',
            workspaces: BASELINE_STATE.workspaces,
            columns: BASELINE_STATE.columns,
            columnTaskOrder: {
                col_todo: [],
                col_inprogress: ['task_orphan'],
                col_done: []
            },
            tasks: {
                task_orphan: {
                    id: 'task_orphan',
                    columnId: 'col_missing',
                    title: 'Orphan Task',
                    tags: [],
                    priority: null,
                    description: '',
                    color: 'gray',
                    dueDate: null,
                    subtasks: [],
                    isCompleted: false,
                    completedAt: null,
                    createdAt: new Date().toISOString()
                }
            },
            activeFilters: {
                tags: [],
                priorities: []
            }
        });

        expect(store.tasks.task_orphan.columnId).to.equal('col_todo');
        expect(store.columnTaskOrder.col_todo).to.include('task_orphan');
        expect(store.columnTaskOrder.col_inprogress).to.not.include('task_orphan');
    });
});
