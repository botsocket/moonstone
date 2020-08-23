'use strict';

module.exports = class {
    constructor(data) {

        this._update(data);
    }

    _update(data) {

        // https://discord.com/developers/docs/resources/guild#guild-object

        this.id = data.id;                                                          // Guild id
        this.name = data.name;                                                      // Guild name
        this.icon = data.icon;                                                      // Icon hash
        this.splash = data.splash;                                                  // Splash hash
        this.discoverySplash = data.discoverySplash;                                // Discovery splash hash
        this.ownerId = data.ownerId;                                                // Id of owner
    }
};
