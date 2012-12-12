
var app =require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    util = require('util');

vows.describe('lib/validator.js').addBatch({
  
  '': {
    
    topic: function() {
      
      // Tested:
      // --------------------------
      // Regex validation keys
      // Callback as message
      // Callback as validator
      // Message strings
      // Using %s in message strings
      // Default messages
      
      var validator = app.validator({cleanup: true})
      .add({first: /^John Doe$/, last: 'alpha_spaces'}, function(val) { return "cb:error -> " + val;})
      .add({email: 'email'}, "The email is invalid: %s") 
      .add([{msg: 'alpha'}])  // array arg test for [add]
      .addOptional({some: function(val) { return /^[a-z]$/.test(val); }})
      .addOptional([{count: 'integer'}, "Not an integer value"]); // array arg test for [addOptional]
      
      return validator;
      
    },
    
    'Properly validates objects': function(validator) {
      
      // Prints missing required fields on empty object
      assert.equal(validator.validate({}), validator.i18n.missingRequiredFields);

      // Fails to validate only one key when more are required (even if it matches)
      assert.equal(validator.validate({first: "John Doe"}), validator.i18n.missingRequiredFields);

      // Returns error msg when value is not validated
      assert.equal(validator.validate({first: "Jane Doe"}), "cb:error -> Jane Doe");

      // Returns error msg replacing placeholders (%s)
      assert.equal(validator.validate({email: 'invalid.email'}), "The email is invalid: invalid.email");
      
      // Optional validation rules errors & default error
      assert.equal(validator.validate({some: 99}), util.format(validator.i18n.invalidField, 99));
      
      // Regular error message
      assert.equal(validator.validate({count: 'abc123'}), "Not an integer value");
      
      // Validates required values only
      assert.isNull(validator.validate({
        first: "John Doe",
        last: "Jane Doe",
        email: '1@2.com',
        msg: "MyMessage"
      }));
      
      // Fails to validate if a required value is missing
      assert.equal(validator.validate({
        first: "John Doe",
        last: "Jane Doe",
        // email: '1@2.com',
        msg: "MyMessage"
      }), validator.i18n.missingRequiredFields);
      
      // Fails to validate an optional value
      assert.equal(validator.validate({
        first: "John Doe",
        last: "Jane Doe",
        email: '1@2.com',
        msg: "MyMessage",
        some: 99
      }), util.format(validator.i18n.invalidField, 99));
      
      ////////////////
      
      // NOTE: The validator automatically trims the values
      
      var fields = {
        first: "                       John Doe                  ",
        last: "Jane Doe",
        email: '1@2.com            ',
        msg: "            MyMessage",
        some: 'c',
        count: 101,
        extra1: 102,
        extra2: 103,
        extra3: 104
      };
      
      // Validates all values
      assert.isNull(validator.validate(fields));
      
      // Removes unwanted options from validation when {cleanup: true}
      // NOTE: the altered object should have trimmed values
      
      assert.deepEqual(fields, {
        first: "John Doe",
        last: "Jane Doe",
        email: '1@2.com',
        msg: "MyMessage",
        some: 'c',
        count: 101,
      });
      
      ////////////////

      validator = app.validator({cleanup: false}).add({number: 'integer'});

      fields = {
        number: true,
        hello: "world",
        other: null
      };

      // Prints validation error 
      assert.equal(validator.validate(fields), util.format(validator.i18n.invalidField, true));
      
      // Object is not altered on validation failure
      assert.deepEqual(fields, {
        number: true,
        hello: "world",
        other: null
      });
      
      ////////////////
      
      fields.number = 99;
      
      // Object is altered on validation success
      assert.isNull(validator.validate(fields));
      assert.deepEqual(fields, {
        number: 99,
        hello: "world",
        other: null
      });
      
      ////////////////

      validator = app.validator()
        .addOptional({tag: 'alpha'});

      // Doesn't return errors on optional values
      assert.isNull(validator.validate({}));

      ////////////////

      validator = app.validator()
        .add({name: 'alpha'})
        .addOptional({tag: 'alpha'});

      // Returns errors if required values missing
      assert.equal(validator.validate({}), "Missing Required Fields");
      
      fields = {
        name: 'ernie',
        tag: ''
      }
      
      // Accepts empty optional values
      assert.isNull(validator.validate(fields));
      
      assert.deepEqual(fields, {
        name: 'ernie',
        tag: null
      });
      
      ////////////////
      
      validator = app.validator()
        .add({name: 'alpha'}, function() {});
        
      // Returns invalid message when validator function doesn't return
      assert.equal(validator.validate({name: '1234'}), 'Invalid: 1234');
      
    }
    
  },
  
  'Properly applies filters': function() {
    
    var validator = app.validator()
      .add({name: 'alpha'})
      .add({age: 'integer'})
      .add({some: 'anything'})
      .filter({
        name: function(val) {
          return new Buffer(val).toString('base64')
        },
        age: function(val) {
          return app.md5(val.toString());
        }
      })
      .postFilter({
        age: function(md5) {
          return md5.toUpperCase();
        }
      });
      
    var fields = {
      name: 'Ernie',
      age: 29,
      some: '--UNCHANGED--'
    }
    
    validator.validate(fields);
    
    var expected = { 
      name: 'RXJuaWU=',                             // Affected by base64 filter
      age: '6EA9AB1BAA0EFB9E19094440C317E21B',      // Affected by md5 filter and the post filter
      some: '--UNCHANGED--'                         // Remains unchanged (no filter)
    }
    
    assert.deepEqual(fields, expected);
    
  }
  
}).export(module);
