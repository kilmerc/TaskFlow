import { store, mutations, hydrate, normalizeText, validateName, buildPersistedSnapshot, persistNow } from '../js/store.js';

const expect = chai.expect;

const BASELINE_STATE = {
    appVersion: '1.2',
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
    taskModalDraft: null,
    dialog: {
        isOpen: false
    },
    toasts: []
};

describe('Store', () => {
    beforeEach(() => {
        localStorage.clear();
        hydrate(JSON.parse(JSON.stringify(BASELINE_STATE)));
    });

    it('should add a workspace', () => {
        const initialCount = store.workspaces.length;
        const result = mutations.addWorkspace('Test Workspace');

        expect(result.ok).to.equal(true);
        expect(store.workspaces).to.have.lengthOf(initialCount + 1);
        expect(store.workspaces[store.workspaces.length - 1].name).to.equal('Test Workspace');
        expect(store.currentWorkspaceId).to.equal(store.workspaces[store.workspaces.length - 1].id);
    });

    it('should add default columns to new workspace', () => {
        const result = mutations.addWorkspace('WS1');
        expect(result.ok).to.equal(true);
        const ws = store.workspaces[store.workspaces.length - 1];
        expect(ws.columns).to.have.lengthOf(3);
        expect(store.columns[ws.columns[0]].title).to.equal('To Do');
    });

    it('should return the new column id from addColumn', () => {
        const workspaceId = store.currentWorkspaceId;
        const result = mutations.addColumn(workspaceId, 'Backlog');
        const columnId = result.data.columnId;

        expect(result.ok).to.equal(true);
        expect(columnId).to.be.a('string');
        expect(store.columns[columnId]).to.exist;
        expect(store.columns[columnId].title).to.equal('Backlog');
        expect(store.columnTaskOrder[columnId]).to.deep.equal([]);
        expect(store.workspaces[0].columns).to.include(columnId);
    });

    it('should delete a workspace', () => {
        const createResult = mutations.addWorkspace('WS1');
        expect(createResult.ok).to.equal(true);
        const id = store.workspaces[store.workspaces.length - 1].id;
        const countBeforeDelete = store.workspaces.length;

        const deleteResult = mutations.deleteWorkspace(id);
        expect(deleteResult.ok).to.equal(true);
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

        const invalidTitle = mutations.createTask({ title: '', columnId: colId });
        const invalidColumn = mutations.createTask({ title: 'Missing Column', columnId: 'col_missing' });
        expect(invalidTitle.ok).to.equal(false);
        expect(invalidColumn.ok).to.equal(false);

        const createResult = mutations.createTask({
            title: 'Created Task',
            columnId: colId,
            tags: ['Created', 'created'],
            priority: null
        });
        const taskId = createResult.data.taskId;

        expect(createResult.ok).to.equal(true);
        expect(taskId).to.be.a('string');
        expect(store.tasks[taskId]).to.exist;
        expect(store.tasks[taskId].title).to.equal('Created Task');
        expect(store.tasks[taskId].isCompleted).to.equal(false);
        expect(store.tasks[taskId].completedAt).to.equal(null);
        expect(store.columnTaskOrder[colId]).to.include(taskId);
    });

    it('should create tasks with due date and priority from createTask payload', () => {
        const colId = store.workspaces[0].columns[0];
        const createResult = mutations.createTask({
            title: 'Scheduled Priority Task',
            columnId: colId,
            dueDate: '2026-02-20',
            priority: 'III'
        });
        const taskId = createResult.data.taskId;

        expect(createResult.ok).to.equal(true);
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

    it('should reject moveTask when target column is invalid and keep state unchanged', () => {
        const col1 = store.workspaces[0].columns[0];
        mutations.addTask(col1, 'Unmovable Task');
        const taskId = store.columnTaskOrder[col1][0];

        const beforeOrder = [...store.columnTaskOrder[col1]];
        const result = mutations.moveTask(taskId, col1, 'col_missing', 0);

        expect(result.ok).to.equal(false);
        expect(store.tasks[taskId].columnId).to.equal(col1);
        expect(store.columnTaskOrder[col1]).to.deep.equal(beforeOrder);
    });

    it('should clamp moveTask index to valid bounds', () => {
        const col1 = store.workspaces[0].columns[0];
        const col2 = store.workspaces[0].columns[1];

        mutations.addTask(col1, 'Task A');
        mutations.addTask(col2, 'Task B');
        const taskAId = store.columnTaskOrder[col1][0];

        const result = mutations.moveTask(taskAId, col1, col2, 999);

        expect(result.ok).to.equal(true);
        expect(store.columnTaskOrder[col1]).to.not.include(taskAId);
        expect(store.columnTaskOrder[col2][store.columnTaskOrder[col2].length - 1]).to.equal(taskAId);
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

    it('should normalize text and validate names with limits', () => {
        expect(normalizeText('  Project   Alpha  ')).to.equal('Project Alpha');

        const emptyWorkspace = validateName('workspace', '   ');
        expect(emptyWorkspace.ok).to.equal(false);
        expect(emptyWorkspace.error.code).to.equal('required');

        const tooLongTask = validateName('task', 'x'.repeat(201));
        expect(tooLongTask.ok).to.equal(false);
        expect(tooLongTask.error.code).to.equal('max_length_exceeded');
    });

    it('should reject duplicate column names in the same workspace (case-insensitive)', () => {
        const workspaceId = store.currentWorkspaceId;
        const addResult = mutations.addColumn(workspaceId, 'Backlog');
        expect(addResult.ok).to.equal(true);

        const dupResult = mutations.addColumn(workspaceId, '  backlog  ');
        expect(dupResult.ok).to.equal(false);
        expect(dupResult.error.code).to.equal('duplicate_column_name');
    });

    it('should prune invalid tag filters when switching workspace', () => {
        const baseColumnId = store.workspaces[0].columns[0];
        mutations.addTask(baseColumnId, 'Task #ops');
        mutations.toggleTagFilter('ops');
        mutations.togglePriorityFilter('I');
        expect(store.activeFilters.tags).to.deep.equal(['ops']);

        const workspaceResult = mutations.addWorkspace('Second');
        expect(workspaceResult.ok).to.equal(true);
        const secondWorkspaceId = workspaceResult.data.workspaceId;
        const secondColumnId = store.workspaces.find(ws => ws.id === secondWorkspaceId).columns[0];
        const taskResult = mutations.addTask(secondColumnId, 'Task #design');
        expect(taskResult.ok).to.equal(true);

        const switchResult = mutations.switchWorkspace(secondWorkspaceId);
        expect(switchResult.ok).to.equal(true);
        expect(store.activeFilters.tags).to.deep.equal([]);
        expect(store.activeFilters.priorities).to.deep.equal(['I']);
    });

    it('should preserve shared tag filters across workspace transitions', () => {
        const baseColumnId = store.workspaces[0].columns[0];
        mutations.addTask(baseColumnId, 'Base Task #shared');

        const workspaceResult = mutations.addWorkspace('Second');
        expect(workspaceResult.ok).to.equal(true);
        const secondWorkspaceId = workspaceResult.data.workspaceId;
        const secondColumnId = store.workspaces.find(ws => ws.id === secondWorkspaceId).columns[0];
        const secondTaskResult = mutations.addTask(secondColumnId, 'Second Task #shared');
        expect(secondTaskResult.ok).to.equal(true);

        const toBase = mutations.switchWorkspace(store.workspaces[0].id);
        expect(toBase.ok).to.equal(true);
        mutations.toggleTagFilter('shared');
        mutations.togglePriorityFilter('II');
        expect(store.activeFilters.tags).to.deep.equal(['shared']);
        expect(store.activeFilters.priorities).to.deep.equal(['II']);

        const toSecond = mutations.switchWorkspace(secondWorkspaceId);
        expect(toSecond.ok).to.equal(true);
        expect(store.activeFilters.tags).to.deep.equal(['shared']);
        expect(store.activeFilters.priorities).to.deep.equal(['II']);
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

    it('should execute dialog actions and keep dialog open on validation errors', () => {
        mutations.openDialog({
            variant: 'prompt',
            title: 'Create workspace',
            action: { type: 'workspace.create' },
            input: { value: '   ' }
        });
        const failResult = mutations.confirmDialog();
        expect(failResult.ok).to.equal(false);
        expect(store.dialog.isOpen).to.equal(true);
        expect(store.dialog.error).to.contain('required');

        mutations.setDialogInput('Roadmap');
        const successResult = mutations.confirmDialog();
        expect(successResult.ok).to.equal(true);
        expect(store.dialog.isOpen).to.equal(false);
        expect(store.workspaces.some(ws => ws.name === 'Roadmap')).to.equal(true);
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
        expect(store.dialog.isOpen).to.equal(false);
        expect(store.toasts).to.deep.equal([]);
    });

    it('should normalize invalid task columnId and rebuild columnTaskOrder on hydrate', () => {
        hydrate({
            appVersion: '1.2',
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
        expect(store.dialog.isOpen).to.equal(false);
        expect(store.toasts).to.deep.equal([]);
    });

    describe('buildPersistedSnapshot', () => {
        it('should return only domain keys and no transient state', () => {
            const snapshot = buildPersistedSnapshot();
            const expectedKeys = ['appVersion', 'theme', 'currentWorkspaceId', 'workspaces', 'columns', 'tasks', 'columnTaskOrder', 'activeFilters'];
            expect(Object.keys(snapshot).sort()).to.deep.equal(expectedKeys.sort());
        });

        it('should not include transient UI state', () => {
            mutations.setActiveTask('some-task');
            mutations.pushToast({ message: 'test', variant: 'info' });

            const snapshot = buildPersistedSnapshot();
            expect(snapshot).to.not.have.property('activeTaskId');
            expect(snapshot).to.not.have.property('taskModalMode');
            expect(snapshot).to.not.have.property('taskModalDraft');
            expect(snapshot).to.not.have.property('storageWarning');
            expect(snapshot).to.not.have.property('dialog');
            expect(snapshot).to.not.have.property('toasts');
        });

        it('should persist domain data correctly via persistNow', () => {
            mutations.createTask({ title: 'Snapshot Test', columnId: 'col_todo' });
            persistNow();

            const raw = localStorage.getItem('taskflow_data');
            const parsed = JSON.parse(raw);
            expect(parsed).to.have.property('tasks');
            expect(parsed).to.not.have.property('activeTaskId');
            expect(parsed).to.not.have.property('dialog');
            expect(parsed).to.not.have.property('toasts');
            expect(parsed).to.not.have.property('taskModalMode');
        });

        it('should keep persisted snapshot schema stable after transient mutations', () => {
            const initialKeys = Object.keys(buildPersistedSnapshot()).sort();

            mutations.pushToast({ message: 'Transient', variant: 'info' });
            mutations.openDialog({
                variant: 'confirm',
                title: 'Transient',
                action: { type: 'app.resetAll' }
            });

            const nextKeys = Object.keys(buildPersistedSnapshot()).sort();
            expect(nextKeys).to.deep.equal(initialKeys);
        });
    });

    describe('hydrate migration', () => {
        it('should migrate legacy activeFilter array to activeFilters.tags', () => {
            hydrate({
                appVersion: '1.0',
                theme: 'light',
                currentWorkspaceId: 'ws_base',
                workspaces: [{ id: 'ws_base', name: 'Base', columns: ['col_todo'] }],
                columns: { col_todo: { id: 'col_todo', workspaceId: 'ws_base', title: 'To Do' } },
                tasks: {
                    task_legacy: {
                        id: 'task_legacy',
                        columnId: 'col_todo',
                        title: 'Legacy Task',
                        tags: ['legacy-tag'],
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
                columnTaskOrder: { col_todo: ['task_legacy'] },
                activeFilter: ['legacy-tag']
            });

            expect(store.appVersion).to.equal('1.2');
            expect(store.activeFilters.tags).to.include('legacy-tag');
        });

        it('should handle pre-1.2 data with transient fields gracefully', () => {
            hydrate({
                appVersion: '1.1',
                theme: 'dark',
                currentWorkspaceId: 'ws_base',
                workspaces: [{ id: 'ws_base', name: 'Base', columns: ['col_todo'] }],
                columns: { col_todo: { id: 'col_todo', workspaceId: 'ws_base', title: 'To Do' } },
                tasks: {},
                columnTaskOrder: { col_todo: [] },
                activeFilters: { tags: [], priorities: [] },
                activeTaskId: 'stale-id',
                taskModalMode: 'edit',
                dialog: { isOpen: true },
                toasts: [{ message: 'stale' }]
            });

            expect(store.appVersion).to.equal('1.2');
            expect(store.activeTaskId).to.equal(null);
            expect(store.taskModalMode).to.equal(null);
            expect(store.dialog.isOpen).to.equal(false);
            expect(store.toasts).to.deep.equal([]);
        });
    });
});
