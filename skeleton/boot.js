
var Protos = require('protos');

Protos.bootstrap(__dirname, {

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
      protos.loadEngines('ejs');
    },
    init: function(app) {
      app.use('logger');
    }
  }

});

module.exports = protos.app;

