require('dotenv').config();
const { PREMIUM_TIERS, DEFAULT_CONFIG } = require('./constants');

module.exports = {
  client: {
    token: process.env.DISCORD_TOKEN || '',
    clientId: process.env.CLIENT_ID || '',
    owners: (process.env.OWNER_IDS || '').split(',').map(s => s.trim()).filter(Boolean),
    developers: (process.env.DEV_IDS || '').split(',').map(s => s.trim()).filter(Boolean),
    supportGuildId: process.env.SUPPORT_GUILD_ID || '',
    supportInvite: process.env.SUPPORT_INVITE_URL || 'https://discord.gg/example',
    botInvite: process.env.BOT_INVITE_URL || '',
    defaultPrefix: process.env.DEFAULT_PREFIX || DEFAULT_CONFIG.PREFIX,
    environment: process.env.NODE_ENV || 'production'
  },

  lavalink: {
    nodes: [
      {
        name: process.env.LAVALINK_NAME || 'primary-node',
        host: process.env.LAVALINK_HOST || '127.0.0.1',
        port: parseInt(process.env.LAVALINK_PORT, 10) || 2333,
        password: process.env.LAVALINK_PASSWORD || 'youshallnotpass',
        secure: process.env.LAVALINK_SECURE === 'true'
      }
    ],
    defaultSearchEngine: process.env.SEARCH_ENGINE || 'ytsearch', // ytsearch, ytmsearch, scsearch, spsearch
    reconnectInterval: 5000,
    maxReconnectTries: 10
  },

  database: {
    path: process.env.DATABASE_PATH || './data/kira.db'
  },

  premium: {
    tiers: PREMIUM_TIERS
  },

  defaults: DEFAULT_CONFIG
};
