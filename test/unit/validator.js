
var app =require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    util = require('util');

vows.describe('lib/validator.js').addBatch({
  
  'Validator Class': {
    
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
      .add({msg: 'alpha'})
      .addOptional({some: function(val) { return /^[a-z]$/.test(val); }})
      .addOptional({count: 'integer'}, "Not an integer value");
      
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
      
    }
    
  }
  
}).export(module);
