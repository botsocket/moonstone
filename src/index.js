'use strict';

const Client = require('./client');

exports.client = function (options) {

    return new Client(options);
};
