'use strict';

const Events = require('events');

const Ws = require('ws');

module.exports = class {
    constructor(client, shard) {

        this.client = client;
        this.events = new Events.EventEmitter();

        this._ws = null;

        // Config

        this._url = shard.url + '/?v=6&encoding=json';
        this._shardId = shard.shardId;
        this._totalShards = shard.totalShards;
        this._timeout = shard.timeout;

        this.id = null;
    }

    _start(callback) {

        const ws = new Ws(this._url);
        this._ws = ws;

        const timeoutHandler = function () {

            this._cleanup();
            callback(new Error('Connection timed out'));
        };

        const timeout = this._timeout ? setTimeout(timeoutHandler, this._timeout) : null;

        const onOpen = () => {

            clearTimeout(timeout);
            ws.removeListener('open', onOpen);

            this.events.emit('open');
        };

        const onMessage = (message) => {

            this._onMessage(message);
        };

        ws.once('open', onOpen);
        ws.on('message', onMessage);
    }

    _send(data) {

        this._ws.send(JSON.stringify(data));
    }

    _cleanup() {

        const ws = this._ws;
        this._ws = null;

        ws.close();
    }

    _onMessage(message) {

        let data;
        try {
            data = JSON.parse(message.d);
        }
        catch (error) {
            this.events.emit('error', new Error('Invalid JSON content'));
            return;
        }


    }
};

