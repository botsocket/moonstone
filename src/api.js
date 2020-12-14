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

        this._settings = settings;
        this._buckets = {};             // hash -> bucket
        this._resets = {};              // bucket -> reset
    }

    request(method, builder, params, options) {

        Bone.assert(typeof method === 'string', 'Method must be a string');
        Bone.assert(typeof builder === 'function' || typeof builder === 'string', 'Path builder must be a string or a function');
        Bone.assert(typeof builder !== 'function' || typeof params === 'object', 'Path builder must be accompanied by parameters of type object');

        // Global ratelimit

        const deferTime = this._calculateDeferTime(internals.global);
        if (deferTime) {
            return internals.defer(this.request(builder, params, options), deferTime);
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

        const deferTime = this._calculateDeferTime(hash);
        if (deferTime) {
            return internals.defer(this._request(path, hash, options), deferTime);
        }

        const response = await Bornite.request(path, {
            baseUrl: internals.baseUrl,
            validateStatus: internals.validateStatus,
            headers: {
                Authorization: `Bot ${this._settings.token}`,
                'User-Agent': this._settings.userAgent || internals.userAgent,
            },
        });

        const now = Date.now();

        // Add resets

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
            const retryAfter = Number(response.headers['retry-after']) * 1000;

            if (response.headers['x-ratelimit-global']) {
                this._resets[internals.global] = now + retryAfter;
            }

            return internals.defer(this._request(path, hash, options), retryAfter);
        }

        return response;
    }

    _calculateDeferTime(hash) {

        const bucket = hash === internals.global ? hash : this._buckets[hash];

        if (!bucket) {
            return;
        }

        const reset = this._resets[bucket];

        if (!reset) {
            return;
        }

        const deferTime = reset - Date.now();
        if (deferTime <= 0) {
            delete this._resets[bucket];
            return;
        }

        return deferTime;
    }
};

internals.setup = function () {

    for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
        internals.Api.prototype[method] = function (...args) {

            return this.request(method, ...args);
        };
    }
};

internals.setup();

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
