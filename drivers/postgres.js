
/* drivers/postgres.js */
 
var app = protos.app;
var pg = protos.requireDependency('pg', "PostgreSQL Driver", "postgres"),
    _ = require('underscore'),
    Client = pg.Client,
    util = require('util');
    
/**
  PostgreSQL Driver class

  Driver configuration

    config: {
      host: 'localhost',
      port: 5432,
      user: 'db_user',
      password: 'db_password',
      database: 'db_name',
      storage: 'redis'
    }

  @class PostgreSQL
  @extends Driver
  @constructor
  @param {object} app Application instance
  @param {object} config Driver configuration
 */

function PostgreSQL(config) {

  var self = this;

  config = protos.extend({
    host: 'localhost',
    port: 5432
  }, config);
  
  this.className = this.constructor.name;
  
  this.config = config;
  
  // Set client
  this.client = new Client(config);

  // Connect client
  this.client.connect();

  // Assign storage
  if (typeof config.storage == 'string') {
    this.storage = app.getResource('storages/' + config.storage);
  } else if (config.storage instanceof protos.lib.storage) {
    this.storage = config.storage;
  }
  
  // Set db
  this.db = config.database;
      
  // Only set important properties enumerable
  protos.util.onlySetEnumerable(this, ['className', 'db']);
  
}

util.inherits(PostgreSQL, protos.lib.driver);

/**
  Queries rows from a table

  Example:
  
    postgres.query({
      sql: 'SELECT * FROM table WHERE id=$1 AND user=$2',
      params: [id, user],
      appendSql: ''
    }, function(err, results, info) {
      console.log([err, results, info]);
    });

  @param {object} o
  @param {function} callback
*/

PostgreSQL.prototype.query = function(o, callback) {
  var self = this;
  var args,
      sql = o.sql || '',
      params = o.params || [],
      appendSql = o.appendSql || '';
  
  if (!util.isArray(params)) params = [params];
  
  this.client.query({
    text: (sql + " " + appendSql).trim(),
    values: params
  }, function(err, results) {
    if (err) callback.call(self, null);
    else callback.call(self, null, results.rows, results);
  });
}

/**
  Executes a query that is not expected to provide any results

  Example:

    postgres.exec({
      sql: 'SHOW TABLES',
    }, function(err, info) {
      console.log([err, info]);
    });

  @param {object} o
  @param {function} callback
*/

PostgreSQL.prototype.exec = function(o, callback) {
  var args, 
      self = this,
      sql = o.sql || '',
      params = o.params || [];
  
  if (!util.isArray(params)) params = [params];
  
  this.client.query({
    text: sql,
    values: params
  }, function(err, results) {
    if (err) callback.call(self, err);
    else callback.call(self, null, results);
  });
}

/**
  Queries rows when condition is satisfied

  Example:

    postgres.queryWhere({
      condition: 'id=$1',
      params: [1],
      table: 'users'
    }, function(err, results, info) {
      console.log([err, results, info]);
    });

  @param {object} o
  @param {function} callback
 */

PostgreSQL.prototype.queryWhere = function(o, callback) {
  var args, 
      self = this,
      condition = o.condition || '',
      params = o.params || [],
      table = o.table || '',
      columns = o.columns || '*',
      appendSql = o.appendSql || '';

  if (!util.isArray(params)) params = [params];
  
  var sql = util.format('SELECT %s FROM %s WHERE %s %s', columns, table, condition, appendSql).trim();
  
  this.client.query({
    text: sql,
    values: params
  }, function(err, results) {
    if (err) callback.call(self, err);
    else callback.call(self, null, results.rows, results);
  });
}

/**
  Queries fields by ID

  Example:

    postgres.queryById({
      id: [1,3],
      table: 'users'
    }, function(err, results, fields) {
      console.log([err, results, fields]);
    });
  
  @param {object} o
  @param {function} callback
 */

PostgreSQL.prototype.queryById = function(o, callback) {
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

    postgres.insertInto({
      table: 'users',
      values: ['username', 'password']
    }, function(err, info) {
      console.log([err, info]);
    });

  @param {object} o
  @param {function} callback
 */
 
PostgreSQL.prototype.insertInto = function(o, callback) {
  var self = this;
  var sql, args, params, query,
      table = o.table || '',
      values = o.values || [];
  
  if (values instanceof Array) {
    params = values;
    sql = util.format("INSERT INTO %s VALUES(%s) RETURNING id", table, createInsertParams(params));
  } else {
    params = _.values(values);
    sql = util.format("INSERT INTO %s(%s) VALUES(%s) RETURNING id", table, Object.keys(values), createInsertParams(params));
  }
  
  // console.exit(sql);
  
  this.client.query({
    text: sql,
    values: params
  }, function(err, results) {
    if (err) callback.call(self, err);
    else callback.call(self, null, results.rows[0].id, results);
  });
}

/**
  Deletes records by ID

  Example:

    postgres.deleteById({
      id: 4,
      table: 'users'
    }, function(err, info) {
      console.log([err, info]);
    });

  @param {object} o
  @param {function} callback
  */

PostgreSQL.prototype.deleteById = function(o, callback) {
  var args,
      id = o.id,
      table = o.table || '',
      appendSql = o.appendSql || '';
  
  if (typeof id == 'number') id = [id];
  
  args = [{
    condition: util.format("id IN (%s)", id.toString()),
    table: table,
    appendSql: appendSql
  }, callback]
  
  this.deleteWhere.apply(this, args);
}

/**
  Deletes rows where condition is satisfied
  
  Example:

    postgres.deleteWhere({
      condition: 'id=$1',
      params: [5],
      table: 'users'
    }, function(err, info) {
      console.log([err, info]);
    });

  @param {object} o
  @param {function} callback
 */

PostgreSQL.prototype.deleteWhere = function(o, callback) {
  var self = this;
  var args, 
      condition = o.condition || '',
      params = o.params || [],
      table = o.table || '',
      appendSql = o.appendSql || '';
      
  if (!util.isArray(params)) params = [params];
  
  var sql = util.format('DELETE FROM %s WHERE %s %s', table, condition, appendSql);

  this.client.query({
    text: sql,
    values: params
  }, function(err, results) {
    if (err) callback.call(self, err);
    else callback.call(self, null, results);
  });
}

/**
  Updates records by ID
  
  Example:

    postgres.updateById({
      id: 1,
      table: 'users',
      values: {user: 'ernie'}
    }, function(err, info) {
      console.log([err, info]);
    });

  @param {object} o
  @param {function} callback
 */

PostgreSQL.prototype.updateById = function(o, callback) {
  var args,
      id = o.id,
      table = o.table || '',
      values = o.values || {},
      appendSql = o.appendSql || '';
  
  if (typeof id == 'number') id = [id];
  
  args = [{
    condition: util.format("id IN (%s)", id.toString()),
    table: table,
    values: values,
    appendSql: appendSql
  }, callback]
  
  this.updateWhere.apply(this, args);
}

/**
  Updates rows where condition is satisfied
  
  Example:

    postgres.updateWhere({
      condition: 'id=$1',
      params: [1],
      table: 'users',
      values: {user: 'ernie'}
    }, function(err, info) {
      console.log([err, info]);
    });
  
  @param {object} o
  @param {function} callback
 */

PostgreSQL.prototype.updateWhere = function(o, callback) {
  var self = this;
  var args,query, 
      condition = o.condition || '',
      params = o.params || [],
      table = o.table || '',
      values = o.values || {},
      appendSql = o.appendSql || '';
      
  if (!util.isArray(params)) params = [params];
  
  query = util.format("UPDATE %s SET ", table);
  
  query += createInsertParams(values);
  
  var vals = _.values(values);

  for (var i=1, len=params.length, vl=vals.length; i <= len; i++) {
    condition = condition.replace('$'+i, '$'+(i+vl));
  }
  
  query += util.format(" WHERE %s %s", condition, appendSql);
  
  this.client.query({
    text: query,
    values: vals.concat(params)
  }, function(err, results) {
    if (err) callback.call(self, err);
    else callback.call(self, null, results);
  });
}

function createInsertParams(values) {
  var out = [];
  if (values instanceof Array) {
    for (var i=1,val,len=values.length; i <= len; i++) {
      out.push('$' + i);
    }
  } else {
    i = 1;
    for (var key in values) {
      out.push(util.format('%s=$%d', key, i));
      i++;
    }
  }
  return out.join(', ');
}

// Model methods. See lib/driver.js for Model API docs

PostgreSQL.prototype.__modelMethods = {
  
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
  
  get: function(o, fields, callback) {
    
    var single, self = this;
    
    if (callback == null) {
      callback = fields;
      fields = null;
    } else if (fields instanceof Array) {
      if (fields.indexOf('id') === -1) {
        fields.unshift('id'); // Ensure ID is included in query
      }
      fields = fields.join(', ');
    }
    
    if (typeof o == 'number') { 
      
      // If `o` is number: Convert to object
      o = {id: o};
      single = true;

    } else if (util.isArray(o)) {
      
      // If `o` is an array of params, process args recursively using multi
      var arr = o;
      var multi = this.multi();
      
      for (var i=0; i < arr.length; i++) {
        multi.get(arr[i], fields);
      }
      
      return multi.exec(function(err, results) {
        results = results.filter(function(val) {
          return val; // Filter null values
        });
        callback.call(self, err, results);
      });
      
    } else if (typeof o == 'object') {
      
      // IF `o` is object: Validate without checking required fields
      this.propertyCheck(o);
      
    } else {
      
      return callback.call(self, new Error(util.format("%s: Wrong value for `o` argument", this.className)), null);
      
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
      return callback.call(self, new Error(util.format("%s: Empty arguments", this.className)));
    } else {
      var len;
      condition = [];
      for (i=0,len=keys.length; i < len; i++) {
        condition.push(util.format('%s=$%d', keys[i], (i+1)));
      }
      condition = condition.join(' AND ');
    }
    
    // Get model data & return generated model (if found)
    this.driver.queryWhere({
      condition: condition,
      columns: fields || undefined,
      params: values,
      table: this.context,
    }, function(err, results) {
      if (err) {
        callback.call(self, err, null);
      } else {
        if (results.length === 0) {
          callback.call(self, null, single ? null : []);
        } else if (single) {
          callback.call(self, null, self.createModel(results[0]));
        } else {
          for (var models=[],i=0; i < results.length; i++) {
            models.push(self.createModel(results[i]));
          }
          callback.call(self, null, models);
        }
      }
    });
  },
  
  /* Model API save */
  
  save: function(o, callback) {
    var id, self = this;
    
    // Get id, and prepare update data
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
        table: this.context
      }, function(err, results) {
        callback.call(self, err);
      });
      
    } else {
      
      callback.call(self, new Error(util.format("%s: Wrong value for `id` parameter", this.className)));
      
    }

  }
  
}

module.exports = PostgreSQL;
