
var Protos = require('../');

Protos.bootstrap(__dirname, {

  debugLog: false,

  server: {
    host: '0.0.0.0',
    port: 8080,
    useSSL: false,
    multiProcess: false,
    stayUp: 'production'
  },

  ssl: {
    port: 8443,
    key: '',
    cert: ''
  },

  environments: {
    default: 'development',
    development: function(app) { },
    production: function(app) { }
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