
/**
  @module storages
  @namespace storage
 */

var _ = require('underscore'),
    redis = protos.requireDependency('redis', 'Redis Storage'),
    util = require('util'),
    slice = Array.prototype.slice;

/**
  Redis Storage class
  
  @class RedisStorage
  @extends Storage
  @constructor
  @param {object} app Application instance
  @param {object} config Storage configuration
 */

function RedisStorage(app, config) {
  
   var self = this;
   
   config = protos.extend({
     host: 'localhost',
     port: 6379,
   }, config || {});
   
   /**
    Application instance
    
    @private
    @property app
    @type Application
   */
   
   this.app = app;
   
   app.debug(util.format('Initializing Redis Storage for %s:%s', config.host, config.port));
   
   /**
    Redis database
    
    @private
    @property db
    @type integer
    @default 0
   */
   
   this.db = 0;
   
   /**
    Storage configuration
    
      config = { 
        host: 'localhost',
        port: 6379,
        db: 1,
        pass: 'password'
      }
    
    @property config
    @type object
    */
    
   this.config = config;
   
   /**
    Class name
    
    @private
    @property className
    @type string
   */
   
   this.className = this.constructor.name;
   
   // Set redis client
   self.client = redis.createClient(config.port, config.host, self.options);

   // Authenticate if password provided
   
   if (typeof config.pass == 'string') {
     self.client.auth(config.pass);
   }

   // Handle error event
   self.client.on('error', function(err) {
     app.log("RedisStorage: " + err.toString());
   });

   // Select db if specified
   if (typeof config.db == 'number' && config.db !== 0) {
     self.db = config.db;
     self.client.select(config.db, function(err, res) {
       if (err) throw err;
     });
   }

   // Set enumerable properties
   protos.util.onlySetEnumerable(this, ['className', 'db']);
}

util.inherits(RedisStorage, protos.lib.storage);

/* Storage API get */

RedisStorage.prototype.get = function(key, callback) {
  var self = this;
  
  // If key is a string
  if (typeof key == 'string') {
    
    this.client.get(key, function(err, data) {
      if (err) callback.call(self, err, null);
      else {
        callback.call(self, null, data);
      }
    });
    
  // If key is an array
  } else if (util.isArray(key)) {
    
    var i, out = {}, keys = key, 
        multi = this.client.multi();
        
    for (i=0; i < keys.length; i++) {
      multi.get(keys[i]);
    }
    
    multi.exec(function(err, data) {
      if (err) callback.call(self, err, null);
      else {
        for (i=0; i < keys.length; i++) {
          out[keys[i]] = data[i];
        }
        callback.call(self, null, out);
      }
    });
  }
}

/* Storage API getHash */

RedisStorage.prototype.getHash = function(key, callback) {
  var self = this;
  this.client.hgetall(key, function(err, data) {
    if (err) callback.call(self, err, null);
    else {
      callback.call(self, null, data);
    }
  });
}

/* Storage API set */

RedisStorage.prototype.set = function(key, value, callback) {
  var self = this;
  
  // If key is a string
  if (typeof key == 'string') {
    
    // Set single value
    this.client.set(key, value, function(err, data) {
      if (err) callback.call(self, err);
      else {
        callback.call(self, null);
      }
    });
    
  // If key is an array
  } else if (typeof key == 'object') {
    
    // Set multiple values
    var object = key,
        multi = this.client.multi();
    
    callback = value;
        
    for (var x in object) {
      multi.set(x, object[x]);
    }
    
    multi.exec(function(err, data) {
      if (err) callback.call(self, err);
      else {
        callback.call(self, null);
      }
    });
    
  }
}

/* Storage API setHash */

RedisStorage.prototype.setHash = function(key, object, callback) {
  var self = this;
  this.client.hmset(key, object, function(err, data) {
    if (err) callback.call(self, err);
    else {
      callback.call(self, null);
    }
  });
}

/* Storage API updateHash */

RedisStorage.prototype.updateHash = function(key, object, callback) {
  var self = this,
      args = [key];
      
  for (var x in object) {
    args.push(x);
    args.push(object[x]);
  }
  
  args.push(function(err, results) {
    callback.call(self, err);
  });
  
  this.client.hmset.apply(this.client, args);
}

/* Storage API deleteFromHash */

RedisStorage.prototype.deleteFromHash = function(hash, key, callback) {
  var self = this;
  this.client.hdel(hash, key, function(err, result) {
    callback.call(self, err);
  });
}

/* Storage API delete */

RedisStorage.prototype.delete = function(key, callback) {
  var self = this;
  
  // If key is a string
  if (typeof key == 'string') {
    
    this.client.del(key, function(err, data) {
      if (err) callback.call(self, err);
      else {
        callback.call(self, null);
      }
    });
    
  // If key is an array
  } else if (util.isArray(key)) {
    var i, keys = key,
        multi = this.client.multi();
        
    for (i=0; i < keys.length; i++) {
      multi.del(keys[i]);
    }
    
    multi.exec(function(err, data) {
      if (err) callback.call(self, err);
      else {
        callback.call(self, null);
      }
    });
    
  }
}

/* Storage API rename */

RedisStorage.prototype.rename = function(oldkey, newkey, callback) {
  var self = this;
  this.client.rename(oldkey, newkey, function(err, result) {
    callback.call(self, err);
  });
}

/* Storage API expire */

RedisStorage.prototype.expire = function(key, timeout, callback) {
  var self = this;
  this.client.expire(key, timeout, function(err, result) {
    callback.call(self, err);
  });
}

/* Storage API incr */

RedisStorage.prototype.incr = function(key, callback) {
  var self = this;
  this.client.incr(key, function(err, current) {
    callback.call(self, err);
  });
}

/* Storage API incrBy */

RedisStorage.prototype.incrBy = function(key, value, callback) {
  var self = this;
  this.client.incrby(key, value, function(err, current) {
    callback.call(self, err);
  });
}


/* Storage API decr */

RedisStorage.prototype.decr = function(key, callback) {
  var self = this;
  this.client.decr(key, function(err, current) {
    callback.call(self, err);
  });
}

/* Storage API decrBy */

RedisStorage.prototype.decrBy = function(key, value, callback) {
  var self = this;
  this.client.decrby(key, value, function(err, current) {
    callback.call(self, err);
  });
}

/* Storage API multi (override) */

RedisStorage.prototype.nativeMulti = function() {
  return new RedisMulti(this);
}

////////////// REDIS MULTI

function RedisMulti(instance) {
  
  // The Native Storage Multi for RedisStorage works by replacing the 
  // internal calls to `this.client` with calls to a multi object. This
  // queues the calls instead of executing them immediately.
  
  // Additionally, the exec() method of the multi object has no effect,
  // in case the storage method uses multi internally, it will just reflect
  // as an additional statement being queued in the transaction.
  
  var multi = instance.client.multi();
  
  this.multi = multi;
  this.instance = instance;
  
  // Fake instance, used in place of the original storage instance
  this.fakeInstance = {client: multi}
  
  // Add original exec method
  multi.__exec = multi.exec;
  
  // Replace original multi exec method with empty function
  multi.exec = this.fakeExec;
  
}

// Exec function, gets replaced with fakeExec when queuing statements

RedisMulti.prototype.exec = function(callback) {
  var self = this;
  var multi = this.multi;
  multi.queue = multi.queue.filter(function(arr, i) {
    var len = arr.length;
    var valid = (len > 1 || i === 0); // Valid for arrays with more than 1 items (except for the first one)
    if (valid && arr[len-1] instanceof Function) arr.pop(); // Multi doesn't need callback functions
    return valid;
  });
  multi.__exec(function(err, results) {
     multi.queue = [[ 'MULTI' ]]; // Reset multi after you're done
    callback.call(self, err, results);
  });
}

// Original exec function, used to perform original execution

RedisMulti.prototype.__exec = RedisMulti.prototype.exec;

// Fake function, does nothing when calling exec

RedisMulti.prototype.fakeExec = function() {

}

// Define RedisMulti interface, based on RedisStorage

Object.keys(RedisStorage.prototype).forEach(function(key) {
  if (key != 'multi') {
    var method = RedisStorage.prototype[key];
    if (method instanceof Function) {
      RedisMulti.prototype[key] = function() {
        this.exec = this.fakeExec;
        this.instance[key].apply(this.fakeInstance, arguments);
        this.exec = this.__exec;
      }
    }
  }
});

module.exports = RedisStorage;
