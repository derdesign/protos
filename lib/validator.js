
/* Protos Validator */

var util = require('util');

/**
  Validator class
  
  @public
  @constructor
  @class Validator
 */

function Validator() {
  
  this.totalRules = 0;
  this.rules = {};
  this.messages = {};
  this.optional = [];

  Object.defineProperty(this, 'app', {
    value: protos.app,
    writable: true,
    enumerable: false,
    configurable: false
  });

}

/**
  @public
  @property i18n
 */

Validator.prototype.i18n = {
  invalidField: "Invalid: %s",
  missingRequiredFields: "Missing Required Fields"
}

/**
  Adds a validation rule to the validator instance
  
  Example:
  
    validator.add({first: 'alpha', last: 'alpha'}, "Invalid value: %s");
  
  @method add
  @param {object} ob Object containing key/(regex|alias|function)
  @return {object} instance
 */

Validator.prototype.add = function(ob, msg) {
  return addRule.call(this, ob, msg);
}

/**
  Adds an optional validation rule to the validator instance
  
  Example:
  
    validator.addOptional({first: 'alpha', last: 'alpha'}, "Invalid value: %s");
  
  @method addOptional
  @param {object} ob Object containing key/(regex|alias|function)
  @return {object} instance
 */

Validator.prototype.addOptional= function(ob, msg) {
  return addRule.call(this, ob, msg, true);
}

/**
  Validates the fields passed and returns an error on failure

  If successfull, null is returned and the passed object is
  sanitized, containing only the expected keys/values.
  
  Example:
  
    var err = validator.validate({
      first: "John",
      last: "Doe"
    });
    
  You can also pass an optional callback, passing [err]:
  
    validator.validate(fields, function(err) {
      if (err) doThis();
      else doThat();
    });
    
  @method validate
  @param {object} ob Object containing the keys/values to validate
  @param {function} optional callback function
  @return {object} instance
 */

Validator.prototype.validate = function(fields, callback) {
  
  var err, val, 
      count = 0,
      rules = this.rules,
      optkeys = this.optional,
      messages = this.messages;
  
  for (var key in rules) {
    if (key in fields) {
      // If key available, validate
      val = fields[key];
      if (val) {
        // Validate value
        if (rules[key](val)) {
          // Value is valid, continue
          continue;
        } else {
          // Valid is not valid, send error
          return messages[key](val);
        }
      } else {
        // Value is empty, send required fields error
        return this.i18n.missingRequiredFields;
      }
    } else if (optkeys.indexOf(key) >= 0) {
      // If key is optional, skip
      continue;
    } else {
      // Key is required, send required fields error
      return this.i18n.missingRequiredFields;
    }
  }
  
  // Remove keys that are not expected
  for (key in fields) {
    if (!(key in rules)) delete fields[key];
  }
  
  // Return success
  return null;
  
}

function addRule(ob, msg, optional) {
  
  // Runs in validator context
  
  var msgCallback, key, validator;
  
  // Set default msg if not set
  if (typeof msg == 'undefined') msg = this.i18n.invalidField;
  
  // Set validation callback
  if (msg instanceof Function) {
    msgCallback = msg;
  } else if (typeof msg == 'string' || msg instanceof String) {
    msgCallback = (function(message) {
      return function(val) {
        return message.replace('%s', val);
      }
    })(msg)
  } else {
    throw new Error(util.format("Validator: Invalid message: %s", msg));
  }
  
  // Set validation rules
  for (key in ob) {
    
    // Set optional key
    if (optional) this.optional.push(key);

    // Set validation message
    this.messages[key] = msgCallback;

    // Set validation rules
    validator = ob[key];
    if (validator instanceof RegExp) { // Regex validator
      
      this.rules[key] = (function(re) {
        return function(str) {
          return re.test(str);
        }
      })(validator);
      
    } else if (validator instanceof Function) { // Function validator
      
      this.rules[key] = validator;
      
    } else if (typeof validator == 'string') { // Regex Alias validator
      
      var regex = this.app.regex[validator];
      if (regex instanceof RegExp) {
        this.rules[key] = (function(re) {
          return function(str) {
            return re.test(str);
          }
        })(regex);
      } else {
        throw new Error(util.format("Validator: RegExp alias not found: app.regex['%s']", validator));
      }
      
    }
    
  }
  
  return this;

}

module.exports = Validator;
