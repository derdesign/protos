
/* Logger » MongoDB Transport */

var app = protos.app;

try {
  var mongodb = require('mongodb');
} catch(e) {
  app.debug('Logger middleware: mongodb is required for mongo-transport');
  return;
}

var Db = mongodb.Db,
    Server = mongodb.Server,
    ObjectID = mongodb.ObjectID,
    Collection = mongodb.Collection;

function MongoTransport(evt, config, level, noAttach) {
  
  var self = this;
  
  this.className = this.constructor.name;
  
  if (typeof config == 'boolean') {
    if (config) config = {};
    else return;
  } else if (config.constructor !== Object) {
    return;
  }
  
  // Transport configuration
  config = protos.extend({
    host: 'localhost',
    port: 27017,
    database: 'test',
    collection: evt,
    logSize: 10*1024*1024,
    logLimit: null
  }, config);
  
  // Set config
  this.config = config;
  
  // Log messages queue: handle logs while acquiring collection instance
  var queue = [];

  // Set ready state
  var ready = false;
  
  // Queues logs before client is ready
  var preCallback = function() { // log, data, native
    if (self.collection) postCallback.apply(null, arguments);
    else queue.push(arguments);
  }
  
  // Runs after client is ready
  var postCallback = function() { // log, data, native
    self.pushLog.apply(self, arguments);
  }
  
  // Set write method
  this.write = function() { // log, data, native
    ready ? postCallback.apply(null, arguments) : preCallback.apply(null, arguments);
  }
  
  initMongo.call(this, config, function() {
    
    // Set ready
    ready = true;

    // Flush log queue
    queue.forEach(function(args) {
      postCallback.apply(null, args);
    });
    
    queue = [];
    
  });
  
  if (!noAttach) app.on(evt, this.write);
  
}

/**
  Write interface
  
  @param {string} log
  @public
 */
 
MongoTransport.prototype.write = function(log) {
  // Interface
}

/**
  Pushes a log into MongoDB
  
  @param {string} log
  @param {array} log data
  @param {object} native data
  @private
 */

MongoTransport.prototype.pushLog = function(log, data, native) {
  if (native && typeof native == 'object') log = native;
  this.collection.insert({log: log}, logHandler);
}

/**
  Cached handler for mongodb log events
  
  @param {Error} err
  @private
 */

function logHandler(err) {
  if (err) app.log(err);
}

/**
  Initializes the MongoDB Client & Collection
  
  @param {object} config
  @param {function} callback
  @private
 */

function initMongo(config, callback) {
  
  var self = this;
  
  // Set db
  self.db = new Db(config.database, new Server(config.host, config.port, {}));
  
  // Get client
  self.db.open(function(err, client) {
    if (err) throw err;
    else {
      self.client = client;
      client.collectionNames(function(err, names) {
        if (err) throw err;
        else {
          var name = config.database + '.' + config.collection;
          var exists = names.filter(function(col) {
            if (col.name == name) return col; 
          });
          
          // Collection options
          var opts = {capped: true, size: config.logSize};
          if (config.logLimit != null) opts.max = config.logLimit;
          
          if (exists.length === 0) {
            client.createCollection(config.collection, opts, function(err, collection) {
              if (err) throw err;
              else {
                self.collection = collection;
                callback.call(self);
              }
            });
          } else {
            // Get collection
            client.collection(config.collection, function(err, collection) {
              if (err) throw err;
              else {
                self.collection = collection;
                // Get collection options » Check if collection has already been capped
                collection.options(function(err, options) {
                  if (err) {
                    throw err;
                  } else {
                    // Check if collection's options match log requirements
                    var ready = (options.capped === true && options.size === opts.size);
                    if ('max' in opts) ready = (ready && options.max === opts.max);
                    if (!ready) {
                      // Convert collection to capped if it's not match log requirements
                      var cmd = {"convertToCapped": config.collection, size: opts.size};
                      if ('max' in opts) cmd.max = opts.max;
                      client.command(cmd, function(err) {
                        if (err) throw err;
                        else {
                          callback.call(self);
                        }
                      });
                    } else {
                      callback.call(self);
                    }
                  }
                });
              }
            });
          }
        }
      });
    }
  });
}

module.exports = MongoTransport;