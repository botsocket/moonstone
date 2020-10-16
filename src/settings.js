'use strict';

const Jade = require('@botsocket/jade');

const internals = {};

exports.apply = function (type, options) {

    const schema = internals[type];

    try {
        return schema.attempt(options);
    }
    catch (error) {
        throw new Error(`Options for ${type} is invalid: ${error.message}`);
    }
};

internals.client = Jade.obj({
    token: Jade.str().required(),
    debug: Jade.bool().default(false),
    gateway: Jade.object(),                         // Validated in Quartz
})
    .default();
