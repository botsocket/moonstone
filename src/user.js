'use strict';

module.exports = class {
    constructor(data) {

        this.id = data.id;                              // User id
        this.bot = Boolean(data.bot);                   // Whether the user is a bot

        this._update(data);
    }

    _update(data) {

        this.username = data.username;                  // Username
        this.discriminator = data.discriminator;        // 4-digit tag

    }
};
