'use strict';

const User = require('./entities/user');

const internals = {};

exports.dispatch = function (client, event, data) {

    event = event.toLowerCase().replace(/_([a-z])/g, (_, char) => char.toUpperCase());
    if (internals[event]) {
        internals[event](client, data);
    }
};

internals.ready = function (client, data) {

    if (client.user) {
        client.user._update(data.user);
    }
    else {
        client.user = new User(client, data.user);
    }

    client.events.emit('ready');
};
