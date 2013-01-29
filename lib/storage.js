
/* lib/storage.js */

var Multi = require('multi');

/**
  Storage class. Implements the Storage API.

  @private
  @class Storage
  @constructor
 */

function Storage() {
  
}

/**
  Backend configuration
  
  @private
  @type object
 */
  
Storage.prototype.config = {};

/**
  Backend client
  
  @private
  @type object
 */
  
Storage.prototype.client = null;

/**
  Retrieves one or more records from the storage backend
  
  a) If a key is a string: provides `[err, value]`
  b) If a key is an array: provides `[err, results]`
  
  @param {string|array} key
  @param {function} callback
 */

Storage.prototype.get = function(key, callback) {
  
}

/**
  Retrieves a hash from the storage backend
  
  Provides: `[err, hash]`
  
  @param {string|array} key
  @param {function} callback
 */

Storage.prototype.getHash = function(key, callback) {
  
}

/**
  Inserts one or more records into the storage backend
  
  Provides: `[err]`
  
  Key can be either a string or an object containing key/value pairs
  
  @param {string|object} key
  @param {string} value (optional)
  @param {function} callback
 */

Storage.prototype.set = function(key, value, callback) {

}

/**
  Inserts a hash (object) into the storage backend
  
  Provides: `[err]`
  
  @param {string} key
  @param {object} hash
  @param {function} callback
 */
 
Storage.prototype.setHash = function(key, object, callback) {
  
}

/**
  Updates a hash with new values in object
  
  Provides `[err]`
  
  @param {string} key
  @param {object} object
  @param {function} callback
 */

Storage.prototype.updateHash = function(key, object, callback) {
  
}

/**
  Deletes one or more keys from a specific hash
  
  Provides `[err]`
  
  @param {string} hash
  @param {string} key
  @param {function} callback
 */

Storage.prototype.deleteFromHash = function(hash, key, callback) {}

/**
  Deletes one or more records from the storage backend
  
  Provides: `[err]`
  
  @param {string|array} key
  @param {function} callback
 */
 
Storage.prototype.delete = function(key, callback) {

}

/**
  Renames a key
  
  Provides: `[err]`
  
  @param {string} oldKey
  @param {string} newKey
 */
 
Storage.prototype.rename = function(oldkey, newkey, callback) {

}

/**
  Makes a specific key expire in a certain amount of time
  
  Provides: `[err]`
  
  @param {string} key
  @param {int} timeout
  @param {function} callback
 */
 
 Storage.prototype.expire = function(key, timeout, callback) {
   
 }
 
/**
  Increments a specific value atomically by one
  
  Provides `[err]`
  
  @param {string} key
 */
 
Storage.prototype.incr = function(key, callback) {

}

/**
  Increments a specific value atomically by value
  
  Provides `[err]`
  
  @param {string} key
 */
 
Storage.prototype.incrBy = function(key, value, callback) {

}

/**
  Decrements a specific value atomically
  
  Provides `[err]`
  
  @param {string} key
 */
 
Storage.prototype.decr = function(key, callback) {

}

/**
  Decrements a specific value atomically by value
  
  Provides `[err]`
  
  @param {string} key
 */
 
Storage.prototype.decrBy = function(key, value, callback) {

}
 
/**
   Multi wrapper. Allows execution of multiple storage operations
   
   @param {object} config
*/
  
Storage.prototype.multi = function(config) {
 return new Multi(this, config);
}

/**
  Native multi, uses the storage's internal transaction mechanisms.
  If the storage backend doesn't support native multi, storage.multi() is used instead.
 */
 
Storage.prototype.nativeMulti = function(config) {
  return this.multi(config);
}
   
module.exports = Storage;
