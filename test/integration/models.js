
var app = require('../fixtures/bootstrap');

// The mysql module has issues setting UTC Dates. These issues
// result in the tests within the travis environment to fail, 
// when they are really passing on other unix envs.
// 
// These tests are run locally before pushing to master, so this
// test suite is guaranteed to pass.
// 
// References: 
//  http://travis-ci.org/#!/derdesign/protos/builds/2348486
//  https://github.com/felixge/node-mysql/issues/search?q=timezone

if (app.environment == 'travis') return;

var vows = require('vows'),
    util = require('util'),
    assert = require('assert'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;

var mysql, model, table, user;

var eventObjects = {
  save: null,
  create: null,
  delete: null
}

app.usersModel.on('create', function(mod) {
  eventObjects.create = mod;
});

app.usersModel.on('before_save', function(mod) {
  eventObjects.before_save = mod;
});

app.usersModel.on('after_save', function(err, mod) {
  eventObjects.after_save = [err, mod];
});

app.usersModel.on('delete', function(err, mod) {
  eventObjects.delete = [err, mod];
});

var tdate = 1330529734000; // Wed Feb 29 2012 15:35:34 GMT
var now = new Date(1421173918131); // Tue, 13 Jan 2015 18:31:28 GMT

vows.describe('Models').addBatch({

  'Preliminaries': {

    topic: function() {
      var promise = new EventEmitter();
      app.onInitialize(function() {
        promise.emit('success', app.models.users);
      });
      return promise;
    },

    'Initialized test model': function(topic) {
      model = topic;
      table = app.config.drivers.mysql.table;
      model.context = table;
      mysql = model.driver;
      
      assert.isTrue(model instanceof protos.lib.model);
      assert.equal(model.className, 'UsersModel');
      assert.isTrue(model.driver instanceof protos.lib.driver);
    },
    
    'Alternate shortcut set for models (app.xxxModel)': function() {
      assert.strictEqual(app.accountsModel, app.models.accounts);
      assert.strictEqual(app.buddiesModel, app.models.buddies);
      assert.strictEqual(app.companiesModel, app.models.companies);
      assert.strictEqual(app.groupsModel, app.models.groups);
      assert.strictEqual(app.testModel, app.models.test);
      assert.strictEqual(app.usersModel, app.models.users);
      assert.strictEqual(app.websitesModel, app.models.websites);
    },
    
    
    'Alternate shortcut set for drivers (app.xxxDriver)': function() {
      assert.strictEqual(app.accountsModel.driver, app.accountsDriver);
      assert.strictEqual(app.buddiesModel.driver, app.buddiesDriver);
      assert.strictEqual(app.companiesModel.driver, app.companiesDriver);
      assert.strictEqual(app.groupsModel.driver, app.groupsDriver);
      assert.strictEqual(app.testModel.driver, app.testDriver);
      assert.strictEqual(app.usersModel.driver, app.usersDriver);
      assert.strictEqual(app.websitesModel.driver, app.websitesDriver);
    },
    
    'Model aliases are properly set': function() {
      assert.deepEqual(Object.keys(app.model).sort(), [
        'addAccount',
        'addBuddy',
        'addCompany',
        'addGroup',
        'addMyCustomContext',
        'addTest',
        'addUser',
        'addWebsite',
        'createAccount',
        'createBuddy',
        'createCompany',
        'createGroup',
        'createMyCustomContext',
        'createTest',
        'createUser',
        'createWebsite',
        'deleteAccount',
        'deleteAccounts',
        'deleteBuddies',
        'deleteBuddy',
        'deleteCompanies',
        'deleteCompany',
        'deleteGroup',
        'deleteGroups',
        'deleteMyCustomContext',
        'deleteMyCustomContexts',
        'deleteTest',
        'deleteTests',
        'deleteUser',
        'deleteUsers',
        'deleteWebsite',
        'deleteWebsites',
        'destroyAccount',
        'destroyAccounts',
        'destroyBuddies',
        'destroyBuddy',
        'destroyCompanies',
        'destroyCompany',
        'destroyGroup',
        'destroyGroups',
        'destroyMyCustomContext',
        'destroyMyCustomContexts',
        'destroyTest',
        'destroyTests',
        'destroyUser',
        'destroyUsers',
        'destroyWebsite',
        'destroyWebsites',
        'findAccount',
        'findAccounts',
        'findBuddies',
        'findBuddy',
        'findCompanies',
        'findCompany',
        'findGroup',
        'findGroups',
        'findMyCustomContext',
        'findMyCustomContexts',
        'findTest',
        'findTests',
        'findUser',
        'findUsers',
        'findWebsite',
        'findWebsites',
        'getAccount',
        'getAccounts',
        'getBuddies',
        'getBuddy',
        'getCompanies',
        'getCompany',
        'getGroup',
        'getGroups',
        'getMyCustomContext',
        'getMyCustomContexts',
        'getTest',
        'getTests',
        'getUser',
        'getUsers',
        'getWebsite',
        'getWebsites',
        'insertAccount',
        'insertBuddy',
        'insertCompany',
        'insertGroup',
        'insertMyCustomContext',
        'insertTest',
        'insertUser',
        'insertWebsite',
        'newAccount',
        'newBuddy',
        'newCompany',
        'newGroup',
        'newMyCustomContext',
        'newTest',
        'newUser',
        'newWebsite',
        'saveAccount',
        'saveBuddy',
        'saveCompany',
        'saveGroup',
        'saveMyCustomContext',
        'saveTest',
        'saveUser',
        'saveWebsite',
        'updateAccount',
        'updateBuddy',
        'updateCompany',
        'updateGroup',
        'updateMyCustomContext',
        'updateTest',
        'updateUser',
        'updateWebsite'
      ]);
    },
    
    'Allows context override': function() {
      assert.equal(app.contextModel.context, 'my_custom_context');
    },
    
    'Driver is assigned by reference': function() {
      assert.strictEqual(app.accountsModel.driver, app.buddiesModel.driver);
      assert.strictEqual(app.accountsModel.driver, app.companiesModel.driver);
      assert.strictEqual(app.accountsModel.driver, app.contextModel.driver);
      assert.strictEqual(app.accountsModel.driver, app.groupsModel.driver);
      assert.strictEqual(app.accountsModel.driver, app.websitesModel.driver);
    },
    
    'Prototype methods are preserved': function() {
      assert.isFalse(app.usersModel.hasOwnProperty('alpha'));
      assert.isFalse(app.usersModel.hasOwnProperty('beta'));
      assert.strictEqual(app.usersModel.alpha, protos.noop);
      assert.strictEqual(app.usersModel.beta, protos.noop);
      assert.strictEqual(app.usersModel.constructor.prototype.alpha, protos.noop);
      assert.strictEqual(app.usersModel.constructor.prototype.beta, protos.noop);
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
        friends INT,\n\
        valid BOOLEAN,\n\
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n\
        object TEXT,\n\
        array TEXT,\n\
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

  'Model::getValidationFor': {
    
    topic: function() {
      return app.testModel;
    },
    
    'Throws if property does not exist': function(m) {
      try {
        m.getValidationFor('hello');
      } catch(e) {
        assert.equal(e.toString(), "Error: TestModel: property 'hello' does not exist");
      }
    },
    
    'Throws if validation not defined for property': function(m) {
      try {
        m.getValidationFor('notdef');
      } catch(e) {
        assert.equal(e.toString(), "Error: TestModel: validation not defined for 'notdef' property");
      }
    },
    
    'Throws if validation data type invalid': function(m) {
      try {
        m.getValidationFor('invdtype');
      } catch(e) {
        assert.equal(e.toString(), "Error: TestModel: invalid validation data type for 'invdtype' property");
      }
    },
    
    'Returns app regex when not specified in validation': function(m) {
      assert.strictEqual(m.getValidationFor('appregex'), app.regex.password);
    },
    
    'Returns overridden regex when specified in this.validation': function(m) {
      assert.instanceOf(m.overridden, RegExp);
      assert.strictEqual(m.getValidationFor('override'), m.overridden);
    },
    
    'Returns expected values for valid parameters': function(m) {
      
      assert.instanceOf(m.getValidationFor('regex'), RegExp);
      assert.strictEqual(m.getValidationFor('regex'), m.regex);
      
      assert.instanceOf(m.getValidationFor('custom'), RegExp);
      assert.strictEqual(m.getValidationFor('custom'), m.custom_regex);
      
      assert.instanceOf(m.getValidationFor('func'), Function);
      assert.strictEqual(m.getValidationFor('func'), m.func);

    }
    
  }
  
}).addBatch({
  
  'Model::insert': {
    
    topic: function() {
      var promise = new EventEmitter(),
          multi = model.multi();
      
      multi.insert({
        user: 'ernie',
        pass: 'abc123'
      });
      
      multi.exec(function(err, results) {
        promise.emit('success', err);
      });
      
      return promise;
    },
    
    'Properly inserts objects': function(topic) {
      assert.isNull(topic);
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
      model.insert({
        user: 'ernie',
        pass: 'abc1234',
        friends: 'BAD VALUE'
      }, function(err, user) {
        promise.emit('success', err || user);
      });
      
      return promise;
    },
    
    "Should throw an error if field can't validate": function(topic) {
      assert.instanceOf(topic, Error);
      assert.equal(topic.toString(), "Error: UsersModel: Unable to validate 'friends': BAD VALUE");
    }
    
  }
  
}).addBatch({
  
  'Model::insert » required field missing': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      // An error should be thrown if required file is missing
      model.insert({user: 'ernie'}, function(err, user) {
        promise.emit('success', err || user);
      });
      
      return promise;
    },
    
    "Should throw an error if required field is missing": function(topic) {
      assert.instanceOf(topic, Error);
      assert.equal(topic.toString(), "Error: UsersModel: 'pass' is required");
    }
    
  }
  
}).addBatch({

  'Model::new': {

    topic: function() {
      var promise = new EventEmitter();

      model.new({
        user: 'node', 
        pass: 'javascript', 
        friends: 1024,
        valid: false,
        date: now, // epoch
        object: {apple: 'green', banana: 'yellow', number: 33, array: [1,2,3]},
        array: [1,2,3]
      }, function(err, instance) {
        user = instance;
        promise.emit('success', err || user);
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
      // assert.strictEqual(user.id, 2);
      // console.log(user);
      assert.strictEqual(user.user, 'node');
      assert.strictEqual(user.pass, 'javascript');
      assert.strictEqual(user.friends, 1024);
      assert.strictEqual(user.valid, false);
      assert.instanceOf(user.date, Date);
      assert.equal(user.date.toGMTString(), now.toGMTString());
      assert.deepEqual(user.object, {apple: 'green', banana: 'yellow', number: 33, array: [1,2,3]});
      assert.deepEqual(user.array, [1,2,3]);
      assert.equal(Object.keys(user).length, 8);
    }

  }

}).addBatch({
  
  'ModelObject::save': {

    topic: function() {
      var promise = new EventEmitter();

      user.user = 'NODE';
      user.friends++;
      user.valid = !user.valid;
      user.date = new Date(tdate); 
      user.object.apple = 'GREEN';
      user.object.newval = 'NEW';
      user.object.number--;
      user.object.array.push(24);
      user.array.pop();
      user.array.push(99);
      
      // ################### QUERY CACHING TESTS [MODEL OBJECTS] #####################
      
      user.queryCached({
        cacheInvalidate: 'users_cache',
      }, 'save', function(err) {
        if (err) promise.emit('success', err);
        else {
          model.get({user: 'NODE'}, function(err, m) {
            user = m[0];
            promise.emit('success');
          });
        }
      });
      
      // ################### QUERY CACHING TESTS [MODEL OBJECTS] #####################
      
      return promise;
    },

    'Properly syncs data into the database': function() {
      // assert.strictEqual(user.id, 2);
      assert.strictEqual(user.user, 'NODE');
      assert.strictEqual(user.pass, 'javascript');
      assert.strictEqual(user.friends, 1025);
      assert.strictEqual(user.valid, true);
      assert.instanceOf(user.date, Date);
      assert.equal(user.date.toGMTString(), new Date(tdate).toGMTString());
      assert.deepEqual(user.object, {apple: 'GREEN', banana: 'yellow', number: 32, array: [1,2,3,24], newval: 'NEW'});
      assert.deepEqual(user.array, [1,2,99]);
      assert.equal(Object.keys(user).length, 8);
    }

  }
  
}).addBatch({
  
  'ModelObject::delete': {

    topic: function() {
      var promise = new EventEmitter();
      
      user.delete(function(err) {
        promise.emit('success', err);
      });

      return promise;
    },

    'Properly removes data from the database': function(m) {
      assert.isNull(m);
    }

  }
  
}).addBatch({

  'Model Validation': {
    
    'When field not required, null is valid': function() {
      
      var err1 = app.testModel.validateProperties({
        intval: null,
        intval_req: 99
      });
      
      var err2 = app.testModel.validateProperties({
        intval: undefined,
        intval_req: null
      });

      assert.isNull(err1);
      
      assert.equal(err2.toString(), "Error: TestModel: Unable to validate 'intval_req': null");

    }
    
  }
  
}).addBatch({
  
  'Model Events': {
    
    "Emits the 'create' event": function() {
      var mod = eventObjects.create;
      assert.isNotNull(mod);
      assert.equal(mod.constructor.name, 'ModelObject');
      assert.equal(mod.user, 'NODE');
    },
    
    "Emits the 'before_save' event": function() {
      var mod = eventObjects.before_save;
      assert.isNotNull(mod);
      assert.equal(mod.constructor.name, 'ModelObject');
      assert.equal(mod.user, 'NODE');
    },
    
    "Emits the 'after_save' event": function() {
      var args = eventObjects.after_save;
      var err = args[0];
      var mod = args[1];
      assert.isNull(err);
      assert.isNotNull(mod);
      assert.equal(mod.constructor.name, 'ModelObject');
      assert.equal(mod.user, 'NODE');
    },
    
    "Emits the 'delete' event": function() {
      var args = eventObjects.delete;
      var err = args[0];
      var mod = args[1];
      assert.isNull(err);
      assert.isNotNull(mod);
      assert.equal(mod.constructor.name, 'ModelObject');
      assert.equal(mod.user, 'NODE');
    },
    
  }
  
}).export(module);