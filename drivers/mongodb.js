         
/* MongoDB */

var _ = require('underscore'),
    util = require('util'),
    mongodb = require('mongodb'),
    slice = Array.prototype.slice,
    Db = mongodb.Db,
    Server = mongodb.Server,
    ObjectID = mongodb.ObjectID,
    Collection = mongodb.Collection;

function MongoDB(app, config) {

  /** config: {
    host: 'localhost',
    port: 27017,
    database: 'db_name',
    cachePrefix: null,
    storage: 'redis'
    } */

    var self = this;

    config = corejs.extend({
      host: 'localhost',
      port: 27017,
      database: 'default',
      cachePrefix: null,
      storage: null
    }, config || {});
    
    this.className = this.constructor.name;
    this.app = app;
    this.config = config;

    corejs.async(app); // Register async queue
    
    var reportError = function(err) {
      app.log(util.format("MongoDB [%s:%s] %s", config.host, config.port, err.code));
      self.client = err;
      corejs.done(app); // Flush async queue
    }
    
    corejs.util.checkPort(config.port, function(err) {

      if (err) {
        reportError(err);
      } else {
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
              self.storage = app.getResource('storages/' + config.storage);
            } else if (config.storage instanceof corejs.lib.storage) {
              self.storage = config.storage;
            }

            // Set caching function
            if (self.storage != null) {
              enableCollectionCache.call(self, client);
              self.setCachePrefix(config.cachePrefix || null);
            } else {
              // Use native count method for __count
              Collection.prototype.__count = Collection.prototype.count;
            }
            
            corejs.done(app); // Flush async queue
          }
        });

      }
      
    });
    
    // Only set important properties enumerable
    corejs.util.onlySetEnumerable(this, ['className', 'db']);
}

util.inherits(MongoDB, corejs.lib.driver);

/**
  Inserts values into a collection

  Provides:  [err, docs]

  Cache: Invalidate / {cacheInvalidate}

  @example

    db.insertInto({
      collection: 'users',
      values: {user: 'hello', pass: 'passme'}
    }, function(err, docs) {
      console.exit([err, docs]);
    });

  @param {object} o 
  @param {function} callback
  @public
 */

MongoDB.prototype.insertInto = function(o, callback) {
  var self = this,
      collection = o.collection || '',
      values = o.values || {};

  this.client.collection(collection, function(err, collection) {
    if (err) callback.call(self, err);
    else {
      self.addCacheData(o, values);
      collection.insert(values, function(err, docs) {
        callback.call(self, err, docs);
      });
    }
  })
}

/**
  Updates records by ID

  Provides: [err, info]

  Cache: Invalidate / {cacheInvalidate}

  @example
      mongodb.updateById({
        _id: 1,
        collection: 'users',
        values: {pass: 'p1234'}
      }, function(err, count) {
        console.log([err, count]);
      });

      mongodb.updateById({
        _id: [1, 2],
        collection: 'users',
        values: {pass: 'p1234'}
      }, function(err, count) {
        console.log([err, count]);
      });

  @param {object} o
  @param {function} callback
  @public
*/

MongoDB.prototype.updateById = function(o, callback) {
  var self = this, 
      collection = o.collection || '',
      values = o.values || '',
      condition = constructIdCondition(o._id);

  this.client.collection(collection, function(err, collection) {
    collection.count(condition, function(err, count) {
      if (err) callback.call(self, err);
      else {
        self.addCacheData(o, condition);
        collection.update(condition, {$set: values}, {multi: true}, function(err, doc) {
          callback.call(self, err, count);
        });
      }
    });
  });
}


/**
  Performs an UPDATE ... WHERE ... query

  Provides: [err, count]

  Cache: Invalidate / {cacheInvalidate}

  @example
      mongodb.updateWhere({
        collection: 'users',
        condition: {user: 'butu5},
        values: {pass: 'p1234'}
      }, function(err, count) {
        console.log([err, count]);
      });

  @param {object} o 
  @param {function} callback
  @public
 */

MongoDB.prototype.updateWhere = function(o, callback) {
  var self = this,
      collection = o.collection || '',
      condition = o.condition || '',
      values = o.values || '';

  this.client.collection(collection, function(err, collection) {
    if (err) callback.call(self, err);
    else {
      collection.count(condition, function(err, count) {
        if (err) callback.call(self, err);
        else {
          self.addCacheData(o, condition);
          collection.update(condition, {$set: values}, function(err, doc) {
            callback.call(self, err, count);
          });
        }
      });
    }
  });
}


/**
  Deletes records by ID

  Provides: [err, count]

  Cache: Invalidate / {cacheInvalidate}

  @example
      mongodb.deleteById({
        _id: 1,
        collection: 'users'
      }, function(err, count) {
        console.log([err, count]);
      });

      mongodb.deleteById({
        _id: [1, 2],
        collection: 'users'
      }, function(err, count) {
        console.log([err, count]);
      });

  @param {object} o 
  @param {function} callback
  @public
 */

MongoDB.prototype.deleteById = function(o, callback) {
  var self = this, 
      collection = o.collection || '',
      condition = constructIdCondition(o._id);

  this.client.collection(collection, function(err, collection) {
    if (err) callback.call(self, err);
    else {
      collection.count(condition, function(err, count) {
        if (err) callback.call(self, err);
        else {
          self.addCacheData(o, condition);
          collection.remove(condition, function(err, doc) {
            callback.call(self, err, count);
          });
        }
      });
    }
  });
}


/**
  Performs a DELETE ... WHERE ... query

  Provides: [err, count]

  Cache: Invalidate / {cacheInvalidate}

  @example
      mongodb.deleteWhere({
        collection: 'users',
        condition: {user: 'butu5}
      }, function(err, count) {
        console.log([err, count]);
      });

  @param {object} o
  @param {function} callback
  @public
 */

MongoDB.prototype.deleteWhere = function(o, callback) {
  var self = this,
      collection = o.collection || '',
      condition = o.condition || {};

  this.client.collection(collection, function(err, collection) {
    if (err) callback.call(self, err);
    else {
      collection.count(condition, function(err, count) {
        if (err) callback.call(self, err);
        else {
          self.addCacheData(o, condition);
          collection.remove(condition, function(err, doc) {
            callback.call(self, err, count);
          });
        }
      });
    }
  });
}

/**
  Performs a SELECT ... WHERE ... query

  Provides: [err, docs]

  Cache: Store / {cacheID, cacheTimeout}

  @example
      mongodb.queryWhere({
        collection: 'users',
        condition: {'user': 'butu5},
        fields: {'user': 1, 'pass': 1}
      }, function(err, docs) {
        console.log([err, docs]);
      });

  @param {object} o
  @param {function} callback
  @public
 */

MongoDB.prototype.queryWhere = function(o, callback) {
  var self = this,
      collection = o.collection || '',
      fields = o.fields || {},
      condition = o.condition || {},
      _id = condition._id;

  // If _id is passed other conditions will be ignored
  if (_id != null) condition = constructIdCondition(_id);

  this.client.collection(collection, function(err, collection) {
    if (err) callback.call(self, err);
    else {
      self.addCacheData(o, condition);
      collection.__find(condition, fields, function(err, docs) {
        callback.call(self, err, docs);
      });
    }
  });
};

/**
  Queries fields by ID

  Provides: [err, docs]

  Cache: Store / {cacheID, cacheTimeout}

  @example
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

  @param {object} o
  @param {function} callback
  @public
 */

MongoDB.prototype.queryById = function(o, callback) {
  var self = this,
      collection = o.collection || '',
      fields = o.fields || {},
      condition = constructIdCondition(o._id);
  
  this.client.collection(collection, function(err, collection) {
    if (err) callback.call(self, err);
    else {
      self.addCacheData(o, condition);
      collection.__find(condition, fields, function(err, docs) {
        callback.call(self, err, docs);
      });
    }
  });
};

/**
  Queries all the entries from a collection

  Provides: [err, docs]

  Cache: Store / {cacheID, cacheTimeout}

  @example
      mongodb.queryAll({
        collection: 'users',
        fields: {'user': 1, 'pass': 1}
      }, function(err, docs) {
        console.log([err, docs]);
      });

  @param {object} o
  @param {function} callback
  @public
 */

MongoDB.prototype.queryAll = function(o, callback) {
  var self = this,
      collection = o.collection || '',
      fields = o.fields || {};

  // Performing a find with {} returns all records
  // Passing only cache data to find, will result on an empty object
  var cdata = {};
  self.addCacheData(o, cdata);

  this.queryWhere({
    collection: collection,
    fields: fields,
    condition: cdata
  }, callback);
};


/**
  Checks if a record exists

  Provides: [err, exists, docs]
  exists -> boolean

  Cache: Store / {cacheID, cacheTimeout}

  @example
      mongodb.recordExists({
        collection: 'users',
        condition: {'user': 'butu5},
        fields: {'user': 1, 'pass': 1}
      }, function(err, exists, docs) {
        console.log([err, exists, docs]);
      });

  @param {object} o
  @param {function} callback
  @public
 */

MongoDB.prototype.recordExists = function(o, callback) {
  var self = this,
      collection = o.collection || '',
      fields = o.fields || {},
      condition = o.condition || {};

  this.client.collection(collection, function(err, collection) {
    if (err) callback.call(self, err);
    else {
      self.addCacheData(o, condition);
      collection.__find(condition, fields, function(err, docs) {
        if (docs.length === 0) {
          callback.call(self, err, false, null);
        } else {
          callback.call(self, err, true, docs);
        }
      });
    }
  });
};


/**
  Performs a query by ID, returning an object with the found ID's.

  Provides: [err, results]

  Cache: Store / {cacheID, cacheTimeout}

  @param {object} o
  @param {function} callback
  @public
 */

MongoDB.prototype.idExists = function(o, callback) {
  var self = this,
      collection = o.collection || '',
      fields = o.fields || {},
      _id = o._id;
      
  this.queryById({
    collection: collection,
    fields: fields,
    _id: _id
  }, function(err, docs) {
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
        var id = _id[i];
        if (! (id in out)) out[id] = null;
      }
      
      callback.call(self, null, out);
      
    }
  });
};

/**
  Counts rows in a collection

  Provides: [err, count]

  Cache: Store / {cacheID, cacheTimeout}

  @example
      mongodb.countRows({
        collection: 'users'
      }, function(err, count) {
        console.log([err, count]);
      });

  @param {object} o
  @param {function} callback
  @public
 */

MongoDB.prototype.countRows = function(o, callback) {
  var self = this,
      collection = o.collection || '';

  this.client.collection(collection, function(err, collection) {
    if (err) callback.call(self, err);
    else {
      var cdata = {};
      self.addCacheData(o, cdata);
      collection.__count(cdata, function(err, count) {
        callback.call(self, err, count);
      });
    }
  });
}


/**
  Remove all records in a collection

  Provides: [err, count]

  Cache: Invalidate / {cacheInvalidate}

  @example
    db.removeRecords({collection: 'users'}, function(err, count) {
      console.log([err, count]);
    });

  @param {object} o
  @param {function} callback
  @public
 */

MongoDB.prototype.removeRecords = function(o, callback) {
  var self = this,
      collection = o.collection || '';

  this.client.collection(collection, function(err, collection) {
    if (err) callback.call(self, err);
    else {
      collection.count(function(err, count) {
        if (err) callback.call(self, err);
        else {
          var cdata = {};
          self.addCacheData(o, cdata);
          collection.remove({}, function(err, docs) {
            callback.call(self, err, count);
          });
        }
      });
    }
  });
}

MongoDB.prototype.__modelMethods = {

  /** Model API insert */

  insert: function(o, cdata, callback) {
    var self = this;

    // Process callback & cache Data
    if (typeof callback == 'undefined') { callback = cdata; cdata = {}; }

    // Validate, throw error on failure
    this.__validateProperties(o);

    // Save data into the database
    this.driver.insertInto(_.extend({
      collection: this.context,
      values: o
    }, cdata), function(err, docs) {
      if (err) callback.call(self, err, null);
      else {
        callback.call(self, null, docs[0]._id);
      }
    });
  },


  /** Model API get */

  get: function(o, cdata, callback) {
    var self = this,
        options = {};

    // Process callback & cache data
    if (typeof callback == 'undefined') { callback = cdata; cdata = {}; }

    if (typeof o == 'number' || typeof o == 'string') { 
      // If `o` is number: Convert to object
      o = {_id: o};
    } else if (o instanceof Array) {

      // If `o` is an array of params, process args recursively using multi
      var arr = o, 
          multi = this.multi();
      for (var i=0; i < arr.length; i++) {
        multi.get(arr[i], cdata);
      }
      multi.exec(function(err, docs) {
        callback.call(self, err, docs);
      });
      return;

    } else if (o instanceof Object) {

      // IF `o` is object: Validate without checking required fields
      this.__propertyCheck(o);

    } else {

      callback.call(self, new Error(util.format("%s: Wrong value for `o` argument", this.className)), null);
      return;

    }

    options.collection = this.context;
    options.condition= o;
    options.fields = {};

    this.driver.queryWhere(options, function(err, docs) {
      if (err) callback.call(self, err, null);
      else {
        if (docs.length === 0) callback.call(self, null, null);
        else {
          var model = self.__createModel(docs[0]);
          callback.call(self, null, model);
        }
      }
    });
  },

  /** Model API getAll */

  getAll: function(cdata, callback) {
    var self = this, models = [];

    // Process callback & cache data
    if (typeof callback == 'undefined') { callback = cdata; cdata = {}; }

    this.driver.queryAll(_.extend({
      collection : this.context
    }, cdata), function(err, docs) {
      if (err) callback.call(self, err, null);
      else {
        for (var i=0; i < docs.length; i++) {
          models.push(self.__createModel(docs[i]));
        }
        callback.call(self, null, models);
      }
    });

  },

  /** Model API save */

  save: function(o, cdata, callback) {
    var self = this;

    // Process callback & cache data
    if (typeof callback == 'undefined') { callback = cdata; cdata = {}; }

    // Update data. Validation has already been performed by ModelObject
    var _id = o._id; 
    delete o._id;
    this.driver.updateById(_.extend({
      _id: _id,
      collection: this.context,
      values: o
    }, cdata), function(err, docs) {
      callback.call(self, err);
    });
  },


  /** Model API delete */

  delete: function(id, cdata, callback) {
    var self = this;

    // Process callback & cache data
    if (typeof callback == 'undefined') { callback = cdata; cdata = {}; }

    if (typeof id == 'string') {

      // Remove entry from database
      this.driver.deleteById(_.extend({
        _id: id,
        collection: this.context,
      }, cdata), function(err, docs) {
        callback.call(self, err);
      });

    } else if (util.isArray(id)) {

      // Remove multiple entries
      var i, arr = id,
      multi = this.multi();

      for (i=0; i < arr.length; i++) {
        id = arr[i];
        multi.delete(id);
      }

      multi.exec(function(err, docs) {
        callback.call(self, err, docs);
      })
      return;

    } else {
      callback.call(self, new Error(util.format("%s: Wrong value for `id` parameter", this.className)));
    }
  }
}

/**
  Enables collection cache in collection objects
  
  The Client::collection method is overridden to support
  implement caching via the Driver's internals.
 */

function enableCollectionCache(client) {
  var self = this,
      collectionCache = {},
      _collection = client.collection;

  // Override client.collection to support cache
  client.collection = function() {
    var args = slice.call(arguments, 0),
        cname = args[0],
        callback = args.pop();
    
    if (cname in collectionCache) {
      // Collection is cached
      app.debug('Returning cached collection: ' + cname);
      callback(null, collectionCache[cname]);
    }  else {
      // Collection not cached
      args.push(function(err, collection) {
        if (err) {
          callback(err, null);
        } else {
          app.debug('Generating new cache for collection: ' + cname);
          // Enable caching with Collection::__count
          collection.__count = __count;
          // Cache collection object
          collectionCache[cname] = collection; 
          // Enable caching in collection object
          self.cacheClientMethods(collection, 'insert', 'count', 'update', 'remove', '__count', '__find');
          // Run callback with collection
          callback(null, collection);          
        }
      });
      // Get collection
      _collection.apply(client, args);
    }
  }
}

/**
  Construct Id condition 

  Provides: {object} condition

  @param {number || string || array (string || number) } _id 
  @private
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

/**
  Count method that supports caching
  
  @param {object} cdata: Cache data
  @param {function} callback
  @public
 */

function __count(cdata, callback) {
  // This function is overridden, and the cdata var is used for caching
  this.count(function(err, count) {
    callback.call(self, err, count);
  });
}

/**
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

module.exports = MongoDB ;