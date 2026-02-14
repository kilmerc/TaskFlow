import { getActiveHashToken, replaceHashToken } from '../../js/utils/tagAutocomplete.js';

const expect = chai.expect;

describe('tagAutocomplete', () => {
    it('should detect an active hash token at the end of input', () => {
        const text = 'Ship release #typ';
        const token = getActiveHashToken(text, text.length);
        const hashIndex = text.indexOf('#');

        expect(token).to.deep.equal({
            start: hashIndex,
            end: text.length,
            query: 'typ'
        });
    });

    it('should detect an active hash token in the middle of input', () => {
        const text = 'Plan #meeting review';
        const caretIndex = text.indexOf('i') + 1; // inside "#meeting"
        const token = getActiveHashToken(text, caretIndex);

        expect(token).to.deep.equal({
            start: 5,
            end: 13,
            query: 'meeti'
        });
    });

    it('should replace only the active hash token and return next caret index', () => {
        const input = 'Plan #mee tomorrow';
        const range = { start: 5, end: 9 };
        const result = replaceHashToken(input, range, 'meeting');

        expect(result.text).to.equal('Plan #meeting tomorrow');
        expect(result.caretIndex).to.equal(13);
    });

    it('should return null when there is no active hash token', () => {
        const token = getActiveHashToken('No tag here', 5);
        expect(token).to.equal(null);
    });

    it('should preserve input when replacement range is missing', () => {
        const input = 'Plan #meeting tomorrow';
        const result = replaceHashToken(input, null, 'ops');

        expect(result.text).to.equal(input);
        expect(result.caretIndex).to.equal(input.length);
    });
});
