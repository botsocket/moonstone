'use strict';

const Lyra = require('@botbind/lyra');

const internals = {};

exports.apply = function (options, type) {

    const schema = internals[type];

    try {
        return schema.attempt(options);
    }
    catch (error) {
        throw new Error(`Options for ${type} is invalid: ${error.message}`);
    }
};

internals.client = Lyra.obj({
    token: Lyra.str().required(),
    debug: Lyra.bool().default(false),
    timeout: Lyra.num(),
    reconnect: Lyra.obj(
        {
            delay: Lyra.num().default(1000),
            maxDelay: Lyra.num().default(5000),
            attempts: Lyra.num().allow(Infinity, false).default(Infinity),
        },
    )
        .allow(true, false)
        .messages({
            'object.base': '{#label} must be a boolean or an object',
        }),
    gateway: {
        url: Lyra.str().required(),
        shard: Lyra.arr().ordered(Lyra.num().required(), Lyra.num().required()).required(),
    },
})
    .default();
