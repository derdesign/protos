
/**
  @module drivers
  @namespace driver
 */

var mysql = protos.requireDependency('mysql', 'MySQL Driver'),
    util = require('util');

/**
  MySQL Driver class
  
  @class MySQL
  @extends Driver
  @constructor
  @param {object} app Application instance
  @param {object} config Driver configuration
 */

function MySQL(app, config) {
  
  var self = this;
  
  config = config || {};
  config.host = config.host || 'localhost';
  config.port = config.port || 3306;
  
  this.className = this.constructor.name;
  this.app = app;
  
/**
    Driver configuration
  
      config: {
        host: 'localhost',
        port: 3306,
        user: 'db_user',
        password: 'db_password',
        database: 'db_name',
        debug: false,
        storage: 'redis'
      }
      
    @property config
    @type object
 */
  
  this.config = config;
  
  // Set client
  self.client = mysql.createClient(config);

  // Assign storage
  if (typeof config.storage == 'string') {
    self.storage = app._getResource('storages/' + config.storage);
  } else if (config.storage instanceof protos.lib.storage) {
    self.storage = config.storage;
  }
  
  // Set db
  self.db = config.database;
      
  // Only set important properties enumerable
  protos.util.onlySetEnumerable(this, ['className', 'db']);
  
}

util.inherits(MySQL, protos.lib.driver);

// Inherit sql_proto methods
for (var key in protos.lib.sql_proto) {
  MySQL.prototype[key] = protos.lib.sql_proto[key];
}

module.exports = MySQL;
