'use strict';

const User = require('./entities/user');

const internals = {};

exports.dispatch = function (client, event, data) {

    event = internals.event(event);

    const handler = internals.handlers[event];
    if (handler) {
        handler(client, data);
    }
};

internals.event = function (event) {

    return event
        .toLowerCase()
        .replace(/_([a-z])/g, (_, char) => {

            return char.toUpperCase();
        });
};

internals.handlers = {};

internals.handlers.ready = function (client, data) {

    if (client.user) {
        client.user._update(data.user);
    }
    else {
        client.user = new User(client, data.user);
    }

    client.events.emit('ready');
};
