'use strict';

const Channel = require('./channel');

module.exports = class {
    constructor(client, data) {

        this.client = client;

        this.id = data.id;
        this.name = data.name;
        this.icon = data.icon;
        this.splash = data.splash;
        this.discoverySplash = data.discoverySplash;
        this.ownerId = data.ownerId;
        this.permissions = data.permissions;
        this.region = data.region;
        this.afkChannelId = data.afk_channel_id;
        this.afkTimeout = data.afk_timeout;
        this.widgetEnabled = Boolean(data.widget_enabled);
        this.widgetChannelId = data.widget_channel_id || null;
        this.verificationLevel = data.verificationLevel;
        this.defaultMessageNotifications = data.default_message_notification;
        this.explicitContentFilter = data.explicit_content_filter;
        this.roles = data.roles;
        this.emojis = data.emojis;
        this.features = data.features;
        this.mfaLevel = data.mfa_level;
        this.applicationId = data.application_id;
        this.systemChannelId = data.systemChannelId;
        this.systemChannelFlags = data.systemChannelFlags;
        this.rulesChannelId = data.rules_channel_id;
        this.joinedAt = data.joined_at || null;
        this.large = Boolean(data.large);
        this.unavailable = Boolean(data.unavailable);
        this.memberCount = data.member_count || null;
        this.members = data.members || [];
        this.channels = this._channels(data.channels);
        this.presences = data.presences || [];
        this.maxPresences = data.max_presences || 25000;
        this.maxMembers = data.max_members || null;
        this.vanityUrlCode = data.vanity_url_code;
        this.description = data.description;
        this.banner = data.banner;
        this.premiumTier = data.premium_tier;
        this.boosts = data.premium_subscription_count || null;
        this.preferredLocale = data.preferred_locale;
        this.publicUpdatesChannelId = data.public_updates_channel_id;
        this.maxVideoChannelUsers = data.max_video_channel_users || null;
    }

    _channels(channels) {

        if (!channels) {
            return new Map();
        }

        const map = new Map();
        for (const rawChannel of channels) {
            const channel = new Channel(this, rawChannel);
            map.set(channel.id, channel);
        }

        return map;
    }
};
