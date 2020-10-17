'use strict';

const Events = require('events');

const Quartz = require('@botsocket/quartz');
const Bornite = require('@botsocket/bornite');

const User = require('./entities/user');
const Guild = require('./entities/guild');
const Settings = require('./settings');
const Package = require('../package');

const internals = {};

exports.client = function (options) {

    return new internals.Client(options);
};

internals.Client = class {

    constructor(options) {

        this._settings = Settings.apply('client', options);

        this._url = null;
        this._quartz = null;
        this._bornite = Bornite.custom({
            baseUrl: 'https://discord.com/api/v8',
            headers: {
                Authorization: `Bot ${this._settings.token}`,
                'User-Agent': `DiscordBot (${Package.homepage}, ${Package.version}) Node.js/${process.version}`,
            },
        });

        // Public interfaces

        this.events = new Events.EventEmitter();
        this.user = null;
        this.guilds = new Map();
    }

    async start() {

        // Fetch gateway url

        if (!this._url) {
            const response = await this._bornite.get('/gateway');
            this._url = response.payload.url + '/?v=8&encoding=json';
        }

        // Connect to gateway

        const quartz = Quartz.client(this._url, { ...this._settings.gateway, token: this._settings.token });
        this._quartz = quartz;

        quartz.onDispatch = (event, data) => {

            return this._process(event, data);
        };

        return quartz.connect();
    }

    stop() {

        if (!this._quartz) {
            return Promise.resolve();
        }

        return this._quartz.disconnect();
    }

    _process(event, data) {

        event = internals.event(event);

        if (event === 'ready') {
            this.user = new User(this, data.user);
            return this.events.emit(event);
        }

        if (event === 'guildCreate') {
            const guild = new Guild(this, data);
            this.guilds.set(data.id, guild);
            return this.events.emit(event, guild);
        }

        if (event === 'guildUpdate') {
            const guild = this.guilds.get(data.id);
            guild._update(data);
            return this.events.emit(event, guild);
        }

        if (event === 'channelCreate' || event === 'channelUpdate') {
            const guild = this.guilds.get(data.guild_id);
            const channel = guild._upsertChannel(data);
            return this.events.emit(event, channel);
        }
    }
};

internals.event = function (event) {

    const lowercased = event.toLowerCase();
    return lowercased.replace(/[-_]([a-z])/g, ($0, $1) => {

        return $1.toUpperCase();
    });
};
