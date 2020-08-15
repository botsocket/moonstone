'use strict';

const Lyra = require('@botbind/lyra');

const internals = {};

exports.apply = function (options, type) {

    const schema = internals[type];
    return schema.attempt(options);
};

internals.client = Lyra.obj({
    token: Lyra.str().required(),
    debug: Lyra.bool().default(false),
    shard: {
        url: Lyra.str().required(),
        id: Lyra.num().required(),
        total: Lyra.num().required(),
    },

});
