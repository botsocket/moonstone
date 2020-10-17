'use strict';

const Settings = require('../settings');

module.exports = class {
    constructor(client, data) {

        this.client = client;

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

    avatarUrl(options = {}) {

        const settings = Settings.apply('avatarUrl', options);
        const sizeQuery = settings.size ? `?size=${settings.size}` : '';

        let extension = settings.extension;
        if (extension[0] !== '.') {
            extension = '.' + extension;
        }

        const baseUrl = 'https://cdn.discordapp.com';

        if (!this.avatar) {
            return `${baseUrl}/embed/avatars/${this.discriminator % 5}${extension}${sizeQuery}`;
        }

        return `${baseUrl}/avatars/${this.id}/${this.avatar}${extension}${sizeQuery}`;
    }

    async createDm() {

        const response = await this.client._rest.post('/users/@me/channels', { payload: { recipient_id: this.id } });
        return response.payload;
    }
};
