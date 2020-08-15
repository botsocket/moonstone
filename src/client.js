'use strict';

const Events = require('events');

const Radar = require('@botbind/radar');

const Gateway = require('./gateway');
const Settings = require('./settings');

module.exports = class {
    constructor(options) {

        this._settings = Settings.apply(options, 'client');
        this._radar = Radar.custom({
            baseUrl: 'https://discord.com/api/v6',
            headers: {
                Authorization: `Bot ${this._settings.token}`,
            },
        });

        this.gateway = null;
        this.events = new Events.EventEmitter();

        this._init();
    }

    async start() {

        // Shard if specified

        const shard = this._settings.shard;
        if (shard) {
            return this._start(shard);
        }

        // Start single shard

        const response = await this._radar.get('/gateway');

        if (response.statusCode !== 200) {
            throw new Error(`Sever responded with code ${response.statusCode} - ${response.statusMessage}`);
        }

        this._start(response.payload);
    }

    stop() {

        if (this._settings.debug) {


        }

        if (this.gateway) {
            return this.gateway.stop();
        }

        return Promise.resolve();
    }

    // Private methods

    _init() {

        // Setup debug

        if (this._settings.debug) {
            this.events.on('debug', (context) => {

                console.log(`[${context.type}] ${context.message}`);
            });
        }

        // Register gateway events

        if (this.gateway) {
            this.gateway.events.on('open', () => {

                this.events.emit('debug', { type: 'info', message: `Gateway opened for shard ${this.gateway._shardId}` });
            });
        }
    }

    _start(shard) {

        this.gateway = new Gateway(this, shard);

        return new Promise((resolve, reject) => {

            this.gateway._start((error) => {

                if (error) {
                    return reject(error);
                }

                return resolve();
            });
        });
    }
};
