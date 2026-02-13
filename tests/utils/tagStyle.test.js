import { getTagStyle } from '../../js/utils/tagStyle.js';

const expect = chai.expect;

describe('tagStyle', () => {
    it('should return an object with backgroundColor, color, and border', () => {
        const style = getTagStyle('urgent');
        expect(style).to.have.property('backgroundColor');
        expect(style).to.have.property('color');
        expect(style).to.have.property('border');
    });

    it('should be deterministic (same input produces same output)', () => {
        const a = getTagStyle('feature');
        const b = getTagStyle('feature');
        expect(a).to.deep.equal(b);
    });

    it('should produce different hues for different tags', () => {
        const a = getTagStyle('bug');
        const b = getTagStyle('enhancement');
        expect(a.backgroundColor).to.not.equal(b.backgroundColor);
    });

    it('should handle single-character tags', () => {
        const style = getTagStyle('a');
        expect(style.backgroundColor).to.be.a('string');
    });

    it('should return valid HSL color strings', () => {
        const style = getTagStyle('design');
        expect(style.backgroundColor).to.match(/^hsl\(\d+, 70%, 90%\)$/);
        expect(style.color).to.match(/^hsl\(\d+, 80%, 25%\)$/);
        expect(style.border).to.match(/^1px solid hsl\(\d+, 60%, 80%\)$/);
    });
});
