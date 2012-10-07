
/* Extensions to the JavaScript Objects */

// Allow console to print & inspect data, then exit
console.exit = function(msg) {
  if (typeof msg == 'string') console.log(msg);
  else console.dir(msg);
  process.exit();
}

/* 
  Override RegExp.prototype.test to prevent undesired effects when
  calling the method on regexps using the 'g' flag.
  
  By default, testing with the 'g' flag will update the lastIndex property
  of the regular expression object, which prevents it from being cached,
  as it would provide unexpected results if using .test again.
  
  The method override below will only affect the .test() method when calling
  against a regular expression with the 'g' flag. Other regexes with other
  flags will work with the original method.
  
 */

RegExp.prototype.__test__ = RegExp.prototype.test;

RegExp.prototype.test = function() {
  
  // Only affect global regexes
  if (this.global) {
    
    // Create a cache for regex objects as long as they
    // have the same content and flags
    if (typeof this.__reCache__ == 'undefined') {
      Object.defineProperty(this, '__reCache__', {
        value: {},
        enumerable: false,
        writable: true,
        configurable: false
      });
    }
    
    var reStr = this.toString(),      // Regular expression as string
        re = this.__reCache__[reStr]; // Regular expression instance (from cache)
        
    // If cache is not set, generate
    if (!re) {
      var parts = reStr.split('/').slice(1);
      var flags = parts.pop().replace('g', '');
      re = this.__reCache__[reStr] = new this.constructor(parts.join('/'), flags);
    }
    
    // Recursively call .test(), this time with the 
    // copy (and cached) regular expression, without the 'g' flag
    return re.test.apply(re, arguments);

  } else {

    // For regexes without the 'g' flag, operate normally
    return this.__test__.apply(this, arguments);

  }

}
