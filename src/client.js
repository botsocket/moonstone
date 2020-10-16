'use strict';

const Events = require('events');

const Quartz = require('@botsocket/quartz');
const Bornite = require('@botsocket/bornite');

const Settings = require('./settings');
const Package = require('../package');

const internals = {};

exports.client = function (options) {

    return new internals.Client(options);
};

internals.Client = class {

    constructor(options) {

        this._settings = Settings.apply('client', options);

        this._bornite = null;
        this._quartz = null;

        this.events = new Events.EventEmitter();

        this._setup();
    }

    _setup() {

        // Setup bornite instance

        this._bornite = Bornite.custom({
            baseUrl: 'https://discord.com/api/v6',
            headers: {
                Authorization: `Bot ${this._settings.token}`,
                'User-Agent': `DiscordBot (${Package.homepage}, ${Package.version}) Node.js/${process.version}`,
            },
        });
    }

    async start() {

        // Fetch gateway url

        const response = await this._bornite.get('/gateway');

        if (response.statusCode !== 200) {
            throw new Error(`Server responded with status code ${response.statusCode}`);
        }

        // Connect to gateway

        const quartz = Quartz.client(response.url, { ...this._settings.gateway, token: this._settings.token });
        this._quartz = quartz;

        quartz.onDispatch = (event, data) => {

            return this._handle(event, data);
        };

        return quartz.connect();
    }

    stop() {

        if (!this._quartz) {
            return Promise.resolve();
        }

        return this._quartz.disconnect();
    }

    _handle() {

        // Stuff
    }
};
