const { Client, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const commandHandler = require('./handlers/CommandHandler');
const dbManager = require('./database');
const musicManager = require('./managers/MusicManager');

// Create Discord Client with necessary gateway intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember]
});

// Load all command modules
commandHandler.loadCommands(path.join(__dirname, 'commands'));

// Load all Discord event listeners
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(client, ...args));
  } else {
    client.on(event.name, (...args) => event.execute(client, ...args));
  }
}

// Global Process Exception Handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process] Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught Exception:', err);
});

// Graceful Shutdown
const shutdown = async () => {
  console.log('[Kira] Shutting down gracefully...');
  try {
    if (musicManager.kumo) {
      musicManager.kumo.destroy();
    }
    dbManager.close();
    await client.destroy();
  } catch (e) {}
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start bot if token exists
if (config.client.token) {
  client.login(config.client.token).catch((err) => {
    console.error('[Kira] Failed to login to Discord:', err.message);
  });
} else {
  console.warn('[Kira] No DISCORD_TOKEN provided in environment. Please set DISCORD_TOKEN in .env to connect.');
}

module.exports = { client, commandHandler, musicManager, dbManager };
