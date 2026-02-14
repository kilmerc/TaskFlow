import { getTagToneClass } from '../../js/utils/tagStyle.js';

const expect = chai.expect;

describe('tagStyle', () => {
    it('should return a tag tone class name', () => {
        const toneClass = getTagToneClass('urgent');
        expect(toneClass).to.match(/^tag-tone-\d+$/);
    });

    it('should be deterministic (same input produces same output)', () => {
        const a = getTagToneClass('feature');
        const b = getTagToneClass('feature');
        expect(a).to.deep.equal(b);
    });

    it('should return a safe fallback for invalid inputs', () => {
        expect(getTagToneClass('')).to.equal('tag-tone-0');
        expect(getTagToneClass(null)).to.equal('tag-tone-0');
    });

    it('should handle single-character tags', () => {
        const toneClass = getTagToneClass('a');
        expect(toneClass).to.match(/^tag-tone-\d+$/);
    });

    it('should map different tags to known tone classes', () => {
        const seen = new Set(['bug', 'enhancement', 'design'].map(tag => getTagToneClass(tag)));
        for (const toneClass of seen) {
            expect(toneClass).to.match(/^tag-tone-(?:[0-9]|1[0-1])$/);
        }
    });
});
