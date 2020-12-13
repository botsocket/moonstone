'use strict';

const Settings = require('./settings');

const internals = {
    baseUrl: 'https://cdn.discordapp.com',
};

exports.defaultAvatar = function (discriminator, options) {

    const suffix = internals.suffix(options);
    return `${internals.baseUrl}/embed/avatars/${discriminator % 5}${suffix}`;
};

exports.avatar = function (id, hash, options) {

    const suffix = internals.suffix(options);
    return `${internals.baseUrl}/avatars/${id}/${hash}${suffix}`;
};

internals.suffix = function (options) {

    const image = Settings.apply('image', options);
    const size = image.size ? `?size=${image.size}` : '';

    let extension = image.extension;
    if (extension[0] !== '.') {
        extension = '.' + extension;
    }

    return extension + size;
};
