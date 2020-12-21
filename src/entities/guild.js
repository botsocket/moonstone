'use strict';

const Bone = require('@botsocket/bone');

const Utils = require('../utils');
const BitField = require('../bitfield');

const internals = {
    verificationLevel: {        // https://discord.com/developers/docs/resources/guild#guild-object-verification-level
        0: 'NONE',
        1: 'LOW',
        2: 'MEDIUM',
        3: 'HIGH',
        4: 'VERY_HIGH',
    },

    notificationLevel: {        // https://discord.com/developers/docs/resources/guild#guild-object-default-message-notification-level
        0: 'ALL_MESSAGES',
        1: 'ONLY_MENTIONS',
    },

    contentFilterLevel: {       // https://discord.com/developers/docs/resources/guild#guild-object-explicit-content-filter-level
        0: 'DISABLED',
        1: 'MEMBERS_WITHOUT_ROLES',
        2: 'ALL_MEMBERS',
    },

    systemChannelFlags: {       // https://discord.com/developers/docs/resources/guild#guild-object-system-channel-flags
        SUPPRESS_JOIN_NOTIFICATIONS: 1 << 0,
        SUPPRESS_PREMIUM_SUBSCRIPTIONS: 1 << 1,
    },

    premiumTiers: {             // https://discord.com/developers/docs/resources/guild#guild-object-premium-tier
        0: 'NONE',
        1: 'TIER_1',
        2: 'TIER_2',
        3: 'TIER_3',
    },
};

module.exports = internals.Guild = class {
    constructor(client, data) {

        this.client = client;

        this.id = data.id;
        this.createdAt = Utils.idToDate(data.id);
        this.joinedAt = new Date(data.joined_at);
        this.large = Boolean(data.large);
        this.voiceStates = new Map();
        this.channels = new Map();
        this.roles = new Map();
        this.members = new Map();
        this._presences = new Map();

        this._update(data);
    }

    _update(data) {

        this.name = data.name;
        this.icon = data.icon;
        this.splash = data.splash;
        this.discoverySplash = data.discoverySplash;
        this.region = data.region;
        this.ownerId = data.owner_id;
        this.afkChannelId = data.afk_channel_id;
        this.afkTimeout = data.afk_timeout;
        this.widgetEnabled = Boolean(data.widget_enabled);
        this.widgetChannelId = data.widget_channel_id;
        this.verificationLevel = internals.verificationLevel[data.verificationLevel];
        this.notificationLevel = internals.notificationLevel[data.default_message_notifications];
        this.explicitContentFilterLevel = internals.contentFilterLevel[data.explicit_content_filter];
        this.features = data.features;
        this.mfaLevel = data.mfa_level;
        this.applicationId = data.application_id;
        this.systemChannelId = data.system_channel_id;
        this.systemChannelFlags = BitField.decode(data.system_channel_flags, internals.systemChannelFlags);
        this.rulesChanneId = data.rules_channel_id;
        this.maxPresences = data.max_presences || 25000;
        this.maxMembers = data.max_members || null;
        this.vanityUrlCode = data.vanity_url_code;
        this.description = data.description;
        this.banner = data.banner;
        this.premiumTier = internals.premiumTiers[data.premium_tier];
        this.boosts = data.premium_subscription_count || 0;
        this.preferredLocale = data.preferred_locale;
        this.publicUpdatesChannelId = data.public_updates_channel_id;
        this.maxVideoChannelUsers = data.max_video_channel_users || null;

        // Lazy loaded

        this._owner = null;
        this._afkChannel = null;
        this._widgetChannel = null;
        this._systemChannel = null;
        this._rulesChannel = null;
        this._publicUpdatesChannel = null;
    }

    async fetchOwner() {

        if (this._owner) {
            return this._owner;
        }

        const response = await this.client.api.get((params) => `/guilds/${params.guild}/members/${params.member}`, {
            guild: this.id,
            member: this._ownerId,
        });

        const user = response.payload;
        this._owner = user;
        return user;
    }

    leave() {

        Bone.assert(this.id !== this.client.user.id, 'Cannot leave the server that you own');

        return this.client.api.delete('/@me/guilds');
    }
};

internals.setup = function () {

    for (const type of ['afk', 'widget', 'system', 'rules', 'publicUpdates']) {
        const cacheKey = `_${type}Channel`;
        const idKey = `${type}ChannelId`;

        Object.defineProperty(internals.Guild.prototype, type, {
            get() {

                if (!this[idKey]) {
                    return null;
                }

                if (this[cacheKey]) {
                    return this[cacheKey];
                }

                const channel = this.channels.get(this[idKey]);
                this[cacheKey] = channel;
                return channel;
            },
        });
    }
};

internals.setup();
