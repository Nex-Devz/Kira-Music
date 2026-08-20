const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../managers/MusicManager');

module.exports = {
  name: 'ping',
  description: 'Check Discord Gateway and Lavalink audio node latency',
  aliases: ['latency', 'pong'],
  cooldown: 2,

  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check Discord Gateway and Lavalink audio node latency'),

  async execute(context) {
    const wsPing = context.client.ws.ping;
    let nodePings = 'No nodes connected';

    if (musicManager.kumo?.nodes?.size) {
      const pings = [];
      for (const node of musicManager.kumo.nodes.values()) {
        pings.push(`${node.name}: ${node.stats?.ping || '0'}ms`);
      }
      nodePings = pings.join(', ');
    }

    return context.replySuccess(`• **Gateway Latency:** \`${wsPing}ms\`\n• **Lavalink Nodes:** \`${nodePings}\``);
  }
};
