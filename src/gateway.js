'use strict';

const Events = require('events');

const Dust = require('@botbind/dust');
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
    ratelimit: {                            // https://discord.com/developers/docs/topics/gateway#rate-limiting
        total: 120,
        timeout: 60 * 1000,
    },
};

internals.nonReconnectableCodes = [
    4004,                                   // Invalid token
    4010,                                   // Invalid shard
    4011,                                   // Sharding required
    4013,                                   // Invalid intents
    4014,                                   // Disallowed intents
];

module.exports = class {
    constructor(client) {

        this.client = client;
        this.events = new Events.EventEmitter();

        this._ws = null;                                                // WebSocket connection

        // Settings

        this._url = null;                                               // WebSocket URL
        this._shard = null;                                             // Total number of shards

        // State

        this.id = null;                                                 // Session id
        this._seq = null;                                               // Sequence number
        this._heartbeatTimer = null;                                    // Heartbeat interval
        this._heartbeatAcked = true;                                    // Whether the last heartbeat is acknowledged
        this._payloads = [];                                            // Pending payloads to be sent
        this._ratelimitTimer = null;                                    // Rate limit timeout
        this._remainingPayloads = internals.ratelimit.total;            // Remaining payloads until rate limited
        this._reconnection = null;                                      // Reconnection config
        this._reconnectionTimer = null;                                 // Reconnection timeout
        this._disconnectCallback = null;                                // _disconnect() callback
    }

    _start(options) {

        Dust.assert(!this._ws, 'Client already started');
        Dust.assert(!this._reconnection, 'Cannot start a client while it is attempting to reconnect');

        const reconnect = this.client._settings.reconnect;
        if (reconnect !== false) {                                                                  // Defaults to true
            this._reconnection = {
                wait: 0,
                delay: reconnect.delay || 1000,
                maxDelay: reconnect.maxDelay || 5000,
                attempts: reconnect.attempts === undefined ? Infinity : reconnect.attempts,            // Could be 0
            };
        }

        this._url = options.url;
        this._shard = options.shard || [0, 1];

        return new Promise((resolve, reject) => {

            this._connect((error) => {

                if (error) {
                    return reject(error);
                }

                return resolve();
            });
        });
    }

    _stop() {

        return new Promise((resolve) => {

            this._disconnect(resolve);
        });
    }

    _connect(callback) {

        const ws = new Ws(this._url);
        this._ws = ws;

        const finalize = (error) => {

            if (callback) {
                const holder = callback;
                callback = null;
                return holder(error);
            }

            if (error) {
                this.events.emit('error', error);
            }
        };

        const timeoutHandler = () => {

            finalize(new Error('Connection timed out'));

            this._cleanup();
            this._reconnect();
        };

        const timeout = this.client._settings.timeout ? setTimeout(timeoutHandler, this.client._settings.timeout) : null;

        // Event handlers

        const onOpen = () => {

            this.events.emit('open');

            clearTimeout(timeout);
        };

        const onError = (error) => {

            clearTimeout(timeout);

            finalize(error);

            this._cleanup();
            this._reconnect();
        };

        const onMessage = (message) => {

            this._onMessage(message, finalize);
        };

        const onClose = (code, reason) => {

            reason = reason || 'Unknown reason';

            this.events.emit('close', { code, reason });

            this._cleanup();

            if (internals.nonReconnectableCodes.includes(code)) {
                return finalize(new Error(code === 4004 ? 'Invalid token' : reason));
            }

            if (this._disconnectCallback) {
                const disconnectCallback = this._disconnectCallback;
                this._disconnectCallback = null;
                return disconnectCallback();
            }

            if (!this._reconnection.attempts) {
                return finalize(new Error('Maximum reconnection attempts reached'));
            }

            this._reconnect();
        };

        ws.once('open', onOpen);
        ws.once('error', onError);
        ws.on('message', onMessage);
        ws.once('close', onClose);
    }

    _cleanup(code) {

        if (this._ws) {
            const ws = this._ws;
            this._ws = null;

            ws.close(code);
            ws.removeAllListeners();
        }

        this.id = null;
        this._seq = null;
        this._heartbeatAcked = true;

        clearInterval(this._heartbeatTimer);
        this._heartbeatTimer = null;

        this._payloads = [];
        this._remainingPayloads = internals.ratelimit.total;

        clearInterval(this._ratelimitTimer);
        this._ratelimitTimer = null;
    }

    _reconnect() {

        if (!this._reconnection.attempts) {
            return this._disconnect();
        }

        const reconnection = this._reconnection;
        reconnection.attempts--;
        reconnection.wait += reconnection.delay;

        const timeout = Math.min(reconnection.wait, reconnection.maxDelay);

        this._reconnectionTimer = setTimeout(() => {

            this._connect();
        }, timeout);
    }

    _disconnect(callback) {

        this._reconnection = null;
        clearTimeout(this._reconnectionTimer);
        this._reconnectionTimer = null;

        if (!this._ws) {
            return callback();
        }

        if (callback) {
            this._disconnectCallback = callback;
        }


        this._ws.close();
    }

    _onMessage(message, callback) {

        // Parse message

        let payload;
        try {
            payload = JSON.parse(message);
        }
        catch (error) {
            return callback(new Error('Invalid JSON content'));
        }

        // Assign new sequence number

        if (payload.s) {
            this._seq = payload.s;
        }

        // Process opcodes

        // Hello

        if (payload.op === internals.opCodes.hello) {
            const heartbeatInterval = payload.d.heartbeat_interval;

            this._heartbeatTimer = setInterval(() => {

                this._beat();
            }, heartbeatInterval);

            return this._identify();
        }

        // Heartbeat

        if (payload.op === internals.opCodes.heartbeat) {
            return this._beat();
        }

        // Heartbeat acknowledge

        if (payload.op === internals.opCodes.heartbeatAck) {
            this._heartbeatAcked = true;
            return;
        }

        // Reconnection requested

        if (payload.op === internals.opCodes.reconnect) {
            this._cleanup(4000);                                            // Unknown

            return this._reconnect();
        }

        // Invalid session

        if (payload.op === internals.opCodes.invalidSession) {
            const resumable = payload.d;

            if (resumable) {
                return this._identify();
            }

            return this._disconnect();
        }

        // Dispatch

        if (payload.op === internals.opCodes.dispatch) {
            const event = payload.t;
            const eventName = internals.event(event);

            this.events.emit('dispatch', eventName, payload.d);             // Synchronous

            if (eventName === 'ready') {
                this.id = payload.d.session_id;
                callback();
            }
        }
    }

    _beat() {

        if (!this._heartbeatAcked) {
            this._cleanup(4000);

            return this._reconnect();
        }

        this._heartbeatAcked = false;
        this._send({ op: internals.opCodes.heartbeat, d: this._seq });
    }

    _identify() {

        const token = this.client._settings.token;

        // Resume if possible

        if (this.id) {
            return this._send({
                op: internals.opCodes.resume,
                d: {
                    token,
                    session_id: this.id,                    // eslint-disable-line camelcase
                    seq: this._seq,
                },
            });
        }

        // Identify new session

        this._send({
            op: internals.opCodes.identify,
            shards: this._shard,
            d: {
                token,
                properties: {
                    $os: process.platform,
                    $browser: 'nebula',
                    $device: 'nebula',
                },
            },
        });
    }

    _send(payload) {

        this._payloads.push(payload);

        if (!this._ratelimitTimer) {
            const setupTimer = () => {

                this._ratelimitTimer = setTimeout(() => {

                    this._remainingPayloads = internals.ratelimit.total;

                    clearTimeout(this._ratelimitTimer);
                    this._processPendingPayloads();

                    setupTimer();
                }, internals.ratelimit.timeout);
            };

            setupTimer();
        }

        this._processPendingPayloads();
    }

    _processPendingPayloads() {

        while (this._remainingPayloads) {
            const payload = this._payloads.shift();

            if (!payload) {
                return;
            }

            this._remainingPayloads--;
            this._ws.send(JSON.stringify(payload));
        }
    }
};

internals.event = function (name) {

    const lowercased = name.toLowerCase();

    return lowercased.replace(/[-_]([a-z])/g, ($0, $1) => {

        return $1.toUpperCase();
    });
};
