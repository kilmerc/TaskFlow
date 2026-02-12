import { store, mutations, hydrate } from '../js/store.js';

const expect = chai.expect;

describe('Store', () => {
    // Reset store before each test
    beforeEach(() => {
        // Clear localStorage
        localStorage.clear();
        // Reset store state manually or via hydration with empty data
        // For simplicity, we can rely on mutations to build state from scratch
        // But store is a singleton, so we need to be careful.
        // We can force a reset by re-hydrating with a fresh object
        hydrate({
            appVersion: '1.0',
            theme: 'light',
            currentWorkspaceId: null,
            workspaces: [],
            columns: {},
            tasks: {},
            columnTaskOrder: {},
            activeFilter: null
        });
    });

    it('should add a workspace', () => {
        mutations.addWorkspace('Test Workspace');
        expect(store.workspaces).to.have.lengthOf(1);
        expect(store.workspaces[0].name).to.equal('Test Workspace');
        expect(store.currentWorkspaceId).to.equal(store.workspaces[0].id);
    });

    it('should add default columns to new workspace', () => {
        mutations.addWorkspace('WS1');
        const ws = store.workspaces[0];
        expect(ws.columns).to.have.lengthOf(3);
        expect(store.columns[ws.columns[0]].title).to.equal('To Do');
    });

    it('should delete a workspace', () => {
        mutations.addWorkspace('WS1');
        const id = store.workspaces[0].id;
        mutations.deleteWorkspace(id);
        expect(store.workspaces).to.have.lengthOf(0);
        expect(store.currentWorkspaceId).to.be.null; // Or default re-init might happen on hydrate, but here specifically we check state
    });

    it('should add a task', () => {
        mutations.addWorkspace('WS1');
        const colId = store.workspaces[0].columns[0];
        mutations.addTask(colId, 'New Task #test');

        const taskIds = store.columnTaskOrder[colId];
        expect(taskIds).to.have.lengthOf(1);

        const task = store.tasks[taskIds[0]];
        expect(task.title).to.equal('New Task');
        expect(task.tags).to.include('test');
    });

    it('should move a task between columns', () => {
        mutations.addWorkspace('WS1');
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
        mutations.addWorkspace('WS1');
        const colId = store.workspaces[0].columns[0];
        mutations.addTask(colId, 'Task to delete');
        const taskId = store.columnTaskOrder[colId][0];

        mutations.deleteTask(taskId);

        expect(store.tasks[taskId]).to.be.undefined;
        expect(store.columnTaskOrder[colId]).to.have.lengthOf(0);
    });
});
