module.exports = {
  name: 'error',
  once: false,
  execute(client, error) {
    console.error('[DiscordClient] Unhandled client error:', error?.message || error);
  }
};
