
/**
  @module drivers
  @namespace driver
 */

var _ = require('underscore'),
    mysql = protos.requireDependency('mysql', 'MySQL Driver'),
    util = require('util'),
    regex = { endingComma: /, ?$/};

/**
  MySQL Driver class
  
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
  
  this.config = config;
  
  // Set client
  this.client = mysql.createClient(config);

  // Assign storage
  if (typeof config.storage == 'string') {
    this.storage = app._getResource('storages/' + config.storage);
  } else if (config.storage instanceof protos.lib.storage) {
    this.storage = config.storage;
  }
  
  // Set db
  this.db = config.database;
      
  // Only set important properties enumerable
  protos.util.onlySetEnumerable(this, ['className', 'db']);
  
}

util.inherits(MySQL, protos.lib.driver);

/**
  Queries rows from a table

  Example:
  
    mysql.query({
      sql: 'SELECT * FROM table WHERE id=? AND user=?',
      params: [id, user],
      appendSql: ''
    }, function(err, results, fields) {
      console.log([err, results, fields]);
    });

  @method query
  @param {object} o
  @param {function} callback
*/

MySQL.prototype.query = function(o, callback) {
  var args,
      sql = o.sql || '',
      params = o.params || [],
      appendSql = o.appendSql || '';
  
  if (!util.isArray(params)) params = [params];
  
  args = [(sql + " " + appendSql).trim(), params, callback];
  
  this.client.query.apply(this.client, args);
}

/**
  Executes a query that is not expected to provide any results

  Example:

    mysql.exec({
      sql: 'SHOW TABLES',
    }, function(err, info) {
      console.log([err, info]);
    });

  @method exec
  @param {object} o
  @param {function} callback
*/

MySQL.prototype.exec = function(o, callback) {
  var args, 
      self = this,
      sql = o.sql || '',
      params = o.params || [];
  
  if (!util.isArray(params)) params = [params];
  
  args = [sql, params];
  args.push(function(err, info) {
    callback.call(self, err, info);
  });
  
  this.client.query.apply(this.client, args);
}

/**
  Queries rows when condition is satisfied

  Example:

    mysql.queryWhere({
      condition: 'id=?',
      params: [1],
      table: 'users'
    }, function(err, results, fields) {
      console.log([err, results, fields]);
    });

  @method queryWhere
  @param {object} o
  @param {function} callback
 */

MySQL.prototype.queryWhere = function(o, callback) {
  var args, 
      self = this,
      condition = o.condition || '',
      params = o.params || [],
      table = o.table || '',
      columns = o.columns || '*',
      appendSql = o.appendSql || '';

  if (!util.isArray(params)) params = [params];
  
  args = [("SELECT " + columns + " FROM " + table + " WHERE " + condition + " " + appendSql).trim(), params];
  
  args.push(function(err, results, fields) {
    callback.call(self, err, results, fields);
  });
  
  // console.exit(args);
  
  this.client.query.apply(this.client, args);
}

/**
  Queries all rows in a table
  
  Example:

    mysql.queryAll({
      columns: 'user, pass',
      table: 'users'
    }, function(err, results, fields) {
      console.log([err, results, fields]);
    });

  @method queryAll
  @param {object} o
  @param {function} callback
 */

MySQL.prototype.queryAll = function(o, callback) {
  var args, 
      self = this,
      columns = o.columns || '*',
      table = o.table || '',
      appendSql = o.appendSql || '';
  
  args = [("SELECT " + columns + " FROM " + table + " " + appendSql).trim()];
  
  args.push(function(err, results, columns) {
    callback.call(self, err, results, columns);
  });
  
  this.client.query.apply(this.client, args);
}

/**
  Queries fields by ID

  Example:

    mysql.queryById({
      id: [1,3],
      table: 'users'
    }, function(err, results, fields) {
      console.log([err, results, fields]);
    });
  
  @method queryById
  @param {object} o
  @param {function} callback
 */

MySQL.prototype.queryById = function(o, callback) {
  var args,
      id = o.id,
      table = o.table || '',
      columns = o.columns || '*',
      appendSql = o.appendSql || '';
  
  if (typeof id == 'number') id = [id];
  
  args = [{
    condition: "id IN (" + (id.toString()) + ")",
    table: table,
    columns: columns,
    appendSql: appendSql
  }, callback];
  
  this.queryWhere.apply(this, args);
}

/**
  Inserts values into a table

  Example:

    mysql.insertInto({
      table: 'users',
      values: {user: 'hello', pass: 'passme'}
    }, function(err, info) {
      console.log([err, info]);
    });

  @method insertInto
  @param {object} o
  @param {function} callback
 */

MySQL.prototype.insertInto = function(o, callback) {
  var args, params, query, 
      self = this,
      table = o.table || '',
      values = o.values || {};
      
  if (util.isArray(values)) {
    params = protos.util.strRepeat('?, ', values.length).replace(regex.endingComma, '');
    args = ["INSERT INTO " + table + " VALUES(" + params + ")", values];
  } else {
    query = "INSERT INTO " + table + " SET ";
    if (values.id == null) values.id = null;
    for (var key in values) {
      query += key + "=?, ";
    }
    query = query.replace(regex.endingComma, '');
    args = [query, _.values(values)];
  }
  
  args.push(function(err, info) {
    callback.call(self, err, info.insertId, info);
  });
  
  // console.exit(args);
  
  this.client.query.apply(this.client, args);
}

/**
  Deletes records by ID

  Example:

    mysql.deleteById({
      id: 4,
      table: 'users'
    }, function(err, info) {
      console.log([err, info]);
    });

  @method deleteById
  @param {object} o
  @param {function} callback
  */

MySQL.prototype.deleteById = function(o, callback) {
  var args,
      id = o.id,
      table = o.table || '',
      appendSql = o.appendSql || '';
  
  if (typeof id == 'number') id = [id];
  
  args = [{
    condition: "id IN (" + (id.toString()) + ")",
    table: table,
    appendSql: appendSql
  }, callback]
  
  this.deleteWhere.apply(this, args);
}

/**
  Deletes rows where condition is satisfied
  
  Example:

    mysql.deleteWhere({
      condition: 'id=?',
      params: [5],
      table: 'users'
    }, function(err, info) {
      console.log([err, info]);
    });

  @method deleteWhere
  @param {object} o
  @param {function} callback
 */

MySQL.prototype.deleteWhere = function(o, callback) {
  var args, 
      self = this,
      condition = o.condition || '',
      params = o.params || [],
      table = o.table || '',
      appendSql = o.appendSql || '';
      
  if (!util.isArray(params)) params = [params];
  
  args = ["DELETE FROM " + table + " WHERE " + condition + " " + appendSql, params];
  
  args.push(function(err, info) {
    callback.call(self, err, info);
  });
  
  this.client.query.apply(this.client, args);
}

/**
  Updates records by ID
  
  Example:

    mysql.updateById({
      id: 1,
      table: 'users',
      values: {user: 'ernie'}
    }, function(err, info) {
      console.log([err, info]);
    });

  @method updateById
  @param {object} o
  @param {function} callback
 */

MySQL.prototype.updateById = function(o, callback) {
  var args,
      id = o.id,
      table = o.table || '',
      values = o.values || {},
      appendSql = o.appendSql || '';
  
  if (typeof id == 'number') id = [id];
  
  args = [{
    condition: "id IN (" + (id.toString()) + ")",
    table: table,
    values: values,
    appendSql: appendSql
  }, callback]
  
  this.updateWhere.apply(this, args);
}

/**
  Updates rows where condition is satisfied
  
  Example:

    mysql.updateWhere({
      condition: 'id=?',
      params: [1],
      table: 'users',
      values: {user: 'ernie'}
    }, function(err, info) {
      console.log([err, info]);
    });
  
  @method updateWhere
  @param {object} o
  @param {function} callback
 */

MySQL.prototype.updateWhere = function(o, callback) {
  var args,query, 
      self = this,
      condition = o.condition || '',
      params = o.params || [],
      table = o.table || '',
      values = o.values || {},
      appendSql = o.appendSql || '';
  
  query = "UPDATE " + table + " SET ";
  
  if (!util.isArray(params)) params = [params];
  
  for (var key in values) {
    query += key + "=?, ";
  }
  
  query = query.replace(regex.endingComma, '');
  query += " WHERE " + condition + " " + appendSql;
  
  args = [query, _.values(values).concat(params)];
  
  args.push(function(err, info) {
    callback.call(self, err, info);
  });
  
  this.client.query.apply(this.client, args);
}

/**
  Counts rows in a table

  Example:

    mysql.countRows({
      table: table
    }, function(err, count) {
      console.log([err, count]);
    });

  @method countRows
  @param {object} o
  @param {function} callback
 */

MySQL.prototype.countRows = function(o, callback) {
  var args, 
      self = this,
      table = o.table || '';
      
  args = ["SELECT COUNT('') AS total FROM " + table, []];
  
  args.push(function(err, results, fields) {
    args = err ? [err, null] : [err, results[0].total];
    callback.apply(self, args);
  });
  
  this.client.query.apply(this.client, args);
}

/**
  Queries rows by ID, returning an object with the ID`s as keys,
  which contain the row (if found), or null if the row is not found.

  Example:

    mysql.idExists({
      id: [1,2],
      table: 'users'
    }, function(err, results) {
      console.log([err, results]);
    });

  @method idExists
  @param {object} o
  @param {function} callback
 */

MySQL.prototype.idExists = function(o, callback) {
  var args, 
      self = this,
      id = o.id,
      table = o.table || '',
      columns = o.columns || '*',
      appendSql = o.appendSql || '';
  
  if (typeof id == 'number') id = [id];
  
  args = [o]; // Passing unmodified `o`
  
  args.push(function(err, results, fields) {
    if (err) {
      callback.call(self, err, null);
    } else {
      if (id.length == 1) {
        callback.call(self, null, results[0]);
      } else {
        var num,
            found = [],
            records = {},
            exists = {};
        for (var result, i=0; i < results.length; i++) {
          result = results[i];
          found.push(result.id);
          records[result.id] = results[i];
        }
        for (i=0; i < id.length; i++) {
          num = id[i];
          exists[num] = (found.indexOf(num) >= 0) ? records[num] : null;
        }
        callback.apply(self, [null, exists]);
      }
    }
  });
  
  this.queryById.apply(this, args);
}

// Model methods. See lib/driver.js for Model API docs

MySQL.prototype.__modelMethods = {
  
  /* Model API insert */
  
  insert: function(o, callback) {
    var self = this;
    
    // Data is validated prior to being inserted
    var err = this.validateProperties(o);

    if (err) callback.call(self, err);
    
    else {
      
      // Convert object types to strings
      this.convertTypes(o);

      // Set model defaults
      this.setDefaults(o);

      // Save data into the database
      this.driver.insertInto({
        table: this.context,
        values: o
      }, function(err, id) {
        if (err) callback.call(self, err, null);
        else {
          callback.call(self, null, id);
        }
      });
      
    }

  },
  
  /* Model API get */
  
  get: function(o, callback) {
    var self = this;
    
    if (typeof o == 'number') { 
      // If `o` is number: Convert to object
      o = {id: o};
    } else if (util.isArray(o)) {
      
      // If `o` is an array of params, process args recursively using multi
      var arr = o, 
          multi = this.multi();
      for (var i=0; i < arr.length; i++) {
        multi.get(arr[i]);
      }
      multi.exec(function(err, results) {
        callback.call(self, err, results);
      });
      return;
      
    } else if (typeof o == 'object') {
      
      // IF `o` is object: Validate without checking required fields
      this.propertyCheck(o);
      
    } else {
      
      callback.call(self, new Error(util.format("%s: Wrong value for `o` argument", this.className)), null);
      return;
      
    }
      
    // Prepare custom query
    var condition, key, value,
        keys = [], values = [];
    
    for (key in o) {
      keys.push(key);
      values.push(o[key]);
    }
    
    // Prevent empty args
    if (keys.length === 0) {
      callback.call(self, new Error(util.format("%s: Empty arguments", this.className)));
      return;
    } else {
      condition = keys.join('=? AND ') + '=?';
    }
    
    // Get model data & return generated model (if found)
    this.driver.queryWhere({
      condition: condition,
      params: values,
      table: this.context,
    }, function(err, results) {
      if (err) callback.call(self, err, null);
      else {
        if (results.length === 0) callback.call(self, null, []);
        else {
          for (var models=[],i=0; i < results.length; i++) {
            models.push(self.createModel(results[i]));
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
      table: this.context
    }, function(err, results) {
      if (err) callback.call(self, err, null);
      else {
        for (var models=[],i=0; i < results.length; i++) {
          models.push(self.createModel(results[i]));
        }
        callback.call(self, null, models);
      }
    });

  },
  
  /* Model API save */
  
  save: function(o, callback) {
    var id, self = this;
    
    // // Get id, and prepare update data
    id = o.id; 
    delete o.id;
    
    if (typeof id == 'undefined') {
      callback.call(this, new Error(util.format("%s: Unable to update model object without ID", this.className)));
      return;
    }
    
    // Data is validated prior to being updated
    var err = this.validateProperties(o, {noRequired: true});
    
    if (err) callback.call(self, err);
    
    else {
      
      // Update data
      this.driver.updateById({
        id: id,
        table: this.context,
        values: o
      }, function(err, results) {
        callback.call(self, err);
      });
      
    }
    
  },
  
  /* Model API delete */
  
  delete: function(id, callback) {
    var self = this;
    
    if (typeof id == 'number' || id instanceof Array) {
      
      // Remove entry from database
      this.driver.deleteById({
        id: id,
        table: this.context,
        appendSql: 'LIMIT 1'
      }, function(err, results) {
        callback.call(self, err);
      });
      
    } else {
      
      console.log(id);
      callback.call(self, new Error(util.format("%s: Wrong value for `id` parameter", this.className)));
      
    }

  }
  
}

module.exports = MySQL;