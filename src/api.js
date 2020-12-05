'use strict';

const Bornite = require('@botsocket/bornite');

const Package = require('../package');

const internals = {
    global: Symbol('global'),
    paramsRx: /\/([a-z-]+)\/(?:\d{17,19})/,
};

module.exports = internals.Api = class {
    constructor(settings) {

        this._settings = settings;
        this._buckets = {};                                     // hash -> bucket
        this._ratelimits = {};                                  // bucket -> { remaining, reset } or global -> { reset }

        this._requester = Bornite.custom({                      // Custom bornite instance
            baseUrl: 'https://discord.com/api/v8',
            validateStatus: internals.validateStatus,
            headers: {
                Authorization: `Bot ${this._settings.token}`,
                'User-Agent': this._settings.userAgent || `DiscordBot (${Package.homepage}, ${Package.version})`,
            },
        });
    }

    async request(method, path, options) {

        let now = Date.now();

        // Defer if rate limited globally

        let timeout = this._calculateTimeout(internals.global, now);
        if (timeout) {
            return this._defer(timeout, method, path, options);
        }

        // Defer if rate limited locally

        const hash = internals.hash(method, path);
        let bucket = this._buckets[hash];

        timeout = this._calculateTimeout(bucket, now);
        if (timeout) {
            return this._defer(timeout, method, path, options);
        }

        // Make request

        const response = await this._requester.request(path, { ...options, method });

        now = Date.now();
        bucket = response.headers['x-ratelimit-bucket'];

        // Populate rate limits

        if (bucket) {
            const reset = Number(response.headers['x-ratelimit-reset']) * 1000;
            timeout = reset - now;

            if (timeout > 0) {
                this._buckets[hash] = bucket;
                this._ratelimits[bucket] = {
                    remaining: Number(response.headers['x-ratelimit-remaining']),
                    reset,
                };
            }
        }

        // Defer if 429 is encountered

        if (response.statusCode === 429) {
            timeout = Number(response.headers['retry-after']) * 1000;

            if (response.headers['x-ratelimit-global']) {
                this._ratelimits[internals.global] = { reset: now + timeout };
            }

            return this._defer(timeout, method, path, options);
        }

        return response;
    }

    _calculateTimeout(bucket, now) {

        if (!bucket) {
            return;
        }

        const ratelimit = this._ratelimits[bucket];

        if (!ratelimit) {
            return;
        }

        if (!ratelimit ||
            (bucket !== internals.global && ratelimit.remaining)) {

            return;
        }

        const timeout = ratelimit.reset - now;

        if (timeout <= 0) {
            delete this._ratelimits[bucket];            // Delete ratelimit if timeout <= 0 (bucket has already reset)
            return;
        }

        return timeout;
    }

    _defer(timeout, ...args) {

        return new Promise((resolve, reject) => {

            setTimeout(async () => {

                try {
                    return resolve(await this.request(...args));
                }
                catch (error) {
                    return reject(error);
                }
            }, timeout);
        });
    }
};

internals.validateStatus = function (code) {

    return code === 429 || (code >= 200 && code < 300);
};

internals.hash = function (method, path) {

    return path.replace(internals.paramsRx, (match, resource) => {

        if (resource !== 'guilds' &&
            resource !== 'channels') {

            match = `/${resource}/params`;
        }

        return `${method.toUpperCase()} ${match}`;
    });
};

internals.setup = function () {

    for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
        internals.Api.prototype[method] = function (path, options) {

            return this.request(method, path, options);
        };
    }
};

internals.setup();
