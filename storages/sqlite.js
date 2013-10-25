
/* storages/sqlite.js */

var app = protos.app;
var _ = require('underscore'),
    fs = require('fs'),
    sqlite3 = protos.requireDependency('sqlite3', 'SQLite Storage', 'sqlite'),
    util = require('util'),
    slice = Array.prototype.slice,
    Multi = protos.require('multi'),
    EventEmitter = require('events').EventEmitter;

/**
  SQLite Storage class
  
  @class SQLiteStorage
  @extends Storage
  @constructor
  @param {object} app Application instance
  @param {object} config Storage configuration
 */
    
function SQLiteStorage(config) {
  
  /*jshint bitwise: false */
  
  var self = this;
  
  this.events = new EventEmitter();
  
  app.debug(util.format('Initializing SQLite Storage on %s', config.filename));
  
  config = config || {};
  config.table = config.table || "storage";
  config.mode = config.mode || (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);
  
  if (!config.filename) {
    
    // Exit if no filename provided
    throw new Error("No filename provided for SQLite Storage");
    
  } else if (config.filename != ":memory:" && !fs.existsSync(config.filename)) {
    
    // Create file if it doesn't exist
    fs.writeFileSync(config.filename, '', 'binary');

  }
  
  this.className = this.constructor.name;
  
  this.config = config;
  
  // Set client
  this.client = new sqlite3.Database(config.filename, config.mode);

  // Set db
  this.db = config.filename;
  
  // Create table if not exists
  
  app.addReadyTask();
  
  this.client.run(util.format(
    "CREATE TABLE IF NOT EXISTS %s (key VARCHAR(255) UNIQUE PRIMARY KEY NOT NULL, value TEXT)", config.table),
    function(err) {
      if (err) {
        throw err;
      } else {
        app.flushReadyTask();
        self.events.emit('init', self.client, self.db);
        self.initialized = true;
      }
    });

  // Only set important properties enumerable
  protos.util.onlySetEnumerable(this, ['className', 'db']);
  
}

util.inherits(SQLiteStorage, protos.lib.storage);

SQLiteStorage.prototype.initialized = false;

/* Storage API get */

SQLiteStorage.prototype.get = function(key, callback) {
  
  var self = this;
  
  // If key is a string
  if (typeof key == 'string') {
    
    this.client.get(util.format("SELECT value FROM %s WHERE key=?", this.config.table), [key], function(err, field) {
      if (err) {
        callback.call(self, err);
      } else if (field) {
        callback.call(self, null, typecast(field.value));
      } else {
        callback.call(self, null, null);
      }
    });
    
  // If key is an array
  } else if (util.isArray(key)) {
    
    var keys = key;
    var multi = new Multi(this.client);
    
    var condition = keys.map(function(item) {
      return '?';
    }).join(',');
    
    var query = util.format("SELECT * FROM %s WHERE key IN (%s)", this.config.table, condition);
    
    this.client.all(query, keys, function(err, fields) {
      if (err) {
        callback.call(self, err);
      } else {
        for (var item,out={},i=0,len=fields.length; i < len; i++) {
          item = fields[i];
          out[item.key] = typecast(item.value);
        }
        for (i=0,len=keys.length; i < len; i++) {
          key = keys[i];
          if (!(key in out)) {
            out[key] = null;
          }
        }
        callback.call(self, null, out);
      }
    });
    
  }

}

/* Storage API getHash */

SQLiteStorage.prototype.getHash = function(key, callback) {
  var self = this;
  this.get(key, function(err, value) {
    if (err) {
      callback.call(self, err);
    } else if (value) {
      callback.call(self, null, JSON.parse(value));
    } else {
      callback.call(self, null, null);
    }
  });
}

/* Storage API set */

SQLiteStorage.prototype.set = function(key, value, callback) {
  
  var self = this;
  
  // If key is a string
  if (typeof key == 'string') {

    var query = util.format("INSERT OR REPLACE INTO %s VALUES (?,?)", this.config.table);
    
    this.client.run(query, [key, value], function(err) {
      if (err) {
        callback.call(self, err);
      } else {
        callback.call(self, null);
      }
    });
    
  // If key is an object
  } else if (typeof key == 'object') {
    
    // Set multiple values
    var object = key;
    var multi = this.multi();
    
    callback = value;
        
    for (var x in object) {
      multi.set(x, object[x]);
    }
    
    multi.exec(function(err) {
      if (err) {
        callback.call(self, err);
      } else {
        callback.call(self, null);
      }
    });

  }

}

/* Storage API setHash */

SQLiteStorage.prototype.setHash = function(key, object, callback) {
  
  this.set(key, JSON.stringify(object), callback);

}

/* Storage API updateHash */

SQLiteStorage.prototype.updateHash = function(key, object, callback) {

  var self = this;
  
  this.getHash(key, function(err, ob) {
    if (err) {
      callback.call(self, err);
    } else if (ob) {
      ob = _.extend(ob, object);
      this.setHash(key, ob, callback);
    } else {
      callback.call(self, null);
    }
  });

}

/* Storage API deleteFromHash */

SQLiteStorage.prototype.deleteFromHash = function(hash, key, callback) {
  
  var self = this;
  
  this.getHash(hash, function(err, ob) {
    if (err) {
      callback.call(self, err);
    } else if (ob && key in ob) {
      delete ob[key];
      this.setHash(hash, ob, callback);
    } else {
      callback.call(self, null);
    }
  });

}

/* Storage API delete */

SQLiteStorage.prototype.delete = function(key, callback) {

  var self = this;
  
  if (typeof key == 'string') key = [key];
  
  var tokens = key.map(function() { return '?'; }).join(',');
  
  var query = util.format("DELETE FROM %s WHERE key IN (%s)", this.config.table, tokens);
  
  this.client.run(query, key, function(err) {
    if (err) {
      callback.call(self, err);
    } else {
      callback.call(self, null);
    }
  });
  
}

/* Storage API rename */

SQLiteStorage.prototype.rename = function(oldkey, newkey, callback) {
  
  var self = this;

  this.get(oldkey, function(err, value) {
    
    if (err) {
      
      callback.call(self, err);
      
    } else if (value) {
      
      var multi = this.multi();
      
      multi.delete(oldkey);
      multi.set(newkey, value);
      
      multi.exec(function(err) {
        if (err) {
          callback.call(self, err);
        } else {
          callback.call(self, null);
        }
      });

    } else {
      
      // Old key does not exist
      callback.call(self, null);
      
    }
    
  });

}

/* Storage API expire */

SQLiteStorage.prototype.expire = function(key, timeout, callback) {
  
  app.log("SQLiteStorage: SQLite does not support key expiration");
  
  callback.call(this, null);

}

/* Storage API incr */

SQLiteStorage.prototype.incr = function(key, callback) {
  this.incrBy(key, 1, callback);
}

/* Storage API incrBy */

SQLiteStorage.prototype.incrBy = function(key, value, callback) {
  
  var self = this;
  
  this.get(key, function(err, val) {
    
    if (err) {
      
      callback.call(self, err);
      
    } else if (val != null) { // Comparing with null because '0' is falsy
      
      var number = typecast(val);
      
      if (typeof number == 'number') {
        
        this.set(key, number + value, callback);
        
      } else {
        
        callback.call(self, new Error("Attempting to increment a non-integer value"));

      }

    } else {
      
      // Value does not exist, initialize with the increment
      
      this.set(key, parseInt(value, 10) || 0, callback);

    }
    
  });

}

/* Storage API decr */

SQLiteStorage.prototype.decr = function(key, callback) {
  this.incrBy(key, -1, callback);
}

/* Storage API decrBy */

SQLiteStorage.prototype.decrBy = function(key, value, callback) {
  this.incrBy(key, -value, callback);
}

/* Functions & Vars */

var regex = {
  integer: /^\-?\d+$/
}

function typecast(val) {
  if (regex.integer.test(val)) {
    return parseInt(val, 10);
  } else {
    return (val === undefined) ? null : val;
  }
}

module.exports = SQLiteStorage;
