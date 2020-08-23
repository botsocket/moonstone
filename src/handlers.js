'use strict';

const User = require('./user');
const Guild = require('./guild');

const internals = {};

exports.handle = function (client, event, data) {

    console.log(event);

    if (internals[event]) {
        internals[event](client, data);
    }
};

internals.ready = function (client, data) {

    // Update user if already ready (after reconnecting)

    if (client.user) {
        return client.user._update(data.user);
    }

    const user = new User(data.user);
    client.user = user;
    client.users.set(user.id, user);

    client.events.emit('ready');
};

internals.guildCreate = function (client, data) {

    // Update guild if exists

    const existingGuild = client.guilds.get(data.id);
    if (existingGuild) {
        return existingGuild._update(data);
    }

    const guild = new Guild(data);
    client.guilds.set(guild.id, guild);

    client.events.emit('guildCreate', guild);
};
