/* eslint-disable camelcase */

'use strict';

const Ws = require('ws');

const internals = {
    opCodes: {                              // https://discord.com/developers/docs/topics/opcodes-and-status-codes
        dispatch: 0,
        heartbeat: 1,
        identify: 2,
        resume: 6,
        reconnect: 7,
        invalidSession: 9,
        hello: 10,
        heartbeatAck: 11,
    },
};

exports.config = {
    gatewayUrl: 'ws://localhost:3000',
    token: 'Some token',
    sessionId: 'Some id',
    userId: 'Some other id',
    heartbeatInterval: 42.5 * 1000,
};

exports.gateway = function () {

    const server = new Ws.Server({ port: 3000 });
    const config = exports.config;

    server.on('connection', (socket) => {

        const original = socket.send.bind(socket);
        socket.send = (data) => {

            return original(JSON.stringify(data));
        };

        socket.send({
            op: internals.opCodes.hello,
            d: {
                heartbeat_interval: config.heartbeatInterval,
            },
        });

        socket.on('message', (message) => {

            const payload = JSON.parse(message);

            if (payload.op === internals.opCodes.identify) {
                if (payload.d.token === config.token) {
                    return socket.send({
                        op: internals.opCodes.dispatch,
                        t: 'READY',
                        d: {
                            session_id: config.sessionId,
                            user: {
                                id: config.userId,
                                username: 'Nebula',
                                discriminator: '1111',
                                bot: true,
                            },
                        },
                    });
                }

                socket.close(4004);                 // Authentication failed
                return;
            }

            if (payload.op === internals.opCodes.heartbeat) {
                return socket.send({
                    op: internals.opCodes.heartbeatAck,
                });
            }
        });
    });

    return () => {

        server.close();
        server.removeAllListeners();
    };
};
