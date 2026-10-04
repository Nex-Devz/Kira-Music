const { gray, green, cyan, yellow, red } = require('colorette');

function timestamp() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return gray(`[${h}:${m}:${s}]`);
}

const logger = {
  raw(msg) {
    console.log(msg);
  },

  ready(msg) {
    console.log(`${timestamp()} ${gray('•')} ${green('✔ RDY')} ${gray('»')} ${msg}`);
  },

  log(msg) {
    console.log(`${timestamp()} ${gray('•')} ${cyan('ℹ LOG')} ${gray('»')} ${msg}`);
  },

  cmd(msg) {
    console.log(`${timestamp()} ${gray('•')} ${yellow('⚙ CMD')} ${gray('»')} ${msg}`);
  },

  warn(msg) {
    console.log(`${timestamp()} ${gray('•')} ${yellow('⚠ WRN')} ${gray('»')} ${msg}`);
  },

  error(msg, err = '') {
    const errText = err ? (err.stack || err.message || String(err)) : '';
    console.error(`${timestamp()} ${gray('•')} ${red('✖ ERR')} ${gray('»')} ${msg}`, errText);
  }
};

module.exports = logger;
