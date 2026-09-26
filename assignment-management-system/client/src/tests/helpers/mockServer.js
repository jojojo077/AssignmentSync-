// mockServer.js
// Shared test helper: fakes the HTTP layer underneath the application's real
// axios instance (src/services/api.js).
//
// Why this exists: the tests used to vi.mock('../services/api') and replace
// every service function with a hand-written stub. That meant the real
// service layer (URL building, the auth-header interceptor, addEvent's
// Canvas/offline fallback, pruneStaleCanvasEvents' localStorage logic) was
// never exercised. Swapping the axios *adapter* instead keeps every line of
// application code in the path - only the network itself is faked.
//
// Usage:
//   const server = mockServer({
//     'GET /canvas/assignments': [...courses],            // 200 + data
//     'GET /canvas/announcements': status(500, {...}),     // HTTP error
//     'GET /canvas/events': sequence([], [event]),         // different data per call
//     'POST /canvas/events': ({ body }) => ({ id: 1, ...body }),
//   });
//   ...
//   server.callsTo('GET /canvas/events')  // recorded requests
//   server.restore()                       // put the real adapter back
//
// Any request without a route gets a 404, so an unexpected API call surfaces
// as the application's own error handling rather than a silent pass.

import api from '../../services/api';

const STATUS = Symbol('status');

/** Respond with a specific HTTP status (axios rejects for non-2xx). */
export function status(code, data) {
  return { [STATUS]: code, data };
}

/** Return each response in turn on successive calls; the last one repeats. */
export function sequence(...responses) {
  let i = 0;
  return () => {
    const r = responses[Math.min(i, responses.length - 1)];
    i += 1;
    return r;
  };
}

/** Simulate the server being unreachable (no HTTP response at all). */
export function networkError(message = 'Network Error') {
  return () => {
    throw new Error(message);
  };
}

export function mockServer(routes = {}, instance = api) {
  const calls = [];
  const originalAdapter = instance.defaults.adapter;

  instance.defaults.adapter = async (config) => {
    const method = (config.method || 'get').toUpperCase();
    const url = config.url;
    let body = config.data;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        /* leave as string */
      }
    }
    const call = { method, url, body, params: config.params, headers: config.headers };
    calls.push(call);

    const key = `${method} ${url}`;
    let result = routes[key];
    if (result === undefined) {
      result = status(404, { message: `No mock route for ${key}` });
    } else if (typeof result === 'function') {
      result = await result(call);
    }

    const code = result && result[STATUS] !== undefined ? result[STATUS] : 200;
    const data = result && result[STATUS] !== undefined ? result.data : result;
    const response = { data, status: code, statusText: String(code), headers: {}, config, request: {} };

    if (code >= 200 && code < 300) return response;

    const error = new Error(`Request failed with status code ${code}`);
    error.response = response;
    error.config = config;
    error.isAxiosError = true;
    throw error;
  };

  return {
    calls,
    callsTo: (key) => calls.filter((c) => `${c.method} ${c.url}` === key),
    restore: () => {
      instance.defaults.adapter = originalAdapter;
    },
  };
}
