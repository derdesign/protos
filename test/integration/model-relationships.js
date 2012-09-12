
var app = require('../fixtures/bootstrap');

var vows = require('vows'),
    util = require('util'),
    inflect = protos.require('./lib/support/inflect.js'),
    assert = require('assert'),
    mongodb = require('mongodb'),
    ObjectID = mongodb.ObjectID,
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;

var multi = new Multi(app.model);

var models = {};

vows.describe('Model Relationships').addBatch({
  
  'Preliminaries': {
    
    topic: function() {
      if (app.initialized) {
        return app.models;
      } else {
        var promise = new EventEmitter();
        app.on('init', function() {
          promise.emit('success', app.models);
        });
        return promise;
      }
    },
    
    "Initialized models": function(models) {
      assert.equal(Object.keys(models).length, 8);
      assert.isTrue('context' in models);
      assert.isTrue('accounts' in models);
      assert.isTrue('buddies' in models);
      assert.isTrue('companies' in models);
      assert.isTrue('groups' in models);
      assert.isTrue('users' in models);
      assert.isTrue('websites' in models);
      assert.isTrue('others' in models);
      
      // Make sure custom model is assigned properly
      assert.equal(app.othersModel.method(), 'Custom Model Data');
      
    }, 
    
    "Properly sets model methods": function(models) {
      var key, method, model = models.buddies,
          protoMethods = protos.lib.driver.prototype.__modelMethods,
          cname = inflect.camelize(model.context),
          scname = inflect.singularize(cname);
      
      for (key in protoMethods) {
        var suffix = (key.slice(-3) === 'All') ? cname : scname;
        method = key + suffix;
        assert.isTrue(method in app.model);
        assert.equal(app.model[method].toString().indexOf('model[key].apply(model, arguments);'), 22);
      }
    }
    
  }
  
}).addBatch({
  
  'Data Creation': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      multi.createCompany({
        name: 'My Company'
      });
      
      multi.createAccount({
        settings: {sky: 'blue', nodejs: 'javascript'}
      });
      
      multi.createGroup({
        name: 'My Group'
      });
      
      multi.createGroup({
        name: 'Another Group'
      });
      
      multi.createWebsite({
        name: 'Google',
        url: 'http://google.com'
      });
      
      multi.createBuddy({
        username: 'nodejs',
        password: 'javascript'
      });
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    "Successfully created test models": function(results) {
      
      if (results instanceof Array) {
        models = {
          company: results[0][0],
          account: results[1][0],
          group1: results[2][0],
          group2: results[3][0],
          website: results[4][0],
          buddy: results[5][0]
        }
      }

      assert.isFalse(results instanceof Error);
      
    }
    
  }
  
}).addBatch({
  
  'Integrity Checks': {
    
    "Company model created successfully": function() {
      var model = models.company;
      assert.equal(Object.keys(model).length, 6);
      assert.equal(model.name, 'My Company');
      assert.isNull(model.account);
      assert.isNull(model.boss);
      assert.deepEqual(model.associates, []);
      assert.isNull(model.blog);
      assert.instanceOf(model.id, ObjectID);
      assert.equal(model.className, 'CompaniesModelObject');
      assert.strictEqual(model.generator, app.companiesModel);
    },
    
    "Accounts model created successfully": function() {
      var model = models.account;
      assert.equal(Object.keys(model).length, 2);
      assert.deepEqual(model.settings, {sky: 'blue', nodejs: 'javascript'});
      assert.instanceOf(model.id, ObjectID);
      assert.equal(model.className, 'AccountsModelObject');
      assert.strictEqual(model.generator, app.accountsModel);
    },
    
    "Group models created successfully": function() {
      var g1 = models.group1,
          g2 = models.group2;
      assert.equal(Object.keys(g1).length, 3);
      assert.equal(g1.name, 'My Group');
      assert.deepEqual(g1.buddies, []);
      assert.instanceOf(g1.id, ObjectID);
      assert.equal(Object.keys(g2).length, 3);
      assert.equal(g2.name, 'Another Group');
      assert.deepEqual(g2.buddies, []);
      assert.instanceOf(g2.id, ObjectID);
      assert.equal(g1.className, 'GroupsModelObject');
      assert.equal(g2.className, 'GroupsModelObject');
      assert.strictEqual(g1.generator, app.groupsModel);
      assert.strictEqual(g2.generator, app.groupsModel);
    },
    
    "Website model created successfully": function() {
      var model = models.website;
      assert.equal(Object.keys(model).length, 4);
      assert.equal(model.name, 'Google');
      assert.equal(model.url, 'http://google.com');
      assert.isNull(model.developer);
      assert.instanceOf(model.id, ObjectID);
      assert.equal(model.className, 'WebsitesModelObject');
      assert.strictEqual(model.generator, app.websitesModel);
    },
    
    "Buddies model created successfully": function() {
      var model = models.buddy;
      assert.equal(Object.keys(model).length, 8);
      assert.equal(model.username, 'nodejs');
      assert.equal(model.password, 'javascript');
      assert.isNull(model.account);
      assert.isNull(model.profile);
      assert.deepEqual(model.groups, []);
      assert.deepEqual(model.friends, []);
      assert.instanceOf(model.id, ObjectID);
      assert.equal(model.className, 'BuddiesModelObject');
      assert.strictEqual(model.generator, app.buddiesModel);
    }
    
  }
  
}).addBatch({
  
  'Relationship Methods': {
    
    'hasOne » all methods set': function() {
      var BuddiesModelObject = models.buddy.constructor,
          CompaniesModelObject = models.company.constructor;
      
      // app.buddiesModel.hasOne = ['company', 'profile(website)'];
      ['getCompany', 'setCompany', 'removeCompany', 'deepRemoveCompany',
       'getProfile', 'setProfile', 'removeProfile', 'deepRemoveProfile'].forEach(function(method) {
        assert.isFunction(models.buddy[method]);
        assert.isFunction(BuddiesModelObject.prototype[method]);
        assert.strictEqual(models.buddy[method], BuddiesModelObject.prototype[method]);
      });
      
      // app.companiesModel.hasOne = 'blog(website)';
      ['getBlog', 'setBlog', 'removeBlog', 'deepRemoveBlog'].forEach(function(method) {
        assert.isFunction(models.company[method]);
        assert.isFunction(CompaniesModelObject.prototype[method]);
        assert.strictEqual(models.company[method], CompaniesModelObject.prototype[method]);
      });
    },
    
    "hasMany » all methods set": function() {
      var BuddiesModelObject = models.buddy.constructor,
          GroupsModelObject = models.group1.constructor;

      // app.usersModel.hasMany = ['groups', 'friends(buddies)'];
      ['addGroup', 'addGroups', 'getGroup', 'getGroups', 'removeGroup',
       'removeGroups', 'deepRemoveGroup', 'deepRemoveGroups',
       'addFriend', 'addFriends', 'getFriend', 'getFriends', 'removeFriend',
       'removeFriends', 'deepRemoveFriend', 'deepRemoveFriends',].forEach(function(method) {
        assert.isFunction(models.buddy[method]);
        assert.isFunction(BuddiesModelObject.prototype[method]);
        assert.strictEqual(models.buddy[method], BuddiesModelObject.prototype[method]);
      });
      
      // app.groupsModel.hasMany = 'buddies';
      ['addBuddy', 'addBuddies', 'getBuddy', 'getBuddies', 'removeBuddy',
       'removeBuddies', 'deepRemoveBuddy', 'deepRemoveBuddies'].forEach(function(method) {
        assert.isFunction(models.group1[method]);
        assert.isFunction(GroupsModelObject.prototype[method]);
        assert.strictEqual(models.group1[method], GroupsModelObject.prototype[method]);
      });

    },
    
    "belongsTo » all methods set": function() {
      var CompaniesModelObject = models.company.constructor,
          WebsitesModelObject = models.website.constructor,
          BuddiesModelObject = models.buddy.constructor;
      
      // app.buddiesModel.belongsTo = ['company.boss', 'website.developer'];
      // app.accountsModel.belongsTo = ['buddy.account', 'company.account'];
      
      // CompaniesModel
      ['getBoss', 'setBoss', 'removeBoss', 'deepRemoveBoss',
       'getAccount', 'setAccount', 'removeAccount', 'deepRemoveAccount'].forEach(function(method) {
        assert.isFunction(models.company[method]);
        assert.isFunction(CompaniesModelObject.prototype[method]);
        assert.strictEqual(models.company[method], CompaniesModelObject.prototype[method]);
      });
      
      // WebsitesModel
      ['getDeveloper', 'setDeveloper', 'removeDeveloper', 'deepRemoveDeveloper'].forEach(function(method) {
        assert.isFunction(models.website[method]);
        assert.isFunction(WebsitesModelObject.prototype[method]);
        assert.strictEqual(models.website[method], WebsitesModelObject.prototype[method]);
      });
      
      // BuddiesModel
      ['getAccount', 'setAccount', 'removeAccount', 'deepRemoveAccount'].forEach(function(method) {
        assert.isFunction(models.buddy[method]);
        assert.isFunction(BuddiesModelObject.prototype[method]);
        assert.strictEqual(models.buddy[method], BuddiesModelObject.prototype[method]);
      });
      
    },
    
    "belongsToMany » all methods set": function() {
      var CompaniesModelObject = models.company.constructor;
      
      // app.buddiesModelObject.belongsToMany = 'company.associates';
      ['addAssociate', 'addAssociates', 'getAssociate', 'getAssociates', 'removeAssociate',
       'removeAssociates', 'deepRemoveAssociate', 'deepRemoveAssociates'].forEach(function(method) {
        assert.isFunction(models.company[method]);
        assert.isFunction(CompaniesModelObject.prototype[method]);
        assert.strictEqual(models.company[method], CompaniesModelObject.prototype[method]);
      });
      
    }
    
  }
  
}).addBatch({
  
  'Relationship: hasOne » set{Item}': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      models.buddy.setCompany(models.company);
      models.buddy.setProfile(models.website);
      models.buddy.setAccount(models.account, function(err) {
        if (err) promise.emit('success', err);
        else {
          app.buddiesModel.get(models.buddy.id, function(err, buddy) {
            models.buddy = buddy[0];
            promise.emit('success', err || buddy[0]);
          });
        }
      });
      
      return promise;
    },
    
    "Properly sets relationship": function(buddy) {
      assert.equal(buddy.account, models.account.id.toString());
      assert.equal(buddy.company, models.company.id.toString());
      assert.equal(buddy.profile, models.website.id.toString());
      assert.strictEqual(Object.create(buddy).setAccount(99).account, '99'); // synchronous test
    }
    
  }
  
}).addBatch({

  'Relationship: hasOne » get{Item}': {

    topic: function() {
      var promise = new EventEmitter();

      models.buddy.getAccount(function(err, account) {
        promise.emit('success', err || account[0]);
      });

      return promise;
    },

    "Properly gets linked item": function(account) {
      assert.instanceOf(account, app.accountsModel.modelObjectProto.constructor);
      assert.equal(account.id.toString(), models.account.id.toString());
    }

  }

}).addBatch({
  
  'Relationship: hasOne » remove{Item}': {
    
    topic: function() {
      var promise = new EventEmitter();
      models.buddy
        .removeAccount()
        .removeCompany(function(err) {
        if (err) promise.emit('success', err);
        else {
          app.model.getBuddy(models.buddy.id, function(err, buddy) {
            models.buddy = buddy[0];
            promise.emit('success', err || buddy[0])
          });
        }
      });
      
      return promise;
    },
    
    "Properly unlinks item": function(buddy) {
      assert.instanceOf(buddy, app.buddiesModel.modelObjectProto.constructor);
      assert.isNull(buddy.company);
      assert.isNull(buddy.account); // synchronous test
    }
    
  }
  
}).addBatch({
  
  'Relationship: hasOne » deepRemove{Item}': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      models.buddy.deepRemoveProfile(function(err) {
        if (err) promise.emit('success', err);
        else {
          multi.getBuddy(models.buddy.id);
          multi.getWebsite(models.website.id); // should not be found
          multi.exec(function(err, results) {
            promise.emit('success', err || results);
          });
        }
      });
      
      return promise;
    },
    
    "Properly unlinks & removes item": function(results) {
      var buddy = results[0][0],
          profile = results[1];
      
      models.buddy = buddy;
      
      assert.instanceOf(buddy, app.buddiesModel.modelObjectProto.constructor);
      assert.isNull(buddy.profile);
      assert.deepEqual(profile, []);
    }

  }
  
}).addBatch({
  
  'Relationship: hasMany » add{Item}': {
    
    topic: function() {
      var promise = new EventEmitter();

      models.buddy
      .addGroup(models.group1)
      .addGroup(99, function(err) {
        if (err) promise.emit('success', err);
        else {
          app.buddiesModel.get(models.buddy.id, function(err, buddy) {
            models.buddy = buddy[0];
            promise.emit('success', err || buddy[0]);
          });
        }
      });

      return promise;
    },

    "Properly adds item": function(buddy) {
      assert.instanceOf(buddy, app.buddiesModel.modelObjectProto.constructor);
      assert.deepEqual(buddy.groups, [models.group1.id.toString(), 99]);
    }

  }
  
}).addBatch({
  
  'Relationship: hasMany » add{Items}': {
    
    topic: function() {
      var promise = new EventEmitter();

      models.buddy
      .addGroups([models.group2])
      .addGroups([99, 100, 101, 102], function(err) {
        if (err) promise.emit('success', err);
        else {
          app.buddiesModel.get(models.buddy.id, function(err, buddy) {
            models.buddy = buddy[0];
            promise.emit('success', err || buddy[0]);
          });
        }
      });

      return promise;
    },

    "Properly adds item(s)": function(buddy) {
      assert.instanceOf(buddy, app.buddiesModel.modelObjectProto.constructor);
      assert.deepEqual(buddy.groups, [models.group1.id.toString(), 99, models.group2.id.toString(), 100, 101, 102]);
    }

  }
  
}).addBatch({
  
  // Note: Using only 1 batch, since chaining doesn't need to be tested on method(s)
  
  'Relationship: hasMany » get{Item(s)}': {
    
    topic: function() {
      var promise = new EventEmitter();
      var multi = models.buddy.createMulti();
      
      multi.getGroup(models.group1)       // should return model object
      multi.getGroup(99);                 // should return emtpy array
      multi.getGroups();                  // should skip nulls
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      }); 
      
      return promise;
    },
    
    "Properly gets linked item(s)": function(results) {
      
      var r1 = results[0][0],
          r2 = results[1],
          r3 = results[2];

      // Single item found
      assert.instanceOf(r1, Array);
      assert.equal(r1.length, 1);
      assert.instanceOf(r1[0], app.groupsModel.modelObjectProto.constructor);
      assert.equal(r1[0].name, 'My Group');
      
      // Empty array
      
      assert.instanceOf(r2, Array);
      assert.deepEqual(r2, []);
      
      // Returns all groups, and skips nulls
      assert.instanceOf(r3, Array);
      assert.equal(r3.length, 2);
      
      // console.exit(r3);
      
      assert.instanceOf(r3[0][0], app.groupsModel.modelObjectProto.constructor);
      assert.instanceOf(r3[1][0], app.groupsModel.modelObjectProto.constructor);
      assert.instanceOf(r3[0][0].id, ObjectID);
      assert.instanceOf(r3[1][0].id, ObjectID);
      assert.equal(r3[0][0].id.toString(), models.group1.id.toString());
      assert.equal(r3[1][0].id.toString(), models.group2.id.toString());
    }
    
  }
  
}).addBatch({
  
  'Relationship: hasMany » remove{Item}': {
    
    topic: function() {
      var promise = new EventEmitter();
     
      models.buddy
        .removeGroup(models.group1)
        .removeGroup(99, function(err) {
        if (err) promise.emit('success', err);
        else {
          app.model.getBuddy(models.buddy.id, function(err, buddy) {
            models.buddy = buddy[0];
            promise.emit('success', err || buddy[0]);
          });
        }
      });
      
      return promise;
    },
    
    "Properly gets linked item": function(buddy) {
      assert.instanceOf(buddy, app.buddiesModel.modelObjectProto.constructor);
      assert.deepEqual(buddy.groups, [models.group2.id.toString(), 100, 101, 102]);
    }
    
  }
  
}).addBatch({
  
  'Relationship: hasMany » remove{Items}': {
    
    topic: function() {
      var promise = new EventEmitter();

      models.buddy
      .removeGroups([100, 101])
      .removeGroups([102], function(err) {
        if (err) promise.emit('success', err);
        else {
          app.model.getBuddy(models.buddy.id, function(err, buddy) {
            models.buddy = buddy[0];
            promise.emit('success', err || buddy[0])
          });
        }
      });

      return promise;
    },

    "Properly gets linked items": function(buddy) {
      assert.instanceOf(buddy, app.buddiesModel.modelObjectProto.constructor);
      assert.deepEqual(buddy.groups, [models.group2.id.toString()]);
    }
    
  }
  
}).addBatch({
  
  // Note: Using only 1 batch, since chaining doesn't need to be tested on method(s)
  
  'Relationship: hasMany » deepRemove{Item(s)}': {
    
    topic: function() {
      var promise = new EventEmitter();
      var multi = models.buddy.createMulti();
      
      models.buddy.addGroup(models.group1);

      multi.deepRemoveGroup(models.group1);
      multi.deepRemoveGroups([models.group2]);
      
      multi.exec(function(err, results) {
        if (err) promise.emit('success', err);
        else {
          
          app.model.getBuddy(models.buddy.id, function(err, buddy) {
            if (err) promise.emit('success', err);
            else {
              models.buddy = buddy[0];
              
              app.model.getGroup([models.group1.id, models.group2.id], function(err, groups) {
                if (err) promise.emit('success', err);
                else {
                  
                  promise.emit('success', groups);
                  
                }
              });
              
            }
          });
          
        }
      });
      
      return promise;
    },

    "Properly gets linked items": function(groups) {
      assert.deepEqual(models.buddy.groups, []);
      assert.deepEqual(groups, [[], []]); // means items were deleted from db
    }
    
  }
  
}).export(module);
