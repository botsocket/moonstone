'use strict';

const Bornite = require('@botsocket/bornite');

const Package = require('../package');

const internals = {
    global: Symbol('global'),
    majorParamsRx: /\/([a-z-]+)\/(?:[0-9]{17,19})/,
};

module.exports = internals.Api = class {
    constructor(settings) {

        this._settings = settings;
        this._buckets = {};                                     // hash -> bucket
        this._ratelimits = {};                                  // bucket -> { remaining, timeout }

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

        const now = Date.now();

        const defer = (bucket) => {

            if (!bucket) {
                return;
            }

            const ratelimit = this._ratelimits[bucket];
            if (ratelimit &&
                (bucket === internals.global || !ratelimit.remaining)) {

                const timeout = ratelimit.reset - now;
                if (timeout < 0) {
                    delete this._buckets[bucket];
                    return;
                }

                return new Promise((resolve, reject) => {

                    setTimeout(async () => {

                        try {
                            return resolve(await this.request(method, path, options));
                        }
                        catch (error) {
                            return reject(error);
                        }
                    }, timeout);
                });
            }
        };

        let deferral = defer(internals.global);
        if (deferral) {
            return deferral;
        }

        const hash = internals.hash(method, path);
        let bucket = this._buckets[hash];

        deferral = defer(bucket);
        if (deferral) {
            return deferral;
        }

        // Make request

        const response = await this._requester.request(path, { ...options, method });

        const reset = response.headers['x-ratelimit-reset'];
        const resetTimestamp = reset ? Number(reset) * 1000 : null;
        const elapsed = resetTimestamp ? Number(resetTimestamp) * 1000 - Date.now() : -1;
        if (elapsed < 0) {
            return response;
        }

        // Populate rate limits

        if (response.headers['x-ratelimit-global']) {
            this._ratelimits[internals.global] = { reset: resetTimestamp };
        }
        else {
            bucket = response.headers['x-ratelimit-bucket'];
            this._buckets[hash] = bucket;
            this._ratelimits[bucket] = {
                remaining: Number(response.headers['x-ratelimit-remaining']),
                reset: resetTimestamp,
            };
        }

        // Defer requests if 429 is encountered

        if (response.statusCode === 429) {
            return this._defer({ method, path, options }, elapsed);
        }

        return response;
    }
};

internals.validateStatus = function (code) {

    return code === 429 || (code >= 200 && code < 300);
};

internals.hash = function (method, path) {

    return path.replace(internals.majorParamsRx, (match, resource) => {

        if (resource === 'guilds' ||
            resource === 'channels') {

            match = `/${resource}/{id}`;
        }

        return `${method.toUpperCase()} ${match}`;
    });
};
