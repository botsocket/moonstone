'use strict';

const internals = {};

exports.generate = function () { };

internals.Text = class {
    constructor(client) {

        this.client = client;

        this.type = 'GUILD_TEXT';
    }

    _update(data) {

        this.id = data.id;
        this.type = internals.types[data.type];
        this.guild = this.client.guilds.get(data.guild_id);
    }
};
