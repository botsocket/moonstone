'use strict';

const User = require('./entities/user');
const Channel = require('./entities/channel');

const internals = {};

exports.dispatch = function (client, event, data) {

    const normalized = event
        .toLowerCase()
        .replace(/_([a-z])/g, (_, char) => char.toUpperCase());

    const handler = internals[normalized];
    if (handler) {
        handler(client, data);
    }
};

internals.ready = function (client, data) {

    if (client.user) {
        client.user._update(data);
    }
    else {
        client.user = User.generate(client, data);
    }

    client.events.emit('ready');
};

internals.channelCreate = function (client, data) {

    const channel = client.channels.get(data.id);
    if (channel) {
        channel._update(data);
    }
    else {
        client.channels.set(data.id, Channel.generate(client, data));
    }

    client.events.emit('channelCreate', channel);
};
