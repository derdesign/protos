         
/**
  @module drivers
  @namespace driver
 */

var _ = require('underscore'),
    util = require('util'),
    slice = Array.prototype.slice,
    mongodb = protos.requireDependency('mongodb', 'MongoDB Driver'),
    Db = mongodb.Db,
    Server = mongodb.Server,
    ObjectID = mongodb.ObjectID,
    Collection = mongodb.Collection,
    EventEmitter = require('events').EventEmitter;

/**
  MongoDB Driver class
 
  @class MongoDB
  @extends Driver
  @constructor
  @param {object} app Application instance
  @param {object} config Driver configuration
 */

function MongoDB(app, config) {
  
    var self = this;
    
    this.events = new EventEmitter();

    config = protos.extend({
      host: 'localhost',
      port: 27017,
      database: 'default',
      storage: null,
      username: '',
      password: ''
    }, config || {});
    
    if (typeof config.port != 'number') config.port = parseInt(config.port, 10);
    
    this.className = this.constructor.name;
    this.app = app;
    
    app.debug(util.format('Initializing MongoDB for %s:%s', config.host, config.port));
    
    /**
      Driver configuration
    
      config: {
        host: 'localhost',
        port: 27017,
        database: 'db_name',
        storage: 'redis'
      }
      
      @property config
      @type object
     */
    this.config = config;

    var reportError = function(err) {
      app.log(util.format("MongoDB [%s:%s] %s", config.host, config.port, err));
      self.client = null;
    }
    
    // Set db
    self.db = new Db(config.database, new Server(config.host, config.port, {}));
    
    // Get client
    self.db.open(function(err, client) {
      
      if (err) {
        reportError(err);
      } else {
        
        // Set client
        self.client = client;
         
        // Set storage
        if (typeof config.storage == 'string') {
          self.storage = app._getResource('storages/' + config.storage);
        } else if (config.storage instanceof protos.lib.storage) {
          self.storage = config.storage;
        }
        
        // Authenticate
        if (config.username && config.password) {
          
          self.db.authenticate(config.username, config.password, function(err, success) {
            
            if (err) {
              
              var msg = util.format('MongoDB: unable to authenticate %s@%s', config.username, config.host);
              app.log(new Error(msg));
              throw err;
              
            } else {
              
              // Emit initialization event
              self.events.emit('init', self.db, self.client);
              
            }
            
          });
          
        } else {
          // Emit initialization event
          self.events.emit('init', self.db, self.client);
        }
        
      }
    });
    
    // Only set important properties enumerable
    protos.util.onlySetEnumerable(this, ['className', 'db']);
}

util.inherits(MongoDB, protos.lib.driver);

/**
  Inserts values into a collection

  Example:

    mongodb.insertInto({
      collection: 'users',
      values: {user: 'hello', pass: 'passme'}
    }, function(err, docs) {
      console.log([err, docs]);
    });

  @method insertInto
  @param {object} o 
  @param {function} callback
 */

MongoDB.prototype.insertInto = function(o, callback) {
  var self = this,
      collection = o.collection,
      values = o.values;
  
  if (!values) {
    callback.call(self, new Error("MongoDB::insertInto: 'values' is missing"));
    return;
  }
  
  this.client.collection(collection, function(err, collection) {
    if (err) callback.call(self, err);
    else {
      collection.insert(values, function(err, docs) {
        callback.call(self, err, docs);
      });
    }
  });
}

/**
  Updates items where condition is satisfied

  Example:
  
    mongodb.updateWhere({
      collection: 'users',
      condition: {user: 'user1},
      multi: true,
      values: {pass: 'pass1'}
    }, function(err) {
      console.log(err);
    });

  @method updateWhere
  @param {object} o
  @param {function} callback
 */

MongoDB.prototype.updateWhere = function(o, callback) {
  var self = this,
      collection = o.collection || '',
      condition = o.condition,
      multi = (typeof o.multi == 'undefined') ? true : (o.multi || false), // Ensure boolean
      values = o.values || {};
      
  if (!o.condition) {
    callback.call(self, new Error("MongoDB::queryWhere: 'condition' is missing"));
    return;
  }
  
  this.client.collection(collection, function(err, collection) {
    if (err) callback.call(self, err);
    else {
      collection.count(condition, function(err, count) {
        if (err) callback.call(self, err);
        else {
          collection.update(condition, {$set: values}, {multi: multi, upsert: false}, function(err) {
            // Note: upsert is set to false, to provide predictable results
            callback.call(self, err || null);
          });
        }
      });
    }
  });
}

/**
  Updates items by ID

  Example:
  
    mongodb.updateById({
      _id: 1,
      collection: 'users',
      values: {pass: 'pass1'}
    }, function(err) {
      console.log(err);
    });

    mongodb.updateById({
      _id: [1, 2],
      collection: 'users',
      values: {pass: 'pass1'}
    }, function(err) {
      console.log(err);
    });

  @method updateById
  @param {object} o
  @param {function} callback
*/

MongoDB.prototype.updateById = function(o, callback) {
  var self = this, 
      collection = o.collection || '',
      values = o.values || {};
      
  if (typeof o._id == 'undefined') {
    callback.call(self, new Error("MongoDB::updateById: '_id' is missing"));
    return;
  }
  
  var condition = constructIdCondition(o._id);
  
  this.updateWhere({
    collection: collection,
    condition: condition,
    multi: o.multi,
    values: values
  }, callback);
  
}

/**
  Deletes items where condition is satisfied

  Example:
  
    mongodb.deleteWhere({
      collection: 'users',
      condition: {user: 'user1}
    }, function(err) {
      console.log(err);
    });

  @method deleteWhere
  @param {object} o
  @param {function} callback
 */

MongoDB.prototype.deleteWhere = function(o, callback) {
  var self = this,
      collection = o.collection || '',
      condition = o.condition;
      
  if (!condition) {
    callback.call(self, new Error("MongoDB::deleteWhere: 'condition' is missing"));
    return;
  }
  
  this.client.collection(collection, function(err, collection) {
    if (err) callback.call(self, err);
    else {
      collection.remove(condition, function(err) {
        if (err) callback.call(self, err);
        else callback.call(self, null);
      });
    }
  });
}

/**
  Deletes records by ID

  Example:
  
    mongodb.deleteById({
      _id: 1,
      collection: 'users'
    }, function(err) {
      console.log(err);
    });

    mongodb.deleteById({
      _id: [1, 2],
      collection: 'users'
    }, function(err) {
      console.log(err);
    });

  @method deleteById
  @param {object} o 
  @param {function} callback
 */

MongoDB.prototype.deleteById = function(o, callback) {
  var self = this, 
      collection = o.collection || '';
      
  if (!o._id) {
    callback.call(self, new Error("MongoDB::deleteById: '_id' is missing"));
    return;
  }
  
  var args = {
    collection: collection,
    condition: constructIdCondition(o._id)
  }
  
  this.deleteWhere(args, callback);
}

/**
  Queries documents where condition is satisfied

  Example:
  
    mongodb.queryWhere({
      collection: 'users',
      condition: {'user': 'user1},
      fields: {'user': 1, 'pass': 1}
    }, function(err, docs) {
      console.log([err, docs]);
    });

  @method queryWhere
  @param {object} o
  @param {function} callback
 */

MongoDB.prototype.queryWhere = function(o, callback) {
  var self = this,
      collection = o.collection || '',
      fields = o.fields || {},
      condition = o.condition,
      _id = (condition && condition._id);
      
  if (!condition) {
    callback.call(self, new Error("MongoDB::queryWhere: 'condition' is missing"));
    return;
  }

  // If _id is passed other conditions will be ignored
  if (_id != null) condition = constructIdCondition(_id);

  this.client.collection(collection, function(err, collection) {
    if (err) callback.call(self, err);
    else {
      collection.__find(condition, fields, function(err, docs) {
        callback.call(self, err, docs);
      });
    }
  });
};

/**
  Queries documents by ID

  Example:
  
    mongodb.queryById({
      _id: 1,
      collection: 'users',
      fields: {'user': 1, 'pass': 1}
    }, function(err, docs) {
      console.log([err, docs]);
    });

    mongodb.queryById({
      _id: [1, 2],
      collection: 'users',
      fields: {'user': 1, 'pass': 1}
    }, function(err, docs) {
      console.log([err, docs]);
    });

  @method queryById
  @param {object} o
  @param {function} callback
 */

MongoDB.prototype.queryById = function(o, callback) {
  var self = this,
      collection = o.collection || '',
      fields = o.fields || {};
  
  if (typeof o._id == 'undefined') {
    callback.call(self, new Error("MongoDB::queryById: '_id' is missing"));
    return;
  }
    
  var condition = constructIdCondition(o._id);
  
  this.client.collection(collection, function(err, collection) {
    if (err) callback.call(self, err);
    else {
      collection.__find(condition, fields, function(err, docs) {
        callback.call(self, err, docs);
      });
    }
  });
};

/**
  Queries all documents in a collection

  Example:

    mongodb.queryAll({
      collection: 'users',
      fields: {'user': 1, 'pass': 1}
    }, function(err, docs) {
      console.log([err, docs]);
    });

  @method queryAll
  @param {object} o
  @param {function} callback
 */

MongoDB.prototype.queryAll = function(o, callback) {
  var self = this,
      collection = o.collection || '',
      fields = o.fields || {};

  var args = {
    collection: collection,
    fields: fields,
    condition: {}
  }
  
  this.queryWhere(args, callback);
};

/**
  Queries documents by ID, returning an object with the ID's as keys,
  which contain the document (if found), or null if the document is not found.

  Example:
  
    mongodb.idExists({
      _id: 1,
      collection: 'users'
    }, function(err, docs) {
      console.log([err, docs]);
    });
    
    mongodb.idExists({
      _id: [1, 2],
      collection: 'users',
      fields: {user: 1, pass: 1}
    }, function(err, docs) {
      console.log([err, docs]);
    });
  
  @method idExists
  @param {object} o
  @param {function} callback
 */

MongoDB.prototype.idExists = function(o, callback) {
  var self = this,
      collection = o.collection || '',
      fields = o.fields || {},
      _id = o._id;
      
  if (typeof _id == 'undefined') {
    callback.call(self, new Error("MongoDB::idExists: '_id' is missing"));
    return;
  }
  
  var args = {
    collection: collection,
    fields: fields,
    _id: _id
  }
  
  this.queryById(args, function(err, docs) {
    if (err) callback.call(self, err, {});
    else {
      var out = {}, doc, id, i;
      
      // Store found docs
      for (i=0; i < docs.length; i++) {
        doc = docs[i];
        out[doc._id.toString()] = doc;
      }
      
      // Set missing docs as null
      for (i=0; i < _id.length; i++) {
        id = _id[i];
        if (! (id in out)) out[id] = null;
      }
      
      callback.call(self, null, out);
      
    }
  });
};

/**
  Counts all documents in a collection

  Example:

    mongodb.count({
      collection: 'users'
    }, function(err, count) {
      console.log([err, count]);
    });

  @method count
  @param {object} o
  @param {function} callback
 */

MongoDB.prototype.count = function(o, callback) {
  var self = this,
      collection = o.collection || '';
      
  this.client.collection(collection, function(err, collection) {
    if (err) callback.call(self, err);
    else {
      collection.count(function(err, count) {
        callback.call(self, err, count);
      });
    }
  });
}

/**
  Converts `_id` to `id` when generating model objects,
  to conform with the Model API.
  
  Used internally by the model.
  
  @private
  @method idFilter
  @param {object} o
 */
 
MongoDB.prototype.idFilter = function(o) {
  if ('_id' in o) {
    o.id = o._id;
    delete o._id;
  }
}

// Model methods. See lib/driver.js for Model API docs

MongoDB.prototype.__modelMethods = {

  /* Model API insert */

  insert: function(o, callback) {
    var self = this;

    // Validate, 
    var err = this.validateProperties(o);
    
    if (err) callback.call(self, err);
    
    else {

      // Convert object types to strings
      this.convertTypes(o);

      // Set model defaults
      this.setDefaults(o);

      // Convert `id` to `_id`
      convertMongoID(o);

      // Save data into the database
      this.driver.insertInto({
        collection: this.context,
        values: o
      }, function(err, docs) {
        if (err) callback.call(self, err, null);
        else {
          callback.call(self, null, docs[0]._id);
        }
      });
      
    }
    
  },


  /* Model API get */

  get: function(o, callback) {
    var self = this;

    if (typeof o == 'number' || typeof o == 'string' || o instanceof ObjectID) { 
      // If `o` is number: Convert to object
      o = {_id: o};
    } else if (o instanceof Array) {

      // If `o` is an array of params, process args recursively using multi
      var arr = o, 
          multi = this.multi();
      for (var i=0; i < arr.length; i++) {
        multi.get(arr[i]);
      }
      multi.exec(function(err, docs) {
        callback.call(self, err, docs);
      });
      return;

    } else if (o.constructor === Object) {
      
      // IF `o` is object: Validate without checking required fields
      this.propertyCheck(o);

    } else {

      callback.call(self, new Error(util.format("%s: Wrong value for `o` argument", this.className)), null);
      return;

    }
    
    // TODO: automatically detect which fields should be retrieved based
    // on this.properties
    
    this.driver.queryWhere({
      collection: this.context,
      condition: o,
      fields: {}
    }, function(err, docs) {
      if (err) callback.call(self, err, null);
      else {
        if (docs.length === 0) callback.call(self, null, []);
        else {
          for (var models=[],i=0; i < docs.length; i++) {
            models.push(self.createModel(docs[i]));
          }
          callback.call(self, null, models);
        }
      }
    });
  },

  /* Model API getAll */

  getAll: function(callback) {
    var self = this;

    this.driver.queryAll({
      collection : this.context
    }, function(err, docs) {
      if (err) callback.call(self, err, null);
      else {
        for (var models=[],i=0; i < docs.length; i++) {
          models.push(self.createModel(docs[i]));
        }
        callback.call(self, null, models);
      }
    });

  },

  /* Model API save */

  save: function(o, callback) {
    
    var self = this;

    // Note: Validation has already been performed by ModelObject
    
    // Convert `id` to `_id`
    convertMongoID(o);
    
    // Get _id, and prepare update data
    var _id = o._id;
    delete o._id;
    
    if (typeof _id == 'undefined') {
      callback.call(this, new Error("Unable to update model object without ID"));
      return;
    }
    
    // Validate, throw error on failure
    var err = this.validateProperties(o, {noRequired: true});
    
    if (err) callback.call(self, err);
    
    else {
      
      this.driver.updateById({
        _id: _id,
        collection: this.context,
        values: o
      }, function(err, docs) {
        callback.call(self, err);
      });
      
    }
    
  },


  /* Model API delete */

  delete: function(id, callback) {
    var self = this;

    if (typeof id == 'number' || typeof id == 'string' || id instanceof Array || id instanceof ObjectID) {

      this.driver.deleteById({
        collection: this.context,
        _id: id
      }, function(err) {
        callback.call(self, err);
      });
      
    } else {
      callback.call(self, new Error(util.format("%s: Wrong value for `id` parameter", this.className)));
    }
  }
}

/*
  Construct Id condition 

  Provides: {object} condition

  @private
  @param {number|string|array} _id 
*/

function constructIdCondition(_id) {
  if (typeof _id === 'number' || _id instanceof ObjectID || _id.constructor === Object) {
    // Number or ObjectID/Object instance » Return as is
    return {_id: _id};
  } else if (typeof _id === 'string') {
    // String » Convert to Object ID
    return {_id: new ObjectID(_id)};
  } else if (_id instanceof Array) {
    // Array » Return $in condition
    for (var id, $in=[], i=0; i < _id.length; i++) {
      id = _id[i];
      if (typeof id == 'number' || id instanceof ObjectID) {
        $in.push(id);
      } else if (typeof id == 'string') {
        $in.push(new ObjectID(id));
      }
    }
    return {_id: {$in: $in}};
  }
}

/*
  Converts an 'id' param to an _id param
  
  @private
  @param {number|string|array} _id
 */
 
function convertMongoID(o) {
  if ('id' in o) {
    o._id = o.id;
    delete o.id;
  }
}

/*
  Quick find method without cursors
 */

Collection.prototype.__find = function() {
  var self = this,
      args = slice.call(arguments, 0),
      callback = args.pop();
  args.push(function(err, cursor) {
    if (err) callback.call(self, err);
    else {
      cursor.toArray(function(err, docs) {
        callback.call(self, err, docs);
      });
    }
  });
  this.find.apply(this, args);
}

module.exports = MongoDB;
