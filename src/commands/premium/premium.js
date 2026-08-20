const { SlashCommandBuilder } = require('discord.js');
const premiumManager = require('../../managers/PremiumManager');
const uiTemplates = require('../../ui/templates');

module.exports = {
  name: 'premium',
  description: 'View active Premium tier, unlocked perks, and plan details',
  aliases: ['perks', 'tier', 'donor'],
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName('premium')
    .setDescription('View active Premium tier, unlocked perks, and plan details'),

  async execute(context) {
    const tier = premiumManager.getTier(context.userId, context.guildId);
    const userEntitlement = premiumManager.getEntitlement(context.userId);
    const guildEntitlement = premiumManager.getEntitlement(context.guildId);

    const payload = uiTemplates.buildPremiumDashboard(tier, userEntitlement, guildEntitlement);
    return context.reply(payload);
  }
};
