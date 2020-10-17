'use strict';

const Bone = require('@botsocket/bone');

const internals = {};

module.exports = class {
    constructor(client, data) {

        this.client = client;

        this.id = data.id;
        this.channels = new Map();
        this.roles = new Map();
        this.members = new Map();
        this.emojis = new Map();

        this._update(data);
    }

    _getChannel(id) {

        if (!id) {
            return null;
        }

        return this.channels.get(id);
    }

    _upsertChannel(data) {

        const existingChannel = this.channels.get(data.id);
        if (existingChannel) {
            existingChannel._update(data);
            return existingChannel;
        }

        const channel = new internals.Channel(this, data);
        this.channels.set(channel.id, channel);
        return channel;
    }

    _update(data) {

        // Update channels

        if (data.channels) {
            for (const rawChannel of data.channels) {
                const channel = new internals.Channel(this, rawChannel);
                this.channels.set(channel.id, channel);
            }
        }

        // Update roles

        if (data.roles) {
            for (const rawRole of data.roles) {
                const role = new internals.Role(this, rawRole);
                this.roles.set(role.id, role);
            }
        }

        // Update members

        if (data.members) {
            for (const rawMember of data.members) {
                const member = new internals.Member(this, rawMember);
                this.members.set(member.id, member);
            }
        }

        // Update emojis

        if (data.emojis) {
            for (const rawEmoji of data.emojis) {
                const emoji = new internals.Emoji(this, rawEmoji);
                this.members.set(emoji.id, emoji);
            }
        }

        // Populate data

        this.name = data.name;
        this.icon = data.icon;
        this.splash = data.splash;
        this.discoverySplash = data.discoverySplash;
        this.ownerId = data.ownerId;
        this.region = data.region;
        this.afkChannel = this._getChannel(data.afk_channel_id);
        this.afkTimeout = data.afk_timeout;
        this.widgetEnabled = Boolean(data.widget_enabled);
        this.widgetChannel = this._getChannel(data.widget_channel_id);
        this.verificationLevel = data.verificationLevel;
        this.defaultMessageNotifications = data.default_message_notification;
        this.explicitContentFilter = data.explicit_content_filter;
        this.features = data.features;
        this.mfaLevel = data.mfa_level;
        this.applicationId = data.application_id;
        this.systemChannel = this._getChannel(data.system_channel_id);
        this.systemChannelFlags = data.systemChannelFlags;
        this.rulesChannel = this._getChannel(data.rules_channel_id);
        this.joinedAt = data.joined_at || null;
        this.large = Boolean(data.large);
        this.unavailable = Boolean(data.unavailable);
        this.presences = data.presences || [];
        this.maxPresences = data.max_presences || 25000;
        this.maxMembers = data.max_members || null;
        this.vanityUrlCode = data.vanity_url_code;
        this.description = data.description;
        this.banner = data.banner;
        this.premiumTier = data.premium_tier;
        this.boosts = data.premium_subscription_count || null;
        this.preferredLocale = data.preferred_locale;
        this.publicUpdatesChannel = this._getChannel(data.public_updates_channel_id);
        this.maxVideoChannelUsers = data.max_video_channel_users || null;
    }

    leave() {

        Bone.assert(!this.unavailable, 'Server is unavailable');
        Bone.assert(this.id !== this.client.user.id, 'Cannot leave the server that you own');

        return this.client._bornite.delete('/@me/guilds');
    }
};

internals.Role = class {
    constructor(guild, data) {

        this.guild = guild;
        this.client = guild.client;

        this.id = data.id;
    }
};

internals.Channel = class {
    constructor(guild, data) {

        this.guild = guild;
        this.client = guild.client;

        this.id = data.id;
        this.type = data.type;
        this.position = data.position || null;
        this.permissionOverrides = data.permission_overrides || [];
        this.name = data.name || null;
        this.topic = data.topic || null;
        this.nsfw = Boolean(data.nsfw);
        this.lastMessageId = data.last_message_id || null;
        this.bitrate = data.bitrate || null;
        this.userLimit = data.user_limit || null;
        this.rateLimitPerUser = data.rate_limit_per_user || null;
        this.recipients = data.recipients || [];
        this.icon = data.icon || null;
        this.ownerId = data.owner_id || null;
        this.applicationId = data.application_id || null;
        this.parentId = data.parent_id || null;
        this.lastPinTimestamp = data.last_pin_timestamp || null;
    }

    _update() { }
};

internals.Member = class {
    constructor(guild, data) {

        this.guild = guild;
        this.client = guild.client;

        this.id = data.id;
    }
};

internals.Emoji = class {

};
