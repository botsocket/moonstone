'use strict';

const Utils = require('../utils');
const BitField = require('../bitfield');

const internals = {
    permissions: {
        CREATE_INSTANT_INVITE: 1 << 0,
        KICK_MEMBERS: 1 << 1,
        BAN_MEMBERS: 1 << 2,
        ADMINISTRATOR: 1 << 3,
        MANAGE_CHANNELS: 1 << 4,
        MANAGE_GUILD: 1 << 5,
        ADD_REACTIONS: 1 << 6,
        VIEW_AUDIT_LOG: 1 << 7,
        PRIORITY_SPEAKER: 1 << 8,
        STREAM: 1 << 9,
        VIEW_CHANNEL: 1 << 10,
        SEND_MESSAGES: 1 << 11,
        SEND_TTS_MESSAGES: 1 << 12,
        MANAGE_MESSAGES: 1 << 13,
        EMBED_LINKS: 1 << 14,
        ATTACH_FILES: 1 << 15,
        READ_MESSAGE_HISTORY: 1 << 16,
        MENTION_EVERYONE: 1 << 17,
        USE_EXTERNAL_EMOJIS: 1 << 18,
        VIEW_GUILD_INSIGHTS: 1 << 19,
        CONNECT: 1 << 20,
        SPEAK: 1 << 21,
        MUTE_MEMBERS: 1 << 22,
        DEAFEN_MEMBERS: 1 << 23,
        MOVE_MEMBERS: 1 << 24,
        USE_VAD: 1 << 25,
        CHANGE_NICKNAME: 1 << 26,
        MANAGE_NICKNAMES: 1 << 27,
        MANAGE_ROLES: 1 << 28,
        MANAGE_WEBHOOKS: 1 << 29,
        MANAGE_EMOJIS: 1 << 30,
    },

    types: {
        0: 'GuildText',
        1: 'Dm',
        2: 'GuildVoice',
        4: 'GuildCategory',
        5: 'GuildNews',
        6: 'GuildStore',
    },
};

exports.generate = function (client, data) {

    const type = internals.types[data.type];
    return internals[type](client, data);
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

internals.GuildChannel = class extends internals.BaseChannel {
    constructor(client, data, type) {

        super(client, data, type);

        this.guild = client.guilds.get(data.guild_id);
        this.overwrites = new Map();
        this._update(data);
    }

    _update(data) {

        this.name = data.name;
        this.nsfw = Boolean(data.nsfw);
        this.parent = data.parent_id ? this.client.channels.get(data.parent_id) : null;

        // Permission overwrites

        if (data.permission_overwrites) {
            for (const overwrite of data.permission_overwrites) {
                this.overwrites.set(overwrite.id, internals.overwrite(overwrite));
            }
        }
    }

    modify(data) {

        return this.client.api.patch((params) => `/channels/${params.channel}`, { channel: this.id }, { payload: data });
    }
};

internals.overwrite = function (overwrite) {

    return {
        id: overwrite.id,
        type: overwrite.type ? 'member' : 'role',
        allow: BitField.decode(overwrite.allow, internals.permissions),
        deny: BitField.decode(overwrite.deny, internals.permissions),
    };
};

internals.GuildText = class extends internals.GuildChannel {
    constructor(client, data) {

        super(client, data, 'text');
    }

    _update(data) {

        super._update(data);

        this.topic = data.topic || null;
        this.slowmodeInterval = data.rate_limit_per_user;
    }
};

internals.GuildVoice = class extends internals.GuildChannel {
    constructor(client, data) {

        super(client, data, 'voice');
    }

    _update(data) {

        super._update(data);

        this.bitrate = data.bitrate;
        this.userLimit = data.user_limit || Infinity;
    }
};

internals.Dm = class extends internals.BaseChannel {

};

internals.GuildCategory = class extends internals.GuildChannel {
    constructor(client, data) {

        super(client, data, 'category');
    }
};

internals.GuildNews = class extends internals.GuildChannel {
    constructor(client, data) {

        super(client, data, 'news');
    }

    _update(data) {

        super._update(data);

        this.topic = data.topic || null;
    }
};

internals.GuildStore = class extends internals.GuildChannel { };
