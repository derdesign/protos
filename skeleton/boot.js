
var Protos = require('../');

Protos.bootstrap(__dirname, {
  
  // Application configuration
  debugLog: false,
  
  // Server configuration
  server: {
    host: 'localhost',
    port: 8080,
    multiProcess: false,
    stayUp: 'production'
  },
  
  // Application environments
  environments: {
    default: 'development',
    development: function(app) { 
      // Development environment code
    }
  },
  
  // Application events
  events: {
    components: function(protos) {
      // Load framework components
      protos.loadDrivers();
      protos.loadStorages();
      protos.loadEngines('ejs');
    },
    pre_init: function(app) {
      // Pre-initialization code
    },
    init: function(app) {
      // Load middleware
      app.use('logger');
    }
  }
  
});

module.exports = protos.app;