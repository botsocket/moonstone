'use strict';

const User = require('./user');

const internals = {};

exports.handle = function (client, event, data) {

    if (internals[event]) {
        internals[event](client, data);
    }
};

internals.ready = function (client, data) {

    if (client.user) {
        return client.user._update(data.user);
    }

    // First time ready

    client.user = new User(data.user);
    client.events.emit('ready');
};
