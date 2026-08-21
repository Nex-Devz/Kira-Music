const permissionManager = require('../../managers/PermissionManager');
const uiTemplates = require('../../ui/templates');

class HelpSelectHandler {
  async handle(interaction, selectedValue) {
    const isDev = permissionManager.isDeveloper(interaction.user.id);
    await interaction.update(uiTemplates.buildHelpMenu(selectedValue, isDev));
  }

  async handleButton(interaction, action, param1) {
    const isDev = permissionManager.isDeveloper(interaction.user.id);
    const targetCat = action === 'cat' ? (param1 || 'home') : (action || 'home');
    await interaction.update(uiTemplates.buildHelpMenu(targetCat, isDev));
  }
}

module.exports = new HelpSelectHandler();
