const fs = require('fs');
const path = require('path');
const { Collection, REST, Routes } = require('discord.js');
const CommandContext = require('./CommandContext');
const middlewarePipeline = require('../middleware/pipeline');
const errorHandler = require('./ErrorHandler');
const guildRepo = require('../database/repositories/GuildRepository');
const premiumManager = require('../managers/PremiumManager');
const config = require('../config');

class CommandHandler {
  constructor() {
    this.commands = new Collection();
    this.aliases = new Collection();
    this.slashCommandData = [];
  }

  /**
   * Load all commands recursively from src/commands
   */
  loadCommands(commandsDir = path.join(__dirname, '../commands')) {
    this.commands.clear();
    this.aliases.clear();
    this.slashCommandData = [];

    const loadDir = (dir) => {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
          loadDir(fullPath);
        } else if (file.name.endsWith('.js')) {
          try {
            delete require.cache[require.resolve(fullPath)];
            const command = require(fullPath);
            if (command.name && typeof command.execute === 'function') {
              this.commands.set(command.name.toLowerCase(), command);

              // Register aliases
              if (Array.isArray(command.aliases)) {
                command.aliases.forEach(alias => {
                  this.aliases.set(alias.toLowerCase(), command.name.toLowerCase());
                });
              }

              // Register Slash command data if present
              if (command.data) {
                this.slashCommandData.push(
                  typeof command.data.toJSON === 'function' ? command.data.toJSON() : command.data
                );
              }

              console.log(`[CommandHandler] Loaded command: ${command.name}`);
            }
          } catch (err) {
            console.error(`[CommandHandler] Failed to load command at "${fullPath}":`, err);
          }
        }
      }
    };

    loadDir(commandsDir);
    console.log(`[CommandHandler] Successfully loaded ${this.commands.size} commands.`);
  }

  /**
   * Deploy Slash commands to Discord
   */
  async registerSlashCommands(client) {
    if (!config.client.token || !client.user?.id) return;

    const rest = new REST({ version: '10' }).setToken(config.client.token);
    try {
      console.log(`[CommandHandler] Registering ${this.slashCommandData.length} application (/) commands...`);
      await rest.put(
        Routes.applicationCommands(client.user.id),
        { body: this.slashCommandData }
      );
      console.log('[CommandHandler] Successfully registered application (/) commands globally.');
    } catch (err) {
      console.error('[CommandHandler] Failed to register slash commands:', err);
    }
  }

  /**
   * Handle Slash command interaction
   */
  async handleInteraction(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const commandName = interaction.commandName.toLowerCase();
    const command = this.commands.get(commandName);

    if (!command) {
      return interaction.reply({ content: 'Command not found.', ephemeral: true });
    }

    const context = new CommandContext(interaction);

    try {
      // Run middleware pipeline
      const check = await middlewarePipeline.execute(command, context);
      if (!check.allowed) {
        return context.replyError(check.reason);
      }

      await command.execute(context);
    } catch (err) {
      await errorHandler.handleCommandError(err, context, command.name);
    }
  }

  /**
   * Handle Message command (Prefix or Premium No-Prefix)
   */
  async handleMessage(message) {
    if (message.author.bot || !message.guild) return;

    const content = message.content.trim();
    if (!content) return;

    const guildData = guildRepo.get(message.guild.id);
    const prefix = guildData?.prefix || config.defaults.PREFIX;

    let commandName = null;
    let rawArgs = [];
    let isNoPrefix = false;

    // 1. Check Configured Prefix
    if (content.startsWith(prefix)) {
      const parts = content.slice(prefix.length).trim().split(/ +/);
      commandName = parts[0]?.toLowerCase();
      rawArgs = parts.slice(1);
    } else {
      // 2. Check Premium No-Prefix Entitlement
      const hasNoPrefix = premiumManager.hasNoPrefix(message.author.id, message.guild.id);
      if (hasNoPrefix) {
        const parts = content.split(/ +/);
        const possibleCmd = parts[0]?.toLowerCase();
        // Strict check: only if first word matches a valid command name or alias
        if (this.commands.has(possibleCmd) || this.aliases.has(possibleCmd)) {
          commandName = possibleCmd;
          rawArgs = parts.slice(1);
          isNoPrefix = true;
        }
      }
    }

    if (!commandName) return;

    // Resolve aliases
    if (this.aliases.has(commandName)) {
      commandName = this.aliases.get(commandName);
    }

    const command = this.commands.get(commandName);
    if (!command) return;

    // Convert raw array args to options map
    const argsMap = {};
    if (command.argNames && Array.isArray(command.argNames)) {
      command.argNames.forEach((argName, idx) => {
        if (idx === command.argNames.length - 1) {
          argsMap[argName] = rawArgs.slice(idx).join(' ');
        } else {
          argsMap[argName] = rawArgs[idx];
        }
      });
    } else {
      argsMap.query = rawArgs.join(' ');
      argsMap.input = rawArgs.join(' ');
    }

    const context = new CommandContext(message, { args: argsMap });

    try {
      const check = await middlewarePipeline.execute(command, context);
      if (!check.allowed) {
        return context.replyError(check.reason);
      }

      await command.execute(context);
    } catch (err) {
      await errorHandler.handleCommandError(err, context, command.name);
    }
  }
}

module.exports = new CommandHandler();
