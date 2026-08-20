const { createV2Payload } = require('../ui/componentsV2');
const uiTemplates = require('../ui/templates');

class CommandContext {
  constructor(source, options = {}) {
    this.source = source; // Interaction or Message
    this.isInteraction = typeof source.isChatInputCommand === 'function' ? source.isChatInputCommand() : Boolean(source.isCommand?.());
    this.isMessage = !this.isInteraction;

    this.client = source.client;
    this.guild = source.guild;
    this.guildId = source.guild?.id || null;
    this.channel = source.channel;
    this.user = source.author || source.user;
    this.userId = this.user?.id;
    this.member = source.member;
    this.options = options.args || {};
    this.deferred = false;
    this.replied = false;

    // Helper for voice channel of requester
    this.voiceChannel = this.member?.voice?.channel || null;
  }

  /**
   * Defer reply (ephemeral supported)
   */
  async deferReply(options = {}) {
    if (this.isInteraction) {
      if (!this.source.deferred && !this.source.replied) {
        await this.source.deferReply({ ephemeral: Boolean(options.ephemeral) });
        this.deferred = true;
      }
    } else {
      // In prefix/message mode, show loading indicator
      this.loadingMessage = await this.channel.send(uiTemplates.buildLoadingMessage('Processing request...'));
      this.deferred = true;
    }
  }

  /**
   * Standard reply
   */
  async reply(payload) {
    // If string passed, convert to clean Components V2 payload
    let normalized = payload;
    if (typeof payload === 'string') {
      normalized = uiTemplates.buildSuccessMessage(payload);
    }

    if (this.isInteraction) {
      if (this.deferred || this.source.deferred) {
        this.replied = true;
        return this.source.editReply(normalized);
      }
      this.replied = true;
      return this.source.reply(normalized);
    } else {
      if (this.loadingMessage && this.loadingMessage.deletable) {
        try {
          await this.loadingMessage.delete();
        } catch (e) {}
      }
      this.replied = true;
      return this.channel.send(normalized);
    }
  }

  /**
   * Edit existing reply
   */
  async editReply(payload) {
    let normalized = payload;
    if (typeof payload === 'string') {
      normalized = uiTemplates.buildSuccessMessage(payload);
    }

    if (this.isInteraction) {
      return this.source.editReply(normalized);
    } else {
      if (this.loadingMessage && this.loadingMessage.editable) {
        return this.loadingMessage.edit(normalized);
      }
      return this.channel.send(normalized);
    }
  }

  /**
   * Error reply helper
   */
  async replyError(message) {
    return this.reply(uiTemplates.buildErrorMessage(message));
  }

  /**
   * Success reply helper
   */
  async replySuccess(message) {
    return this.reply(uiTemplates.buildSuccessMessage(message));
  }

  /**
   * Get string or number argument
   */
  getString(name) {
    if (this.isInteraction) {
      return this.source.options.getString(name);
    }
    return this.options[name] !== undefined ? String(this.options[name]) : null;
  }

  getInteger(name) {
    if (this.isInteraction) {
      return this.source.options.getInteger(name);
    }
    const val = parseInt(this.options[name], 10);
    return isNaN(val) ? null : val;
  }

  getBoolean(name) {
    if (this.isInteraction) {
      return this.source.options.getBoolean(name);
    }
    if (this.options[name] === undefined) return null;
    return ['true', '1', 'yes', 'on'].includes(String(this.options[name]).toLowerCase());
  }

  getChannel(name) {
    if (this.isInteraction) {
      return this.source.options.getChannel(name);
    }
    const id = this.options[name]?.replace(/[<#>]/g, '');
    return this.guild?.channels?.cache?.get(id) || null;
  }

  getRole(name) {
    if (this.isInteraction) {
      return this.source.options.getRole(name);
    }
    const id = this.options[name]?.replace(/[<@&>]/g, '');
    return this.guild?.roles?.cache?.get(id) || null;
  }

  getUser(name) {
    if (this.isInteraction) {
      return this.source.options.getUser(name);
    }
    const id = this.options[name]?.replace(/[<@!>]/g, '');
    return this.client.users.cache.get(id) || null;
  }
}

module.exports = CommandContext;
