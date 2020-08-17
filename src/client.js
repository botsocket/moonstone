'use strict';

const Events = require('events');

const Radar = require('@botbind/radar');

const Gateway = require('./gateway');
const Settings = require('./settings');
const Package = require('../package.json');

module.exports = class {
    constructor(options) {

        this._settings = Settings.apply(options, 'client');

        this._radar = Radar.custom({
            baseUrl: 'https://discord.com',
            headers: {
                Authorization: `Bot ${this._settings.token}`,
                'User-Agent': `DiscordBot (${Package.homepage}, ${Package.version}) Node.js/${process.version}`,
            },
        });

        this.gateway = null;
        this.events = new Events.EventEmitter();

        this._debug();
    }

    async start() {

        // Shard if specified

        if (this._settings.gateway) {
            return this._start(this._settings.gateway);
        }

        // Start single shard

        const response = await this._radar.get('/api/v6/gateway');

        if (response.statusCode !== 200) {
            throw new Error(`Sever responded with code ${response.statusCode} - ${response.statusMessage}`);
        }

        const options = response.payload;
        options.shard = [0, 1];

        return this._start(options);
    }

    stop() {

        if (this.gateway) {
            return new Promise((resolve) => {

                this.gateway._stop(resolve);
            });
        }

        return Promise.resolve();
    }

    log(type, message) {

        this.events.emit('debug', { type, message });
    }

    // Private methods

    _debug() {

        if (this._settings.debug) {
            this.events.on('debug', (context) => {

                console.log(`[${context.type}] ${context.message}`);
            });
        }
    }

    _start(options) {

        const gateway = new Gateway(this, options);
        this.gateway = gateway;

        gateway.events
            .on('error', (error) => {

                this.log('error', new Error(`Gateway for shard ${this._displayShard} errored: ${error.message}`));
            })
            .on('dispatch', (event, data) => {

                this.events.emit(event, data);
            });

        return new Promise((resolve, reject) => {

            gateway._start(true, (error) => {

                if (error) {
                    return reject(error);
                }

                return resolve();
            });
        });
    }
};
