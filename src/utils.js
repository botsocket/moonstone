'use strict';

exports.payload = function (response) {

    if (response.statusCode !== 200) {
        throw new Error(`Server responded with status code ${response.statusCode}`);
    }

    return response.payload;
};
