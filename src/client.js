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

        this.gateway = new Gateway(this);
        this.events = new Events.EventEmitter();

        this._debug();
        this._initialize();
    }

    async start() {

        //  Shard if specified

        if (this._settings.gateway) {
            return this.gateway._start(this._settings.gateway);
        }

        // Single shard

        const response = await this._radar.get('/api/v6/gateway');

        if (response.statusCode !== 200) {
            throw new Error(`Sever responded with code ${response.statusCode} - ${response.statusMessage}`);
        }

        return this.gateway._start(response.payload);
    }

    stop() {

        return this.gateway._stop();
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

    _initialize() {

        this.gateway.events
            .on('error', (error) => {

                this.log('error', `Gateway for shard ${this.gateway._shard.join('/')} errored: ${error.message}`);
            })
            .on('dispatch', (event, data) => {

                this.events.emit(event, data);
            });
    }
};
