import { parseTagsFromTitle, normalizeTag, normalizeTagList } from '../../js/utils/tagParser.js';

const expect = chai.expect;

describe('tagParser', () => {
    it('should extract a single tag', () => {
        const result = parseTagsFromTitle('Buy milk #groceries');
        expect(result.tags).to.include('groceries');
        expect(result.title).to.equal('Buy milk');
    });

    it('should extract multiple tags', () => {
        const result = parseTagsFromTitle('Check email #work #urgent');
        expect(result.tags).to.have.members(['work', 'urgent']);
        expect(result.title).to.equal('Check email');
    });

    it('should remain case insensitive (normalized to lowercase)', () => {
        const result = parseTagsFromTitle('Meeting #Work');
        expect(result.tags).to.include('work');
    });

    it('should deduplicate tags', () => {
        const result = parseTagsFromTitle('Task #tag #tag');
        expect(result.tags).to.have.lengthOf(1);
        expect(result.tags[0]).to.equal('tag');
    });

    it('should handle no tags', () => {
        const result = parseTagsFromTitle('Just a title');
        expect(result.tags).to.be.empty;
        expect(result.title).to.equal('Just a title');
    });

    it('should handle empty string', () => {
        const result = parseTagsFromTitle('');
        expect(result.title).to.equal('');
        expect(result.tags).to.be.empty;
    });

    it('should normalize a raw tag', () => {
        expect(normalizeTag('  #Type Meeting!!  ')).to.equal('type-meeting');
    });

    it('should normalize and dedupe a tag list', () => {
        const normalized = normalizeTagList([' #Team Ops ', 'team-ops', 'TEAM_ops', '']);
        expect(normalized).to.have.members(['team-ops', 'team_ops']);
    });
});
