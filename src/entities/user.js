'use strict';

const Cdn = require('../cdn');

module.exports = class {
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
        this.mfaEnabled = Boolean(data.mfa_enabled);
        this.locale = data.locale || null;
        this.flags = data.flags || null;
        this.premiumType = data.premium_type || null;
        this.publicFlags = data.flags || null;
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
