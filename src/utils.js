'use strict';

const internals = {
    epoch: 1420070400000,
};

exports.idToDate = function (id) {

    const value = BigInt(id) >> 22n + BigInt(internals.epoch);
    return new Date(Number(value));
};
