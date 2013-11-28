
/* lib/model.js */

var app = protos.app;
var _ = require('underscore'),
    _s = require('underscore.string'),
    util = require('util'),
    inflect = protos.inflect,
    slice = Array.prototype.slice,
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;

/**
  Model class
  
  @class Model
  @constructor
 */

function Model() {

}

util.inherits(Model, EventEmitter);

/**
  Defines model properties
  
  @type object
  @default null
 */

Model.prototype.properties = null;

/**
  Defines local model validation rules
  
  @type object
 */

Model.prototype.validation = {
  timestamp: function(date) {
    // Validates timestamps against native JavaScript `Date`
    if (date instanceof Date) return date;
    else {
      var time = Date.parse(date);
      return (typeof time == 'number' && time >= 0);
    }
  }
}

/**
  Prepares the model and its low level configuration
  
  @private
  @param {object} app
 */

Model.prototype.prepare = function(app) {
  
  var name, validation, self = this;
  
  var Ctor = this.constructor;
  
  Object.defineProperty(this, 'app', {
    value: app,
    writable: true,
    enumerable: false,
    configurable: false
  });
  
  name = this.driver = (this.driver || app.config.drivers.default);
  
  // Get driver
  if (typeof this.driver == 'string') {
    this.driver = app.getResource('drivers/' + this.driver);
  } else if (! this.driver instanceof protos.lib.driver) {
    throw new Error(util.format("Driver config not found: '%s'", name));
  }

  // Extend validation
  validation = _.extend({}, this.constructor.prototype.validation);
  this.validation = _.extend(validation, this.validation || {});    

  // Make sure validation regexes are valid
  for (var r in this.validation) {
    var re = this.validation[r];
    if (re instanceof RegExp) {
      
      re = this.validation[r].toString();
      
      if (!protos.regex.validRegex.test(re)) {
        throw new Error(util.format("Bad regular expression in %s.validation['%s']: %s\n\n\
Protos doesn't allow this because this regex can lead to unexpected results\n\
when validating model properties with this type of regular expression.\n\n\
Adding the start (^) and end ($) delimiters is required to make sure the validation\n\
performed for the model properties is accurate.\n", this.constructor.name, r, re));
      }
    }
  }

  // Default properties
  this.__defaultProperties = {};
  
  // Linked properties (usually called foreign keys)
  this.__linkedProperties = [];
  
  // Set classname
  this.className = this.constructor.name;
  
  // Set context. Use context from model or classname
  if (typeof this.context == 'undefined') {
    this.context = getContext(this.className);
  }
  
  // ModelObject prototype (used by `setRelationships`)
  this.modelObjectProto = new (createModelObject.call(this));
  
  // Extend ModelObject prototype with Constructor's .methods property
  if (Ctor.methods && typeof Ctor.methods == 'object') {
    _.extend(this.modelObjectProto, Ctor.methods);
  }
  
  // Get defaults from this.properties
  var key, prop;
  for (key in this.properties) {
    prop = this.properties[key];
    if ('default' in prop) {
      this.__defaultProperties[key] = prop.default;
    }
  }
  
  // Set defaultProperties to null if none found
  if (Object.keys(this.__defaultProperties).length === 0) this.__defaultProperties = null;
  
  // Connect driver with self
  this.driver.provideTo(this);
  
  protos.util.onlySetEnumerable(this, ['className']);
  
}

/**
  Typecasts an object based on its defined property types
  
  @private
  @param {object} o
 */

Model.prototype.typecast = function(o) {
  
  var properties = this.properties,
      invalidData = 'Invalid Data';
  
  for (var key in o) {

    var val = o[key];
    
    if (key == 'id') {
      // If it's the ID key and it's a string, convert to integer
      if (typeof val == 'string') {
        o[key] = parseInt(val, 10);
        continue;
      }
    } else if (key != '_id' && !(key in properties) ) {
      // Any keys not belonging to MongoDB's ID or not in property spec, delete
      delete o[key];
      continue;
    }
    
    // Do not typecast if it`s not a string
    if (properties[key] == null) continue;

    var type = properties[key].type;
    
    // Type coercions
    // Defined in property `type` definitions
    
    switch (type) {
      case 'string':
        if (val === '' && this.__linkedProperties.indexOf(key) >= 0) {
          o[key] = null;
        } 
        break;
      
      case 'integer':
        o[key] = parseInt(val, 10);
        break;
        
      case 'boolean':
        if (typeof val != 'boolean') {
          if (typeof val == 'string') {
            val = val.trim().toLowerCase();
            o[key] = (val === 'true' || val === '1');
          } else if (typeof val == 'number') {
            o[key] = (val === 1);
          } else {
            o[key] = new Error(invalidData);
          }
        }
        break;

      case 'timestamp':
        if (typeof val == 'string') {
          var date = new Date(val.trim());
          if (isNaN(date)) {
            o[key] = new Error(invalidData);
          } else {
            o[key] = date;
          }
        }
        break;
    
      case 'object':
      case 'array':
        if (typeof val == 'string') {
          try {
            o[key] = JSON.parse(val);
          } catch(e) {
            app.log('%s: Unable to parse JSON data of %s: %s', this.className, key, JSON.stringify(o));
            o[key] = new Error(invalidData); // deal with it
          }
        }
        break;
      
      default: break;
      
    }
    
  }
  
}

/**
  Creates a model object
  
  @private
  @param {object} o
  @returns {array} models
 */
 
Model.prototype.createModel = function(o) {

  var ob, key, val, type,
      idFilter = this.driver.idFilter,
      descriptor = {}, 
      currentState = {},
      proto = this.modelObjectProto;
  
  // Typecast values in `o`
  this.typecast(o);
  
  // Filter id value in object
  idFilter instanceof Function && idFilter(o);
  
  // Add property descriptors
  for (key in o) {
    if (o.hasOwnProperty(key)) {
      if (key == 'id') {
        // The id property is immutable
        descriptor[key] = {value: o[key], writable: false, enumerable: true, configurable: false};
      } else {
        descriptor[key] = {value: o[key], writable: true, enumerable: true, configurable: true};
      }
    }
  }
  
  currentState = this.createCurrentState(o);
  
  // console.exit(currentState);
  
  descriptor.__currentState = {value: currentState, writable: false, enumerable: false, configurable: false}
  
  // Create ModelObject
  ob = Object.create(proto, descriptor);
  
  // Freeze oject current state
  Object.freeze(ob.__currentState);
  
  this.emit('create', ob);
  
  return ob;

}

/**
  Creates a current state object, used to detect changes in model data.
  
  @private
  @param {object} o
 */

Model.prototype.createCurrentState = function(o) {
  var key, val, type, out = {};
 
  for (key in o) {
    if (key in this.properties) {
      type = this.properties[key].type;
      if (key == 'id') continue;
      switch (type) {
        case 'string':
        case 'integer':
        case 'boolean':
          out[key] = o[key];
          break;
        case 'timestamp':
          out[key] = JSON.stringify(o[key]).slice(1,-1);
          break;
        default:
          out[key] = JSON.stringify(o[key]);
          break;
     }
   }
}
 
 // console.exit(out);
 
 return out;
}

/**
  Checks if an object contains properties found in model
  
  @private
  @param {object} o
 */
 
Model.prototype.propertyCheck = function(o) {
  
  var badProperties = [];
  var properties = this.properties;
  
  // Check if properties in `o` are valid
  // NOTE: ID is an implicit property of models, does not need to be defined in model.properties
  for (var key in o) {
    if (!properties.hasOwnProperty(key) && key !== 'id') badProperties.push(key);
  }
  
  var len = badProperties.length;
  
  if (len == 1) {
    throw new Error(util.format("%s: Property does not belong to model: '%s'",  this.className, badProperties[0]));
  } else if (len > 1) {
    throw new Error(util.format("%s: Properties do not belong to model: [%s]", this.className, badProperties.join(', ')));
  }
}

/**
  Gets a validation function for the given property

  @param {string} property
  @return {function|regex} Validation function or RegExp
 */

Model.prototype.getValidationFor = function(property) {
  if (this.properties.hasOwnProperty(property)) {
    var v = this.properties[property].validates;
    if (v) {
      if (typeof v == 'string') v = this.validation[v] || this.app.regex[v];
      if (v instanceof Function || v instanceof RegExp) {
        return v;
      } else {
        throw new Error(util.format("%s: invalid validation data type for '%s' property", this.className, property));
      }
    } else {
      throw new Error(util.format("%s: validation not defined for '%s' property", this.className, property));
    }
  } else {
    throw new Error(util.format("%s: property '%s' does not exist", this.className, property));
  }
}

/**
  Validates model properties
  
  @private
  @param {object} o
  @param {boolean} checkRequired
 */
 
Model.prototype.validateProperties = function(o, options) {
  var key, val, regex, prop, validates, required, len, err = false,
      badProperties = [],
      properties = this.properties,
      unableToValidate = "%s: Unable to validate '%s': %s";
  
  // Parse options
  options = _.extend({
    noRequired: false,
    returnErrors: true
  }, options || {});
  
  // Check properties
  this.propertyCheck(o);

  for (key in properties) {
    
    prop = properties[key];

    // Check for required property
    if (!options.noRequired && prop.required && !o.hasOwnProperty(key)) {
      err = new Error(util.format("%s: '%s' is required", this.className, key));
      if (options.returnErrors) return err; else throw err;
    }
    
    // Check if property is valid
    validates = prop.validates;
    
    if (key in o) {
      
      // Has validation field
      
      if (validates) {
        
        val = o[key];

        if (!prop.required) {
          switch (val) {
            case null:
            case undefined:
              o[key] = null;
              continue;
            case '':
              continue;
          }
        }
        
        if (validates instanceof RegExp) {
          // Regex validation
          if (! validates.test(val)) {
            err = new Error(util.format(unableToValidate, this.className, key, val));
            if (options.returnErrors) return err; else throw err;
          }
        } else if (typeof validates == 'string') {
          regex = this.validation[validates] || app.regex[validates];
          if (regex instanceof RegExp) {
            // Regexp alias validation
            if (! regex.test(val)) {
              err = new Error(util.format(unableToValidate, this.className, key, val));
              if (options.returnErrors) return err; else throw err;
            }
          } else if (regex instanceof Function) {
            // Function validation
            if (!regex(val)) {
              err = new Error(util.format(unableToValidate, this.className, key, val));
              if (options.returnErrors) return err; else throw err;
            }
          } else {
            // Regex can't be found
            err = new Error(util.format("%s: Can't find regex: '%s'", this.className, validates));
            if (options.returnErrors) return err; else throw err;
          }
        } else {
          // Wrong validation data provided
          validates = (validates === null) ? 'null' : validates.toString();
          err = new Error(util.format("%s: Wrong validation data for '%s': %s", this.className, key, validates));
          if (options.returnErrors) return err; else throw err;
        }

      }

    }

  }
  
  if (options.returnErrors) return null;
  
}

/**
  Sets default options to object, before inserting
  
  @private
  @param {object} data
 */
 
Model.prototype.setDefaults = function(data) {
  var key, defval, propType, 
      defaults = this.__defaultProperties;
      
  if (defaults) {
    for (key in defaults) {
      
      // Property type
      propType = this.properties[key].type;
      
      if (! (key in data)) {
        
        defval = defaults[key];
        
        if (defval instanceof Function) {
          // Default callbacks receive data as input, just
          // in case the default depends on the data provided.
          data[key] = defval(data);
        } else if (propType == 'array') {
          // Array defaults (json)
          if (defval && defval instanceof Array) {
            data[key] = JSON.stringify(defval);
          } else {
            app.log(util.format("%s: Invalid default value for %s property '%s': %s", 
              this.className, propType, key, defval));
          }
        } else if (propType == 'object') {
          // Object defaults (json)
          if (defval && defval.constructor === Object) {
            data[key] = JSON.stringify(defval);
          } else {
            app.log(util.format("%s: Invalid default value for %s property '%s': %s", 
              this.className, propType, key, defval));
          }
        } else {
          data[key] = defval;
        }

      }
    }
  }
  
  // console.exit(data);
  
}

/** 
  Converts custom model types to JSON

  @private
  @param {object} data
 */

Model.prototype.convertTypes = function(o) {
 var key, val, type;
 for (key in o) {
   val = o[key];
   type = (this.properties[key] && this.properties[key].type);
   switch (type) {
     case 'object':
     case 'array':
        o[key] = JSON.stringify(val);
        break;
     case 'timestamp':
        break;
     default: break;
   }
 }
}

/**
  Multi support.
  
  @private
  @param {object} context
  @param {object} config
 */
 
Model.prototype.multi = function(config) {
  return new Multi(this, config);
}

/**
  Provides caching capabilities. Alias of `Driver::queryCached`
 */
 
Model.prototype.queryCached = function(cdata) {
  var args = slice.call(arguments, 0);
  cdata.storage = this.driver.storage;
  this.driver.queryCached.apply(this, args);
}


/*
  Creates the ModelObject class
  
  @private
  @return {function} ModelObject
 */

function createModelObject() {
  var key, method,
      self = this,
      generator = this;
  
  /**
    Model Object Class. Generated by the Model.
  
    @private
    @class ModelObject
    @constructor
   */
  
  function ModelObject() {
    this.className = generator.className + 'Object';
  }
  
  /**
    Model Generator
   */

  ModelObject.prototype.generator = this;
  
  var gen = this;
  
  
  /**
    Get Changed Values

    @returns {object} Object with the fields updated
   */
 
  ModelObject.prototype.getUpdatedFields = function() {
    var diff = 0,
        update = {},
        currentState = gen.createCurrentState(this),
        origState = this.__currentState;
    for (var key in currentState) {
      if (currentState[key] !== origState[key]) {
        update[key] = currentState[key];
        diff++;
      }
    }
    return (diff > 0) ? update : null;
  }
  
  /**
    Save model data
  
    Provides [err]
  
    @param {function} callback
   */
  
  ModelObject.prototype.save = function(callback) {
    
    var self = this;
    
    // Emit before_save event
    generator.emit('before_save', self);
    
    // Get updated fields after the before_save event
    var update = this.getUpdatedFields();
    
    // No changes
    if (update == null) { 
      callback.call(self, null); 
      return; 
    }
    
    update.id = this.id;
    
    // Perform driver save.
    // NOTE: data is validated by the model
    generator.save(update, function(err) {
      generator.emit('after_save', err, self);
      callback.call(self, err);
    });
  }
  
  /**
    Alias of `ModelObject::save`
  
    @method update
   */
  
  ModelObject.prototype.update = ModelObject.prototype.save; // alias
  
  /**
    Alias of `ModelObject::save`
   */

  ModelObject.prototype.sync = ModelObject.prototype.save; // alias
  
  /**
    Delete model data
  
    Provides: [err]
  
    @param {function} callback
   */
  
  ModelObject.prototype.delete = function(callback) {
    var self = this;
    var generator = this.generator;
    generator.delete(this.id, function(err) {
      generator.emit('delete', err, self);
      callback.call(self, err);
    });
  }
  
  /**
    Alias of `ModelObject::delete`
   */
  
  ModelObject.prototype.remove = ModelObject.prototype.delete; // alias
  
  /**
    Alias of `ModelObject::delete`
   */
 
  ModelObject.prototype.destroy = ModelObject.prototype.delete; // alias

  /**
    Creates a Multi object
  
    @private
    @param {object} options Multi Configuration
   */
  
  ModelObject.prototype.createMulti = function(options) {
    return new Multi(this, options);
  }
  
  /**
    Provides caching capabilities. Alias of `Driver::queryCached`
   */
 
  ModelObject.prototype.queryCached = function(cdata) {
    var args = slice.call(arguments, 0),
        driver = this.generator.driver;
    cdata.storage = driver.storage;
    driver.queryCached.apply(this, args);
  }
  
  return ModelObject;
  
}

/*
  Returns the model context, analogous to the table, collection, etc.
  
  @private
  @param {string} string
  @returns {string} context
 */

function getContext(string) {
  return _s.dasherize(string)
  .slice(1)
  .replace(/-/g,'_')
  .replace(/_model$/, '');
}

module.exports = Model;
