'use strict';

const Settings = require('./settings');

const internals = {
    baseUrl: 'https://cdn.discordapp.com',
};

exports.avatar = function (hash, discriminator, options) {

    const settings = Settings.apply('avatar', options);
    const sizeQuery = settings.size ? `?size=${settings.size}` : '';

    let extension = settings.extension;
    if (extension[0] !== '.') {
        extension = '.' + extension;
    }

    if (!hash) {
        return `${internals.baseUrl}/embed/avatars/${discriminator % 5}${extension}${sizeQuery}`;
    }

    return `${internals.baseUrl}/avatars/${this.id}/${hash}${extension}${sizeQuery}`;
};
