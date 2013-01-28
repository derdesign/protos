
function pre_init(app) {
  app.hooks.pre_init.__loaded = true;
}

module.exports = pre_init;