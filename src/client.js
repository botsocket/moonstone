'use strict';

const Events = require('events');

const Quartz = require('@botsocket/quartz');
const Ruby = require('@botsocket/ruby');

const Api = require('./api');
const Dispatcher = require('./dispatcher');
const Settings = require('./settings');

const internals = {};

exports.client = function (options) {

    return new internals.Client(options);
};

internals.Client = class {
    constructor(options) {

        this._settings = internals.settings(options);

        this._commands = Ruby.registry(this._settings.commands);
        this.api = new Api(this._settings.api);
        this.gateway = null;
        this.events = new Events.EventEmitter();
        this.user = null;
        this.guilds = new Map();
        this.channels = new Map();

        this._debug();
    }

    _debug() {

        if (this._settings.debug) {
            this.events.on('log', (level, data) => {

                const output = typeof data === 'object' ? JSON.stringify(data) : output;
                console.log(`[${level}] ${output}`);
            });
        }
    }

    log(level, data) {

        this.events.emit('log', level, data);
    }

    get commands() {

        return this._commands.definitions;
    }

    command(...definitions) {

        this._commands.add(...definitions);
    }

    async start() {

        if (this.gateway) {
            return this.gateway.connect();
        }

        // Fetch gateway url

        const response = await this.api.get('/gateway');
        const url = response.payload.url;

        // Connect to gateway

        const gateway = Quartz.client(url, this._settings.gateway);
        this.gateway = gateway;

        gateway.onDispatch = (event, data) => {

            Dispatcher.dispatch(this, event, data);
        };

        return gateway.connect();
    }

    stop() {

        if (!this.gateway) {
            return Promise.resolve();
        }

        return this.gateway.disconnect();
    }
};

internals.settings = function (options) {

    const settings = Settings.apply('client', options);

    const token = settings.token;
    delete settings.token;

    settings.gateway.token = token;
    settings.api.token = token;

    const prefix = settings.prefix;
    delete settings.prefix;

    if (prefix) {
        settings.commands.prefix = prefix;
    }

    return settings;
};
