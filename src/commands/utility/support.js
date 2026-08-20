const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config');
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, createV2Payload } = require('../../ui/componentsV2');
const { COLORS, BUTTON_STYLES } = require('../../config/constants');

module.exports = {
  name: 'support',
  description: 'Get an invite to the official support server',
  aliases: ['community', 'server'],
  cooldown: 2,

  data: new SlashCommandBuilder()
    .setName('support')
    .setDescription('Get an invite to the official support server'),

  async execute(context) {
    const inviteUrl = config.client.supportInvite;

    const container = new ContainerBuilder(COLORS.PRIMARY)
      .addComponents(
        new TextDisplayBuilder(`### Kira Official Support Server\nJoin our community for assistance, bug reports, and audio feature updates.`),
        new SeparatorBuilder(true, 1),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setUrl(inviteUrl)
            .setLabel('Join Support Server')
            .setStyle(BUTTON_STYLES.LINK)
        )
      );

    return context.reply(createV2Payload(container));
  }
};
