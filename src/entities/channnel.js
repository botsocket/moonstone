'use strict';

module.exports = class {
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
};
