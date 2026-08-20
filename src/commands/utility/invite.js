const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config');
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, ActionRowBuilder, ButtonBuilder, createV2Payload } = require('../../ui/componentsV2');
const { COLORS, BUTTON_STYLES } = require('../../config/constants');

module.exports = {
  name: 'invite',
  description: 'Get the official bot invite link',
  aliases: ['addbot'],
  cooldown: 2,

  data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Get the official bot invite link'),

  async execute(context) {
    const inviteUrl = config.client.botInvite || `https://discord.com/oauth2/authorize?client_id=${context.client.user.id}&permissions=8&scope=bot%20applications.commands`;

    const container = new ContainerBuilder(COLORS.PRIMARY)
      .addComponents(
        new TextDisplayBuilder(`### Invite Kira to Your Server\nClick the button below to authorize Kira with slash command and voice permissions.`),
        new SeparatorBuilder(true, 1),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setUrl(inviteUrl)
            .setLabel('Invite Kira Bot')
            .setStyle(BUTTON_STYLES.LINK)
        )
      );

    return context.reply(createV2Payload(container));
  }
};
