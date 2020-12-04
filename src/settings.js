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
    api: Jade.obj({
        userAgent: Jade.str(),
    })
        .default(),
    gateway: Jade.obj().default(),                          // Validated in Quartz
    commands: Jade.obj().default(),                         // Validated in Ruby
})
    .default();

internals.avatar = Jade.obj({
    extension: Jade.valid('webp', 'png', 'jpg', 'jpeg', 'gif', '.webp', '.png', '.jpg', '.jpeg', '.gif').default('png'),
    size: Jade.valid(16, 32, 64, 128, 256, 512, 1024, 2048, 4096),
});
