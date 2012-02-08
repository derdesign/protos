
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    util = require('util'),
    assert = require('assert'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;

var mysql, model, table, user;

vows.describe('Models').addBatch({

  'Preliminaries': {

    topic: function() {
      if (app.initialized) return app.models.users;
      else {
        var promise = new EventEmitter();
        app.on('init', function() {
          promise.emit('success', app.models.users);
        });
        return promise;
      }
    },

    'Initialized test model': function(topic) {
      model = topic;
      table = app.config.database.mysql.table;
      model.context = table;
      mysql = model.driver;
      
      assert.isTrue(model instanceof framework.lib.model);
      assert.equal(model.className, 'UsersModel');
      assert.isTrue(model.driver instanceof framework.lib.driver)
      assert.equal(model.driver.className, 'MySQL');
    }

  }

}).addBatch({
  
  'Initial model data': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      var multi = mysql.multi();
      
      var createTable = util.format('\
      CREATE TABLE %s (\n\
        id INTEGER AUTO_INCREMENT NOT NULL,\n\
        user VARCHAR(255),\n\
        pass VARCHAR(255),\n\
        status VARCHAR(255),\n\
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n\
        PRIMARY KEY (id)\n\
      )', table);
      
      multi.__exec({sql: 'DROP TABLE IF EXISTS ' + table});
      multi.__exec({sql: createTable});
      multi.__exec({sql: 'DESCRIBE ' + table});
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    }, 
    
    'Added sample model data': function(results) {
      var r1 = results[0],
          r2 = results[1],
          r3 = results[2];
      // If there were no errors, then results should not be null
      assert.isNotNull(r1);
      assert.isNotNull(r2);
      assert.isNotNull(r3);
    }
    
  }
  
}).addBatch({
  
  'Model::insert': {
    
    topic: function() {
      var promise = new EventEmitter(),
          multi = model.multi();
      
      multi.insert({user: 'ernie', pass: 'abcde12345', 'status': 'enabled'});
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'Properly inserts objects': function(topic) {
      assert.deepEqual(topic, [1]);
    }
    
  }
  
}).addBatch({
  
  'Model::insert » validation failure': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      // An error should be thrown if data fails to validate according to built-in validation
      model.insert({user: 'ernie', pass: '1'}, function(err, user) {
        promise.emit('success', err || user);
      });
      
      return promise;
    },
    
    "Should throw an error if field can't validate": function(topic) {
      assert.instanceOf(topic, Error);
      assert.equal(topic.toString(), "Error: UsersModel: Unable to validate 'pass': 1");
    }
    
  }
  
}).addBatch({
  
  'Model::insert » validation failure (custom validation)': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      // An error should be thrown if data fails to validate according to custom validation
      model.insert({user: 'ernie', pass: 'abcde12345', 'status': 'blah'}, function(err, user) {
        promise.emit('success', err || user);
      });
      
      return promise;
    },
    
    "Should throw an error if field can't validate": function(topic) {
      assert.instanceOf(topic, Error);
      assert.equal(topic.toString(), "Error: UsersModel: Unable to validate 'status': blah");
    }
    
  }
  
}).addBatch({
  
  'Model::insert » required field missing': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      // An error should be thrown if required file is missing
      model.insert({user: 'ernie', pass: 'abcde12345'}, function(err, user) {
        promise.emit('success', err || user);
      });
      
      return promise;
    },
    
    "Should throw an error if required field is missing": function(topic) {
      assert.instanceOf(topic, Error);
      assert.equal(topic.toString(), "Error: UsersModel: 'status' is required");
    }
    
  }
  
}).addBatch({

  'Model::new': {

    topic: function() {
      var promise = new EventEmitter();

      model.new({user: 'node', pass: 'javascript', status: 'enabled'}, function(err, instance) {
        user = instance;
        promise.emit('success', err || instance);
      });

      return promise;
    },

    'Returns instances of ModelObject': function(user) {
      assert.equal(user.constructor.name, 'ModelObject');
    },
    
    'Generator is properly registered on instance': function(user) {
      assert.equal(user.generator.className, model.className);
    },
    
    'Properly typecasts instance properties': function(user) {
      assert.typeOf(user.id, 'number');
      assert.instanceOf(user.date, Date);
    }

  }

}).addBatch({
  
  'ModelObject::save': {

    topic: function() {
      var promise = new EventEmitter();

      user.pass = 'new-password';
      user.status = 'onhold';
      
      user.save(function(err) {
        if (err) promise.emit('success', err);
        else {
          model.get({user: 'node'}, function(err, m) {
            user = m;
            promise.emit('success', err || m);
          });
        }
      })

      return promise;
    },

    'Properly syncs data into the database': function(m) {
      assert.equal(m.pass, 'new-password');
      assert.equal(m.status, 'onhold');
    }

  }
  
}).addBatch({
  
  'ModelObject::delete': {

    topic: function() {
      var promise = new EventEmitter();

      user.delete(function(err) {
        if (err) promise.emit('success', err);
        else {
          model.get({user: 'node'}, function(err, m) {
            promise.emit('success', err || m);
          });
        }
      });

      return promise;
    },

    'Properly removes data from the database': function(m) {
      assert.isNull(m);
    }

  }  
  
}).addBatch({
  
  'Cleanup': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      mysql.exec({sql: 'DROP TABLE IF EXISTS ' + table}, function(err) {
        promise.emit('success', err);
      });
      
      return promise;
    },
    
    'Removed test data': function(err) {
      assert.isNull(err);
    }
    
  }
  
}).export(module);