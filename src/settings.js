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
    reconnect: Lyra.alt(
        Lyra.bool(),
        {
            delay: Lyra.num(),
            maxDelay: Lyra.num(),
            attempt: Lyra.num().allow(Infinity, false),
        },
    )
        .default({
            delay: 1000,
            maxDelay: 5000,
            attempt: Infinity,
        }),
    gateway: {
        url: Lyra.str().required(),
        shard: Lyra.arr().ordered(Lyra.num().required(), Lyra.num().required()),
    },
})
    .default();
