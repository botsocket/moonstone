'use strict';

exports.decode = function (bits, bitmasks) {

    const result = [];

    for (const value of Object.keys(bitmasks)) {
        const bitmask = bitmasks[value];
        if ((bits & bitmask) === bitmask) {
            result.push(value);
        }
    }

    return result;
};
