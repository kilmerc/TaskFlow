import { getActiveSlashToken, replaceSlashToken, parseTemplateCommand } from '../../js/utils/templateAutocomplete.js';

const expect = chai.expect;

describe('templateAutocomplete', () => {
    it('should detect an active slash token at the start of input', () => {
        const text = '/daily-standup Build status update';
        const token = getActiveSlashToken(text, '/daily'.length);

        expect(token).to.deep.equal({
            start: 0,
            end: '/daily-standup'.length,
            query: 'daily'
        });
    });

    it('should return null when slash token is not at input start', () => {
        const text = 'Prep /daily';
        const token = getActiveSlashToken(text, text.length);
        expect(token).to.equal(null);
    });

    it('should replace slash token and return caret after trailing space', () => {
        const input = '/d build';
        const range = { start: 0, end: 2 };
        const result = replaceSlashToken(input, range, 'daily');

        expect(result.text).to.equal('/daily build');
        expect(result.caretIndex).to.equal('/daily'.length);
    });

    it('should parse template command and remainder text', () => {
        const command = parseTemplateCommand('/daily Review roadmap #ops');
        expect(command).to.deep.equal({
            templateName: 'daily',
            remainder: 'Review roadmap #ops'
        });
    });
});
