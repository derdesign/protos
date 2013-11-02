
module.exports = require('protos').bootstrap(__dirname, {

  debugLog: false,

  server: {
    host: 'localhost',
    port: 8080,
    multiProcess: false,
    stayUp: true
  },

  environments: {
    default: 'development'
  },
  
  events: {
    components: function(protos) {
      protos.loadDrivers();
      protos.loadStorages();
      protos.loadEngines('handlebars');
    },
    middleware: function(app) {
      app.use('logger');
    }
  }

}).app;