import { normalizeIranPhone } from 'src/common/utils/iran-phone';

describe('normalizeIranPhone', () => {
    it('adds a leading zero to a 10-digit national number', () => {
        expect(normalizeIranPhone('9114174021')).toBe('09114174021');
    });

    it('keeps an already canonical 11-digit number', () => {
        expect(normalizeIranPhone('09356443554')).toBe('09356443554');
    });

    it('maps +98 numbers to 09…', () => {
        expect(normalizeIranPhone('+989356443554')).toBe('09356443554');
    });

    it('leaves emails and usernames unchanged', () => {
        expect(normalizeIranPhone('  bob  ')).toBe('bob');
        expect(normalizeIranPhone('a@b.com')).toBe('a@b.com');
    });
});
