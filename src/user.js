'use strict';

const internals = {
    premiumTypes: {                         // https://discord.com/developers/docs/resources/user#user-object-premium-types
        0: 'None',
        1: 'Nitro Classic',
        2: 'Nitro',
    },
};

module.exports = class {
    constructor(data) {

        this._update(data);
    }

    _update(data) {

        // https://discord.com/developers/docs/resources/user#user-object

        this.id = data.id;                                                          // User id
        this.username = data.username;                                              // Username
        this.discriminator = data.discriminator;                                    // 4-digit tag
        this.avatar = data.avatar;                                                  // User's avatar
        this.bot = Boolean(data.bot);                                               // Whether the user is a bot
        this.system = Boolean(data.system);                                         // Whether the user is part of Discord system
        this.mfaEnabled = Boolean(data.mfaEnabled);                                 // Whether 2-factor is enabled
        this.locale = data.locale || null;                                          // Locale
        this.flags = [];                                                            // User flags
        this.premiumType = internals.premiumTypes[data.premiumType || 0];           // Subscription type
        this.publicFlags = [];                                                      // Public user flags
    }
};
