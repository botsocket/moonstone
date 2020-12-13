'use strict';

const Bone = require('@botsocket/bone');
const Bornite = require('@botsocket/bornite');

const Package = require('../package');

const internals = {
    global: Symbol('global'),
    baseUrl: 'https://discord.com/api/v8',
    userAgent: `DiscordBot (${Package.homepage}, ${Package.version})`,
};

module.exports = internals.Api = class {
    constructor(settings) {

        this._buckets = {};             // hash -> bucket
        this._resets = {};              // bucket -> reset

        this._requester = Bornite.custom({
            baseUrl: internals.baseUrl,
            validateStatus: internals.validateStatus,
            headers: {
                Authorization: `Bot ${settings.token}`,
                'User-Agent': settings.userAgent || internals.userAgent,
            },
        });
    }

    get(...args) {

        return this.request('get', ...args);
    }

    post(...args) {

        return this.request('post', ...args);
    }

    put(...args) {

        return this.request('put', ...args);
    }

    patch(...args) {

        return this.request('patch', ...args);
    }

    delete(...args) {

        return this.request('delete', ...args);
    }

    request(method, builder, params, options) {

        Bone.assert(typeof method === 'string', 'Method must be a string');
        Bone.assert(typeof builder === 'function' || typeof builder === 'string', 'Path builder must be a string or a function');
        Bone.assert(typeof builder !== 'function' || typeof params === 'object', 'Path builder must be accompanied by parameters of type object');

        // Global ratelimit

        const retryAfter = this._retryAfter(internals.global);
        if (retryAfter) {
            return internals.defer(this.request(builder, params, options), retryAfter);
        }

        if (typeof builder === 'string') {
            return this._request(builder, builder, { ...params, method });         // Params is options when builder is a string
        }

        const path = builder(params);
        const hash = internals.hash(method, builder, params);

        return this._request(path, hash, { ...options, method });
    }

    async _request(path, hash, options) {

        // Route-based ratelimit

        let retryAfter = this._retryAfter(this._buckets[hash]);
        if (retryAfter) {
            return internals.defer(this._request(path, hash, options), retryAfter);
        }

        const response = await this._requester.request(path, options);
        const now = Date.now();

        const bucket = response.headers['x-ratelimit-bucket'];
        if (bucket) {
            const reset = Number(response.headers['x-ratelimit-reset']) * 1000;
            const remaining = Number(response.headers['x-ratelimit-remaining']);

            if (reset > now &&
                !remaining) {

                this._buckets[hash] = bucket;
                this._resets[bucket] = reset;
            }
        }

        // Defer if 429 is encountered

        if (response.statusCode === 429) {
            retryAfter = Number(response.headers['retry-after']) * 1000;

            if (response.headers['x-ratelimit-global']) {
                this._ratelimits[internals.global] = { reset: now + retryAfter };
            }

            return internals.defer(this._request(path, hash, options), retryAfter);
        }

        return response;
    }

    _retryAfter(bucket) {

        const reset = this._resets[bucket];

        if (!reset) {
            return;
        }

        const retryAfter = reset - Date.now();
        if (retryAfter <= 0) {
            delete this._resets[bucket];
            return;
        }

        return retryAfter;
    }
};

internals.validateStatus = function (code) {

    return code === 429 || (code >= 200 && code < 300);
};

internals.hash = function (method, builder, params) {

    const processed = {};
    for (const param of Object.keys(params)) {
        if (param === 'channel' ||
            param === 'guild') {

            processed[param] = params[param];
            continue;
        }

        processed[param] = 'EXCLUDED';
    }

    return `${method.toUpperCase()} ${builder(processed)}`;
};

internals.defer = function (operation, retryAfter) {

    return new Promise((resolve, reject) => {

        setTimeout(async () => {

            try {
                resolve(await operation);
            }
            catch (error) {
                reject(error);
            }
        }, retryAfter);
    });
};
