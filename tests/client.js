'use strict';

const Nock = require('nock');

const Nebula = require('../src');
const Utils = require('./utils');

const internals = {
    rest: Nock('https://discord.com/api/v6'),
};

describe('client()', () => {

    afterEach(() => {

        Nock.cleanAll();
    });

    describe('constructor()', () => {

        it('should throw on incorrect parameters', () => {

            expect(() => Nebula.client()).toThrow('Options for client is invalid: token is required');
            expect(() => Nebula.client({ token: 'x', debug: 'x' })).toThrow('Options for client is invalid: debug must be a boolean');
            expect(() => Nebula.client({ token: 'x', timeout: 'x' })).toThrow('Options for client is invalid: timeout must be a number');
            expect(() => Nebula.client({ token: 'x', reconnect: true })).not.toThrow();
            expect(() => Nebula.client({ token: 'x', reconnect: false })).not.toThrow();
            expect(() => Nebula.client({ token: 'x', reconnect: 'x' })).toThrow('Options for client is invalid: reconnect must be a boolean or an object');
            expect(() => Nebula.client({ token: 'x', reconnect: { delay: 'x' } })).toThrow('Options for client is invalid: reconnect.delay must be a number');
            expect(() => Nebula.client({ token: 'x', reconnect: { maxDelay: 'x' } })).toThrow('Options for client is invalid: reconnect.maxDelay must be a number');
            expect(() => Nebula.client({ token: 'x', reconnect: { attempts: 'x' } })).toThrow('Options for client is invalid: reconnect.attempts must be a number');
            expect(() => Nebula.client({ token: 'x', reconnect: { attempts: Infinity } })).not.toThrow();
            expect(() => Nebula.client({ token: 'x', reconnect: { attempts: false } })).not.toThrow();
            expect(() => Nebula.client({ token: 'x', gateway: {} })).toThrow('Options for client is invalid: gateway.url is required');
            expect(() => Nebula.client({ token: 'x', gateway: { url: 1 } })).toThrow('Options for client is invalid: gateway.url must be a string');
            expect(() => Nebula.client({ token: 'x', gateway: { url: 'x' } })).toThrow('Options for client is invalid: gateway.shard is required');
            expect(() => Nebula.client({ token: 'x', gateway: { url: 'x', shard: ['x'] } })).toThrow('Options for client is invalid: gateway.shard.0 must be a number');
            expect(() => Nebula.client({ token: 'x', gateway: { url: 'x', shard: [0] } })).toThrow('Options for client is invalid: gateway.shard does not have 1 required value');
            expect(() => Nebula.client({ token: 'x', gateway: { url: 'x', shard: [0, 1] } })).not.toThrow();
        });
    });

    describe('start()', () => {

        it('should connect to Discord', async () => {

            internals.rest.get('/gateway').reply(200, { url: Utils.config.gatewayUrl });
            const cleanup = Utils.gateway();

            const client = Nebula.client({ token: Utils.config.token });
            await client.start();

            expect(client.gateway.id).toBe(Utils.config.sessionId);
            expect(client.user.id).toBe(Utils.config.userId);

            cleanup();
        });

        it('should reject on incorrect tokens', async () => {

            internals.rest.get('/gateway').reply(200, { url: Utils.config.gatewayUrl });
            const cleanup = Utils.gateway();

            const client = Nebula.client({ token: 'Wrong token' });
            await expect(client.start()).rejects.toThrow('Invalid token');

            cleanup();
        });

        it('should reject when /gateway returns HTTP code different from 200', async () => {

            internals.rest.get('/gateway').reply(404);

            const client = Nebula.client({ token: Utils.config.token });
            await expect(client.start()).rejects.toThrow('Server responded with status code 404');
        });

        it('should be able to stop and start the client again', async () => {

            const rest = internals.rest.get('/gateway').reply(200, { url: Utils.config.gatewayUrl }).persist();
            const cleanup = Utils.gateway();

            const client = Nebula.client({ token: Utils.config.token });
            await client.start();
            client.stop();
            await client.start();
            expect(client.gateway.id).toBe(Utils.config.sessionId);
            expect(client.user.id).toBe(Utils.config.userId);

            rest.persist(false);
            cleanup();
        });
    });
});


