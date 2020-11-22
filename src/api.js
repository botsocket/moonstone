'use strict';

const Bornite = require('@botsocket/bornite');

const Package = require('../package');

const internals = {
    baseUrl: 'https://discord.com/api/v8',
    userAgent: `DiscordBot (${Package.homepage}, ${Package.version}) Node.js/${process.version}`,
};

module.exports = internals.Api = class {
    constructor(settings) {

        this.url = internals.baseUrl;

        this._buckets = {};
        this._api = Bornite.custom({
            baseUrl: internals.baseUrl,
            validateStatus: true,
            headers: {
                Authorization: `Bot ${settings.token}`,
                'User-Agent': settings.userAgent || internals.userAgent,
            },
        });
    }

    async _request(url, options) {

        let response;
        try {
            response = await this._api.request(url, options);
        }
        catch (error) {
            response = error.response;
            if (!response) {
                throw error;
            }

            // 401 Unauthorized

            if (response.statusCode === 401) {
                throw new Error('Invalid token');
            }

            // 403 Forbidden

            if (response.statusCode === 403) {
                throw new Error('Insufficient permissions');
            }

            // 429 Rate limited

            if (response.statusCode === 429) {
                const id = response.headers['x-ratelimit-bucket'];
                let bucket = this._buckets[id];

                if (!bucket) {
                    bucket = new internals.Bucket(this, id);
                    this._buckets[id] = bucket;
                }

                bucket.initialize(response);

                return new Promise((resolve, reject) => {

                    return bucket.add({ resolve, reject, url, options });
                });
            }

            throw error;
        }

        return response.payload;
    }
};

internals.setup = function () {

    for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
        internals.Api.prototype[method] = function (url, options) {

            return this._request(url, { ...options, method });
        };
    }
};

internals.setup();

internals.Bucket = class {
    constructor(api, id) {

        this.api = api;

        this.id = id;
        this.state = null;                  // { delay, limit }
        this.requests = [];                 // { url, options, resolve, reject }
    }

    initialize(response) {

        if (!this.state) {
            this.state = {
                delay: Number(response.headers['x-ratelimit-reset-after']),
                limit: Number(response.headers['x-ratelimit-limit']),
            };
        }

        this.setupTimer();
    }

    setupTimer() {

        const resetTimer = setTimeout(async () => {

            // Collect requests to be sent

            const requests = this.requests.splice(0, this.state.limit);

            // Cleanup

            clearTimeout(resetTimer);
            this.state = null;                      // State re-initialize when pending requests are made

            // Send pending requests

            const promises = requests.map(async (request) => {

                let response;
                try {
                    response = await this.api._request(request.url, request.options);
                }
                catch (error) {
                    return request.reject(error);
                }

                return request.resolve(response);
            });

            const responses = await Promise.all(promises);

            // Remove inactive buckets

            if (!this.requests.length) {
                delete this.api._buckets[this.id];
                return;
            }

            this.initialize(responses[responses.length - 1]);
        }, this.state.delay);
    }

    add(request) {

        this.requests.push(request);
    }
};
