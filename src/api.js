'use strict';

const Bornite = require('@botsocket/bornite');

const Package = require('../package');

const internals = {
    global: Symbol('global'),
    baseUrl: 'https://discord.com/api/v8',
    userAgent: `DiscordBot (${Package.homepage}, ${Package.version})`,
};

module.exports = internals.Api = class {
    constructor(settings) {

        this._buckets = {};                                     // hash -> bucket
        this._ratelimits = {};                                  // bucket -> { remaining, reset } or global -> { reset }

        this._requester = Bornite.custom({                      // Custom bornite instance
            baseUrl: internals.baseUrl,
            validateStatus: internals.validateStatus,
            headers: {
                Authorization: `Bot ${settings.token}`,
                'User-Agent': settings.userAgent || internals.userAgent,
            },
        });
    }

    request(builder, params, options) {

        const now = Date.now();

        // Global ratelimit

        const ratelimit = this._ratelimits[internals.global];
        if (ratelimit &&
            ratelimit.reset > now) {

            return internals.defer(this.request(builder, params, options), ratelimit.reset - now);
        }

        delete this._ratelimits[internals.global];

        if (typeof builder === 'string') {
            return this._request(builder, builder, options);
        }

        const path = builder(params);
        const hash = internals.hash(builder, params);

        return this._request(path, hash, options);
    }

    async _request(path, hash, options) {

        let now = Date.now();
        let bucket = this._buckets[hash];

        // Route-based ratelimit

        const ratelimit = this._ratelimits[bucket];
        if (ratelimit &&
            !ratelimit.remaining &&
            ratelimit.reset > now) {

            return internals.defer(this._request(path, hash, options), ratelimit.reset - now);
        }

        delete this._ratelimits[bucket];

        // Make request

        const response = await this._requester.request(path, options);

        now = Date.now();
        bucket = response.headers['x-ratelimit-bucket'];

        // Populate rate limits

        if (bucket) {
            const reset = Number(response.headers['x-ratelimit-reset']) * 1000;
            if (reset > now) {
                this._buckets[hash] = bucket;
                this._ratelimits[bucket] = {
                    remaining: Number(response.headers['x-ratelimit-remaining']),
                    reset,
                };
            }
        }

        // Defer if 429 is encountered

        if (response.statusCode === 429) {
            const ms = Number(response.headers['retry-after']) * 1000;

            if (response.headers['x-ratelimit-global']) {
                this._ratelimits[internals.global] = { reset: now + ms };
            }

            return internals.defer(this._request(path, hash, options), ms);
        }

        return response;
    }
};

internals.validateStatus = function (code) {

    return code === 429 || (code >= 200 && code < 300);
};

internals.hash = function (builder, params) {

    const processed = {};
    for (const param of Object.keys(params)) {
        if (param === 'channel' ||
            param === 'guild') {

            processed[param] = params[param];
            continue;
        }

        processed[param] = 'EXCLUDED';
    }

    return builder(processed);
};

internals.defer = function (operation, ms) {

    return new Promise((resolve, reject) => {

        setTimeout(async () => {

            try {
                resolve(await operation);
            }
            catch (error) {
                reject(error);
            }
        }, ms);
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
