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

    const nodes = musicManager.kumo?.nodes?.getAll ? musicManager.kumo.nodes.getAll() : (musicManager.kumo?.nodes?.values ? [...musicManager.kumo.nodes.values()] : []);

    if (nodes && nodes.length > 0) {
      const pings = [];
      for (const node of nodes) {
        const pingVal = node.stats?.ping ?? node.ping ?? '0';
        pings.push(`${node.name || 'Node'}: ${pingVal}ms`);
      }
      nodePings = pings.join(', ');
    }

    return context.replySuccess(`• **Gateway Latency:** \`${wsPing}ms\`\n• **Lavalink Nodes:** \`${nodePings}\``);
  }
};
