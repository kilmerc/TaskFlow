import { taskMatchesFilters } from '../../js/utils/taskFilters.js';

const expect = chai.expect;

describe('taskFilters utility', () => {
    const baseTask = {
        id: 'task_1',
        title: 'Plan Sprint',
        description: 'Review backlog and milestones',
        tags: ['work', 'planning'],
        priority: 'II'
    };

    it('should match by title, description, and tags with case-insensitive search', () => {
        expect(taskMatchesFilters(baseTask, { tags: [], priorities: [] }, 'sprint')).to.equal(true);
        expect(taskMatchesFilters(baseTask, { tags: [], priorities: [] }, 'BACKLOG')).to.equal(true);
        expect(taskMatchesFilters(baseTask, { tags: [], priorities: [] }, 'WORK')).to.equal(true);
    });

    it('should combine search query with existing tag and priority filters', () => {
        expect(taskMatchesFilters(baseTask, { tags: ['work'], priorities: ['II'] }, 'plan')).to.equal(true);
        expect(taskMatchesFilters(baseTask, { tags: ['personal'], priorities: ['II'] }, 'plan')).to.equal(false);
        expect(taskMatchesFilters(baseTask, { tags: ['work'], priorities: ['I'] }, 'plan')).to.equal(false);
        expect(taskMatchesFilters(baseTask, { tags: ['work'], priorities: ['II'] }, 'missing')).to.equal(false);
    });

    it('should treat empty search as no-op', () => {
        expect(taskMatchesFilters(baseTask, { tags: [], priorities: [] }, '')).to.equal(true);
        expect(taskMatchesFilters(baseTask, { tags: [], priorities: [] }, '   ')).to.equal(true);
    });
});
