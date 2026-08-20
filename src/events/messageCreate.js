const commandHandler = require('../handlers/CommandHandler');

module.exports = {
  name: 'messageCreate',
  once: false,
  async execute(client, message) {
    await commandHandler.handleMessage(message);
  }
};
