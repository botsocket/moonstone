'use strict';

const User = require('./entities/user');
const Channel = require('./entities/channel');
const Guild = require('./entities/guild');

module.exports = class {
    constructor(client) {

        this.client = client;

        // Shortcuts

        this.guilds = client.guilds;
        this.channels = client.channels;
        this.events = client.events;
    }

    ready(data) {

        this.client.user = User.generate(this.client, data);
        this.events.emit('ready');
    }

    channelCreate(data, guild) {

        if (this.channels.has(data.id)) {
            return;
        }

        const channel = Channel.generate(this.client, data, guild);
        this.channels.set(data.id, channel);

        if (channel.guild) {
            channel.guild.channels.set(data.id, channel);
        }

        if (!guild) {
            this.events.emit('channelCreate', channel);
        }

        return channel;
    }

    channelUpdate(data) {

        const channel = this.channels.get(data.id);
        channel._update(data);
        this.events.emit('channelUpdate', channel);
    }

    channelDelete(data) {

        const channel = this.channels.get(data.id);
        this.channels.delete(channel.id);

        if (channel.guild) {
            channel.guild.channels.delete(channel.id);
        }
    }

    guildCreate(data) {

        const guild = new Guild(this.client, data);
        this.guilds.set(guild.id, guild);

        for (const channel of data.channels) {
            this.channelCreate(channel, guild);
        }

        this.events.emit('guildCreate', guild);
    }
};
