'use strict';

const Events = require('events');

const Radar = require('@botbind/radar');

const Gateway = require('./gateway');
const Handlers = require('./handlers');
const Settings = require('./settings');
const Package = require('../package.json');

module.exports = class {
    constructor(options) {

        this._settings = Settings.apply(options, 'client');
        this._radar = Radar.custom({
            baseUrl: 'https://discord.com/api/v6',
            headers: {
                Authorization: `Bot ${this._settings.token}`,
                'User-Agent': `DiscordBot (${Package.homepage}, ${Package.version}) Node.js/${process.version}`,
            },
        });

        this.gateway = new Gateway(this);
        this.events = new Events.EventEmitter();
        this.user = null;                                   // Client user
        this.guilds = new Map();                            // Active guilds. id -> guild

        this._debug();
    }

    _debug() {

        // Debug mode

        if (this._settings.debug) {
            this.events.on('debug', (context) => {

                console.log(`[${context.type}] ${context.message}`);
            });
        }

        this.gateway.events.on('error', (error) => {

            this.events.emit('debug', { type: 'info', message: `Gateway for shard ${this.gateway._shard.join('/')} errored: ${error.message}` });
        });

        this.gateway.events.on('dispatch', (event, data) => {

            Handlers.handle(this, event, data);
        });
    }

    async start() {

        //  Shard if specified

        if (this._settings.gateway) {
            return this.gateway._start(this._settings.gateway);
        }

        // Single shard

        const response = await this._radar.get('/gateway');

        if (response.statusCode !== 200) {
            throw new Error(`Server responded with status code ${response.statusCode}`);
        }

        return this.gateway._start(response.payload);
    }

    stop() {

        return this.gateway._stop();
    }
};
