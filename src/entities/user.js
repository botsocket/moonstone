'use strict';

const BitField = require('../bitfield');
const Cdn = require('../cdn');

const internals = {
    subcriptions: {                 // https://discord.com/developers/docs/resources/user#user-object-premium-types
        0: 'NONE',
        1: 'NITRO_CLASSIC',
        2: 'NITRO',
    },

    flags: {
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

internals.User = class {
    constructor(client, data) {

        this.client = client;
        this._update(data);
    }

    _update(data) {

        this.id = data.id;
        this.username = data.username;
        this.discriminator = data.discriminator;
        this.avatar = data.avatar;
        this.bot = Boolean(data.bot);
        this.system = Boolean(data.system);
        this.locale = data.locale || null;
        this.flags = data.flags !== undefined ? BitField.decode(data.flags, internals.flags) : null;
        this.publicFlags = data.public_flags !== undefined ? BitField.decode(data.public_flags, internals.flags) : null;
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

    async createDm() {

        const response = await this.client.api.post('/users/@me/channels', { payload: { recipient_id: this.id } });
        return response.payload;
    }
};

internals.ClientUser = class extends internals.User {
    _update(data) {

        super._update(data.user);

        this.verified = Boolean(this.verified);
        this.mfaEnabled = Boolean(data.mfa_enabled);
    }
};
