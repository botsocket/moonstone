'use strict';

const Bone = require('@botsocket/bone');

const Utils = require('../utils');
const BitField = require('../bitfield');
const Cdn = require('../cdn');

const internals = {
    flags: {                    // https://discord.com/developers/docs/resources/user#user-object-user-flags
        NONE: 0,
        DISCORD_EMPLOYEE: 1 << 0,
        PARTNERED_SERVER_OWNER: 1 << 1,
        HYPESQUAD_EVENTS: 1 << 2,
        BUG_HUNTER_LEVEL_1: 1 << 3,
        HOUSE_BRAVERY: 1 << 6,
        HOUSE_BRILLIANCE: 1 << 7,
        HOUSE_BALANCE: 1 << 8,
        EARLY_SUPPORTER: 1 << 9,
        TEAM_USER: 1 << 10,
        SYSTEM: 1 << 12,
        BUG_HUNTER_LEVEL_2: 1 << 14,
        VERIFIED_BOT: 1 << 16,
        EARLY_VERIFIED_BOT_DEVELOPER: 1 << 17,
    },
};

exports.generate = function (client, data) {

    if (data.user) {
        return new internals.ClientUser(client, data.user);
    }

    return new internals.User(client, data);
};

internals.BaseUser = class {
    constructor(client, data) {

        this.client = client;

        this.id = data.id;
        this.createdAt = Utils.idToDate(data.id);

        this._update(data);
    }

    _update(data) {

        this.username = data.username;
        this.discriminator = data.discriminator;
        this.avatar = data.avatar;
        this.bot = Boolean(data.bot);
        this.system = Boolean(data.system);
        this.flags = data.public_flags !== undefined ? BitField.decode(data.public_flags, internals.flags) : null;
    }

    toString() {

        return `<@${this.id}>`;
    }

    defaultAvatarUrl(options) {

        return Cdn.defaultAvatar(this.discriminator, options);
    }

    avatarUrl(options) {

        if (!this.avatar) {
            return null;
        }

        return Cdn.avatar(this.id, this.avatar, options);
    }

    displayAvatarUrl(options) {

        return this.avatarUrl(options) || this.defaultAvatarUrl(options);
    }
};

internals.User = class extends internals.BaseUser {
    constructor(client, data) {

        super(client, data);

        this._dmChannel = null;
    }

    async createDmChannel() {

        if (this._dmChannel) {
            return this._dmChannel;
        }

        for (const channel of this.client.channels.values()) {
            if (channel.type === 'DM' &&
                channel._recipientId === this.id) {

                this._dmChannel = channel;
                return channel;
            }
        }

        const response = await this.client.api.post('/users/@me/channels', { payload: { recipient_id: this.id } });

        const channel = this.client._dispatchers.channelCreate(response.payload);
        this._dmChannel = channel;
        return channel;
    }

    async closeDmChannel() {

        if (!this._dmChannel) {
            return;
        }

        const channel = await this._dmChannel.delete();
        this._dmChannel = null;
        this.client._dispatchers.channelDelete(channel);
    }
};

internals.ClientUser = class extends internals.BaseUser {
    _update(data) {

        super._update(data.user);

        this.verified = Boolean(this.verified);
        this.mfaEnabled = Boolean(data.mfa_enabled);
    }

    modify(data) {

        return this.client.api.patch('/user/@me', { payload: data });
    }

    setUsername(username) {

        Bone.assert(typeof username === 'string', 'Username must be a string');

        return this.modify({ username });
    }

    setAvatar(avatar) {

        return this.modify({ avatar });
    }
};
