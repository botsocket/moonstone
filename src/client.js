'use strict';

const Events = require('events');

const Quartz = require('@botsocket/quartz');
const Bornite = require('@botsocket/bornite');

const User = require('./entities/user');
const Settings = require('./settings');
const Utils = require('./utils');
const Package = require('../package');

const internals = {};

exports.client = function (options) {

    return new internals.Client(options);
};

internals.Client = class {

    constructor(options) {

        this._settings = Settings.apply('client', options);

        this._url = null;
        this._gateway = null;
        this._rest = Bornite.custom({
            baseUrl: 'https://discord.com/api/v8',
            headers: {
                Authorization: `Bot ${this._settings.token}`,
                'User-Agent': `DiscordBot (${Package.homepage}, ${Package.version}) Node.js/${process.version}`,
            },
        });

        // Public interfaces

        this.events = new Events.EventEmitter();
        this.user = null;
    }

    async start() {

        // Fetch gateway url

        if (!this._url) {
            const response = await this._rest.get('/gateway');
            const payload = Utils.payload(response);
            this._url = payload.url + '/?v=8&encoding=json';
        }

        // Connect to gateway

        const gateway = Quartz.client(this._url, { ...this._settings.gateway, token: this._settings.token });
        this._gateway = gateway;

        gateway.onDispatch = (event, data) => {

            return this._process(event, data);
        };

        return gateway.connect();
    }

    stop() {

        if (!this._gateway) {
            return Promise.resolve();
        }

        return this._gateway.disconnect();
    }

    _process(event, data) {

        if (event === 'READY') {
            this.user = new User(this, data.user);
            this.events.emit('ready');
        }
    }
};
