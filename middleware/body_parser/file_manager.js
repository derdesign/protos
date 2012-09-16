
/* File Manager */

var app = protos.app,
    fs = require('fs'),
    slice = Array.prototype.slice;
    
function FileManager(files) {
  
  this.__defineGetter__('length', function() {
    return this.fileKeys.length;
  });
  
  this.__defineGetter__('fileKeys', function() {
    return Object.keys(this.files);
  });
  
  // Instance files
  Object.defineProperty(this, 'files', {
    value: protos.extend({}, files),
    writable: true,
    enumerable: false,
    configurable: true
  });
  
}

/**
  Expects files to match arguments. Other files not matching the
  ones listed in the expect arguments, will be removed silently,
  logging any errors encountered removing the files.
  
  You can define specific conditions for every file:
  
    a) 'filename': Expecting 'filename'. It's ok if it doens't exist.
    
    b) '*filename': File should be present. If the condition is not satisfied, the upload
       becomes invalid and all uploaded files are removed.
    
    c) '**filename': File should be present and it should not be empty. If the condition
       is not satisfied, the upload becomes invalid and all uploaded files are removed.

  Examples:
  
    if ( fm.expect('fileA', 'fileB', '*fileC', '**fileD') ) {
      fm.forEach(function(file) {
       res.json(file);
      });
    } else {
      res.end('400 Bad Request');
    }
  
  Any files that are not expected will be automatically removed as a security measure.
  
  @param {string} *files
  @returns {boolean} whether or not the expected conditions/files are satisfied
  @public
 */

FileManager.prototype.expect = function() {
  var expected = slice.call(arguments, 0);
  
  if (expected.length === 0) return true;
  
  var files = this.files,
      emptyCheck = {},
      skip = [];
      
  // Detect which files to skip
  for (var file, o, max=expected.length, i=0; i < max; i++) {
    file = expected[i];
    
    if (typeof file == 'object') {
      o = file;
      file = o.name;
      if (o.notEmpty) {
        file = '**' + file;
      } else if (o.required) {
        file = '*' + file;
      }
    }
    
    if (file.charAt(0) == '*' ) {
      // File is required, don't accept uploaded files
      file = file.slice(1);
      
      // Also check if file is not empty
      if (file.charAt(0) == '*') {
        file = file.slice(1);
        emptyCheck[file] = true;
      }
      
      if (! (file in files) ) {
        this.removeAll();       // Invalidate upload, remove any uploaded files
        return false;           // Exit function, Fail: file not present
      } else if (emptyCheck[file] && files[file].size === 0) {
        this.removeAll();       // Invalidate upload, remove any uploaded files
        return false;           // Exit function, Fail: file is empty
      } else {
        skip.push(file);        // Skip file from removal
      }
    } else {
      // File is optional
      if (file in files) {
        skip.push(file);        // Skip file from removal
      }
    }
  }
  
  // Logging function, reports any issues encountered removing files
  var log = function(err) {
    if (err) app.log(err);
  }
  
  // Remove any files not in skip
  for (file in files) {
    if (skip.indexOf(file) >= 0) continue;
    else {
      fs.unlink(files[file].path, log);
      delete files[file];
    }
  }
  
  return true; // success
  
}

/**
  Gets a specific file
  
  @param {string} file
  @return {object} file data
  @public
 */
 
FileManager.prototype.get = function(file) {
  return this.files[file];
}

/**
  Removes any empty files that have been uploaded
  
  @public
 */

FileManager.prototype.removeEmpty = function() {
  var files = this.files;
  
  var log = function(err) {
    if (err) app.log(err);
  }
  
  for (var file in files) {
    if (files[file].size === 0) {
      fs.unlink(files[file].path, log);
      delete files[file];
    }
  }
  
  return this;
}

/**
  Removes all files uploaded
  
  @public
 */

FileManager.prototype.removeAll = function() {
  var files = this.files;
  
  var log = function(err) {
    if (err) app.log(err);
  }
  
  for (var file in files) {
    fs.unlink(files[file].path, log);
    delete files[file];
  }
  
  return this;
}

/**
  Iterates over the files uploaded
  
  @param {function} callback
  @public
 */

FileManager.prototype.forEach = function(callback) {
  var files = this.files;
  for (var key in files) {
    callback.call(this, files[key]);
  }
}

module.exports = FileManager;