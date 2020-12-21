'use strict';

const Utils = require('../utils');
const BitField = require('../bitfield');

const internals = {
    types: {                    // https://discord.com/developers/docs/resources/channel#channel-object-channel-types
        0: 'GuildText',
        1: 'Dm',
        2: 'GuildVoice',
        4: 'GuildCategory',
        5: 'GuildNews',
        6: 'GuildStore',
    },
};

exports.generate = function (client, data, guild) {

    const type = internals.types[data.type];
    return internals[type](client, data, type, guild);
};

internals.BaseChannel = class {
    constructor(client, data, type) {

        this.client = client;

        this.id = data.id;
        this.createdAt = Utils.idToDate(data.id);
        this.type = type;
    }

    delete() {

        return this.client.api.delete((params) => `/channels/${params.channel}`, { channel: this.id });
    }

    toString() {

        return `<#${this.id}>`;
    }
};

internals.Dm = class extends internals.BaseChannel { };

internals.GuildChannel = class extends internals.BaseChannel {
    constructor(client, data, type, guild) {

        super(client, data, type);

        this.guild = guild || client.guilds.get(data.guild_id);
        this.overwrites = new Map();

        this._update(data);
    }

    _update(data) {

        this.name = data.name;

        // Permission overwrites

        for (const overwrite of data.permission_overwrites) {
            const allowBits = Number(overwrite.allow);
            const denyBits = Number(overwrite.deny);

            const entry = {
                allow: BitField.decode(allowBits, Utils.permissions),
                deny: BitField.decode(denyBits, Utils.permissions),
                _allowBits: allowBits,
                _denyBits: denyBits,
            };

            this.overwrites.set(overwrite.id, entry);

            if (data.type) {
                entry.member = this.guild.members.get(data.id);
            }
            else {
                entry.role = this.guild.roles.get(data.id);
            }
        }
    }

    modify(data) {

        if (data.overwrites) {
            data.permission_overwrites = data.overwrites;
            delete data.overwrites;
        }

        return this.client.api.patch((params) => `/channels/${params.channel}`, { channel: this.id }, { payload: data });
    }
};

internals.GuildCategory = class extends internals.GuildChannel { };

internals.GuildSingleChannel = class extends internals.GuildChannel {
    _update(data) {

        super._update(data);

        this.nsfw = Boolean(data.nsfw);
        this.categoryId = data.parent_id;

        // Lazy loaded

        this._category = null;
    }

    get category() {

        if (!this._categoryId) {
            return null;
        }

        if (this._category) {
            return this._category;
        }

        const category = this.client.channels.get(this._categoryId);
        this._category = category;
        return category;
    }

    syncPermissions() {

        if (!this.category) {
            return;
        }

        const overwrites = [];
        for (const [id, overwrite] of this.category.overwrites) {
            overwrites.push({
                id,
                type: overwrite.member ? 1 : 0,
                allow: String(overwrite._allowBits),
                deny: String(overwrite._denyBits),
            });
        }

        return this.modify({ overwrites });
    }

    get permissionsSynced() {

        if (!this.category) {
            return false;
        }

        if (this.overwrites.size !== this.category.overwrites.size) {
            return false;
        }

        for (const [id, categoryOverwrite] of this.category.overwrites) {
            const overwrite = this.overwrites.get(id);

            if (!overwrite) {
                return false;
            }

            if (overwrite._allowBits !== categoryOverwrite._allowBits ||
                overwrite._denyBits !== categoryOverwrite._denyBits) {

                return false;
            }
        }

        return true;
    }
};

internals.GuildText = class extends internals.GuildSingleChannel {
    _update(data) {

        super._update(data);

        this.topic = data.topic;

        if (this.type !== 'news') {
            this.slowmodeInterval = data.rate_limit_per_user;
        }
    }
};

internals.GuildVoice = class extends internals.GuildSingleChannel {
    _update(data) {

        super._update(data);

        this.bitrate = data.bitrate;
        this.userLimit = data.user_limit || Infinity;
    }
};

internals.GuildNews = class extends internals.GuildText { };

internals.GuildStore = class extends internals.GuildSingleChannel { };
