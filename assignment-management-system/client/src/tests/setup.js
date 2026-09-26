import '@testing-library/jest-dom/vitest';

// React Router creates an internal Request during redirects. In jsdom, the
// AbortSignal comes from a different realm than Node's undici Request, so
// passing it through throws before the navigation can finish.
const NativeRequest = globalThis.Request;
if (NativeRequest) {
	globalThis.Request = class TestRequest extends NativeRequest {
		constructor(input, init = {}) {
			const { signal: _signal, ...requestInit } = init;
			super(input, requestInit);
		}
	};
}
