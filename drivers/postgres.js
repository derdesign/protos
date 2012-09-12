
/**
  @module drivers
  @namespace driver
 */
 
var pg = protos.require('pg', "PostgreSQL Driver"),
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

function PostgreSQL(app, config) {

  var self = this;

  config = protos.extend({
    host: 'localhost',
    port: 5432
  }, config);
  
  this.className = this.constructor.name;
  this.app = app;
  
  this.config = config;
  
  // Set client
  this.client = new Client(config);

  // Connect client
  this.client.connect();

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

  @method query
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

  @method exec
  @param {object} o
  @param {function} callback
*/

PostgreSQL.prototype.exec = function(o, callback) {
  var self = this;
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

  @method queryWhere
  @param {object} o
  @param {function} callback
 */

PostgreSQL.prototype.queryWhere = function(o, callback) {
  var self = this;
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
  Queries all rows in a table
  
  Example:

    postgres.queryAll({
      columns: 'user, pass',
      table: 'users'
    }, function(err, results, info) {
      console.log([err, results, info]);
    });

  @method queryAll
  @param {object} o
  @param {function} callback
 */

PostgreSQL.prototype.queryAll = function(o, callback) {
  var self = this;
  var args, 
      self = this,
      columns = o.columns || '*',
      table = o.table || '',
      appendSql = o.appendSql || '';
  
  var sql = util.format('SELECT %s FROM %s %s', columns, table, appendSql).trim();
  
  this.client.query({
    text: sql
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
  
  @method queryById
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

  @method insertInto
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
    sql = util.format("INSERT INTO %s VALUES(%s)", table, createInsertParams(params));
  } else {
    params = _.values(values);
    sql = util.format("INSERT INTO %s(%s) VALUES(%s)", table, Object.keys(values), createInsertParams(params));
  }
  
  // console.exit(sql);
  
  this.client.query({
    text: sql,
    values: params
  }, function(err, results) {
    if (err) callback.call(self, err);
    else callback.call(self, null, results.rows, results);
  });
}

function createInsertParams(values) {
  var out = [];
  for (var i=1,val,len=values.length; i <= len; i++) {
    out.push('$' + i);
  }
  return out.join(', ');
}

module.exports = PostgreSQL;
