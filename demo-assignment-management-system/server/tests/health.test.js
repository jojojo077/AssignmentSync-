const request = require('supertest');
const app = require('../src/app');

describe('GET /api/health', () => {
  it('returns 200 and an ok status', async () => {
    const res = await request(app).get('/api/health');

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.timestamp).toBe('string');
  });
});

describe('unknown route', () => {
  it('returns 404 via the notFoundHandler', async () => {
    const res = await request(app).get('/api/does-not-exist');

    expect(res.statusCode).toBe(404);
    expect(res.body.error.message).toMatch(/Route not found/);
  });
});
