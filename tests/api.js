'use strict';

const Http = require('http');
const Https = require('https');

const Api = require('../src/api');

const internals = {
    baseUrl: 'https://discord.com/api/v8',
    payload: 'default payload',
};

describe('api', () => {

    describe('request()', () => {

        it('should throw on unsuccessful codes', async () => {

            const path = '/test';

            const cleanup = await internals.api((_, response) => {

                response.writeHead(400);
                response.end();
            });

            const api = new Api({ token: 'test' });
            await expect(api.get(path)).rejects.toThrow(`Request to "${internals.baseUrl}${path}" failed: Server responded with status code 400 - Bad Request`);

            cleanup();
        });

        it('should defer requests if rate limited globally', async () => {

            const timeout = 0.01;        // In seconds

            let count = 0;
            const cleanup = await internals.api((_, response) => {

                if (!count) {
                    count++;
                    response.writeHead(429, {
                        'x-ratelimit-global': true,
                        'retry-after': timeout,
                    });

                    return response.end();
                }

                response.writeHead(200);
                response.end(internals.payload);
            });

            let calls = 0;
            const original = setTimeout;
            setTimeout = function (fn, ms) {                // eslint-disable-line no-global-assign

                calls++;
                expect(ms).toBe(timeout * 1000);
                return original(fn, ms);
            };

            const api = new Api({ token: 'test' });
            const response = await api.get('/test');
            expect(response.payload).toBe(internals.payload);

            expect(calls).toBe(1);

            setTimeout = original;                          // eslint-disable-line require-atomic-updates, no-global-assign
            cleanup();
        });

        it('should defer future requests if global bucket has not reset', async () => {

            const timeout = 0.2;        // In seconds (Must be long enough so the second request is still rate limited after some execution)

            let count = 0;
            const cleanup = await internals.api((_, response) => {

                if (!count) {
                    count++;
                    response.writeHead(429, {
                        'x-ratelimit-global': true,
                        'retry-after': timeout,
                    });

                    return response.end();
                }

                response.writeHead(200);
                response.end(internals.payload);
            });

            let calls = 0;
            const original = Api.prototype._defer;
            Api.prototype._defer = async function (...args) {

                calls++;

                // Start a second request

                if (calls === 1) {
                    const response = await this.get('/test2');
                    expect(response.payload).toBe(internals.payload);
                }

                return original.call(this, ...args);
            };

            const api = new Api({ token: 'test' });
            const response = await api.get('/test');
            expect(response.payload).toBe(internals.payload);

            expect(calls).toBe(2);                          // Defer was called twice

            Api.prototype._defer = original;                // eslint-disable-line require-atomic-updates
            cleanup();
        });

        it('should defer future requests if bucket is exhausted', async () => {

            const timeout = 0.01;        // In seconds

            let nowCalls = 0;
            const originalNow = Date.now;
            Date.now = function () {

                nowCalls++;
                if (nowCalls > 5) {
                    return 1000 + timeout * 1000;           // Returns a value equals to reset so the third request is no longer deferred
                }

                return 1000;
            };

            let count = 1;
            const cleanup = await internals.api((_, response) => {

                const remaining = 2 - (count > 2 ? 1 : count);

                response.writeHead(200, {
                    'x-ratelimit-bucket': 'abcd',
                    'x-ratelimit-remaining': remaining,
                    'x-ratelimit-reset': 1 + timeout,
                });

                count++;

                return response.end(internals.payload);
            });

            let setTimeoutCalls = 0;
            const originalSetTimeout = setTimeout;
            setTimeout = function (fn, ms) {                // eslint-disable-line no-global-assign

                setTimeoutCalls++;
                expect(ms).toBe(timeout * 1000);
                return originalSetTimeout(fn, ms);
            };

            const api = new Api({ token: 'test' });
            const response = await api.get('/test');        // Remaining: 1
            expect(response.payload).toBe(internals.payload);

            const response2 = await api.get('/test');       // Remaining: 0
            expect(response2.payload).toBe(internals.payload);

            const response3 = await api.get('/test');       // Defer -> Remaining: 1 (Total 3 requests made)
            expect(response3.payload).toBe(internals.payload);

            expect(setTimeoutCalls).toBe(1);                // Called only once although 3 requests were made

            setTimeout = originalSetTimeout;                // eslint-disable-line require-atomic-updates, no-global-assign
            Date.now = originalNow;                         // eslint-disable-line require-atomic-updates
            cleanup();
        });

        it('should defer requests if status code is 429 and then bucket exhausted', async () => {

            const timeout = 0.01;        // In seconds

            let nowCalls = 0;
            const originalNow = Date.now;
            Date.now = function () {

                nowCalls++;
                if (nowCalls === 3 || nowCalls > 7) {
                    return 1000 + timeout * 1000;           // Returns a value equals to reset so the third request is no longer deferred
                }

                return 1000;
            };

            let count = 0;
            const cleanup = await internals.api((_, response) => {

                count++;
                response.writeHead(count === 1 ? 429 : 200, {           // Return 429 on the first request
                    'x-ratelimit-bucket': 'abcd',
                    'x-ratelimit-remaining': count === 2 ? 1 : 0,       // Return remaining 1 on second request
                    'x-ratelimit-reset': 1 + timeout,
                    'retry-after': timeout,
                });

                return response.end(internals.payload);
            });

            let setTimeoutCalls = 0;
            const originalSetTimeout = setTimeout;
            setTimeout = function (fn, ms) {                // eslint-disable-line no-global-assign

                setTimeoutCalls++;
                expect(ms).toBe(timeout * 1000);
                return originalSetTimeout(fn, ms);
            };

            const api = new Api({ token: 'test' });
            const response = await api.get('/test');        // Remaining: 0 -> Defer due to 429 -> Remaining: 1
            expect(response.payload).toBe(internals.payload);

            const response2 = await api.get('/test');       // Remaining: 0
            expect(response2.payload).toBe(internals.payload);

            const response3 = await api.get('/test');       // Defer -> Remaining: 0 (Total 4 requests made)
            expect(response3.payload).toBe(internals.payload);

            expect(setTimeoutCalls).toBe(2);                // Called only twice although 4 requests were made

            setTimeout = originalSetTimeout;                // eslint-disable-line require-atomic-updates, no-global-assign
            Date.now = originalNow;                         // eslint-disable-line require-atomic-updates
            cleanup();
        });
    });
});

internals.api = function (handler) {

    const server = Http.createServer(handler);

    return new Promise((resolve) => {

        server.listen(0, () => {

            const port = server.address().port;

            const original = Https.request;
            Https.request = function (options) {

                // Intercept requests to https://discord.com/api/v8

                return Http.request({
                    ...options,
                    hostname: 'localhost',
                    protocol: 'http:',
                    port,
                });
            };

            const cleanup = function () {

                Https.request = original;
                server.close();
            };

            resolve(cleanup);
        });
    });
};
