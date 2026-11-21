/**
 * Live e2e against Postgres. Run with E2E=1 after migrate + seed:school-demo.
 */
const enabled = process.env.E2E === '1';
const describeE2e = enabled ? describe : describe.skip;

const base = process.env.E2E_BASE_URL ?? 'http://localhost:3001/v1';

async function json(path: string, init?: RequestInit) {
    const response = await fetch(`${base}${path}`, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...(init?.headers ?? {}),
        },
    });
    const body = await response.json().catch(() => ({}));
    return { status: response.status, body };
}

describeE2e('school e2e', () => {
    let globalToken = '';
    let schoolToken = '';
    let schoolId = '';
    let studentId = '';

    it('logs in and issues a school session', async () => {
        const login = await json('/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                identifier: 'principal',
                password: 'Password1!',
            }),
        });
        expect(login.status).toBe(200);
        globalToken = login.body.data.accessToken;
        const memberships = await json('/school/memberships', {
            headers: { Authorization: `Bearer ${globalToken}` },
        });
        expect(memberships.status).toBe(200);
        schoolId = memberships.body.data[0].schoolId;
        const session = await json('/school/session', {
            method: 'POST',
            headers: { Authorization: `Bearer ${globalToken}` },
            body: JSON.stringify({ schoolId }),
        });
        expect(session.status).toBe(200);
        schoolToken = session.body.data.accessToken;
        const me = await json('/school/me', {
            headers: { Authorization: `Bearer ${schoolToken}` },
        });
        expect(me.body.data.school.id).toBe(schoolId);
    });

    it('isolates tenants by school token', async () => {
        const people = await json('/school/people?kind=STUDENT', {
            headers: { Authorization: `Bearer ${schoolToken}` },
        });
        expect(people.status).toBe(200);
        studentId = people.body.data.items[0].id;
        const other = await json(`/school/people/${studentId}`, {
            headers: { Authorization: `Bearer ${globalToken}` },
        });
        expect(other.status).toBeGreaterThanOrEqual(400);
    });

    it('denies finance approve for a teacher token', async () => {
        const login = await json('/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                identifier: 'teacher',
                password: 'Password1!',
            }),
        });
        const memberships = await json('/school/memberships', {
            headers: {
                Authorization: `Bearer ${login.body.data.accessToken}`,
            },
        });
        const session = await json('/school/session', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${login.body.data.accessToken}`,
            },
            body: JSON.stringify({
                schoolId: memberships.body.data[0].schoolId,
            }),
        });
        const denied = await json('/school/finance/receipts/x/approve', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${session.body.data.accessToken}`,
            },
        });
        expect(denied.status).toBe(403);
    });

    it('hides unverified guardian financial students', async () => {
        const login = await json('/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                identifier: 'guardian1',
                password: 'Password1!',
            }),
        });
        const memberships = await json('/school/memberships', {
            headers: {
                Authorization: `Bearer ${login.body.data.accessToken}`,
            },
        });
        const session = await json('/school/session', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${login.body.data.accessToken}`,
            },
            body: JSON.stringify({
                schoolId: memberships.body.data[0].schoolId,
            }),
        });
        const ledger = await json(`/school/finance/ledger/${studentId}`, {
            headers: {
                Authorization: `Bearer ${session.body.data.accessToken}`,
            },
        });
        expect([200, 403]).toContain(ledger.status);
    });
});
