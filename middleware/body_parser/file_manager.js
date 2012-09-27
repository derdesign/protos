  
/* File Manager */

var app = protos.app,
    _ = require('underscore'),
    fs = require('fs'),
    slice = Array.prototype.slice;
    
function FileManager(files) {
  
  this.__defineGetter__('length', function() {
    return this.fileKeys.length;
  });
  
  this.__defineGetter__('fileKeys', function() {
    return Object.keys(this.files);
  });
  
  Object.defineProperty(this, 'defaults', {
    value: {
      maxFilesize: app.body_parser.config.maxUploadSize,
      mimeTypes: [],
      noEmptyFiles: true
    },
    writable: true,
    enumerable: false,
    configurable: false
  });
  
  // Removed files
  Object.defineProperty(this, 'removed', {
    value: [],
    writable: true,
    enumerable: false,
    configurable: false
  });
  
  // Instance files
  Object.defineProperty(this, 'files', {
    value: protos.extend({}, files),
    writable: true,
    enumerable: false,
    configurable: false
  });

}

/**
  Expects files to match arguments. Other files not matching the ones listed in the expect arguments, 
  will be removed silently, logging any errors encountered removing the files.
  
  Any files that are not expected will be automatically removed as a security measure.
  
  @param {string} *files
  @returns {boolean} whether or not the expected conditions/files are satisfied
  @public
 */

FileManager.prototype.expect = function(defs) {
  
  var log = function(err) {
   if (err) (app.errorLog || app.log)(err);
  }
  
  // Iterate over each definition
  for (var file in defs) {

    // Requires an object
    var opts = defs[file];
    
    // Set maxfilesize
    if (!opts.maxFilesize && this.defaults.maxFilesize) {
      opts.maxFilesize = this.defaults.maxFilesize;
    }

    // Set mimetype
    if (typeof opts.type == 'string') {
      opts.type = [opts.type].concat(this.defaults.mimeTypes);
    } else if (opts.type instanceof Array) {
      opts.type = _.unique(opts.type.concat(this.defaults.mimeTypes));
    } else {
      opts.type = this.defaults.mimeTypes;
    }
    
    // Process file
    if (file in this.files) {
      
      // File present in uploads

      var f = this.files[file];

      // Remove empty files if present
      if (this.defaults.noEmptyFiles) {
        if (f.size === 0) {
          this.removeFile(file);
          continue;
        }
      }
      
      // If Filesize restriction not met
      if (opts.maxFilesize && f.size > opts.maxFilesize) {
        this.removeFile(file);
        continue;
      }

      // If Mimetype restriction not met
      if (opts.type.length > 0 && opts.type.indexOf(f.type || f.mime) === -1) {
        this.removeFile(file);
        continue;
      }

    }

  }
  
  // Remove any files not in definitions
  for (file in this.files) {
    if (!(file in defs)) {
      this.removeFile(file);
    }
  }
  
  return this.files;

}

/**
  Removes a file
  
  @method removeFile
  @param {string} file
  @return {object} instance
 */

FileManager.prototype.removeFile = function(file, callback) {
  if (file in this.files) {
    this.removed.push(file);
    fs.unlink(this.files[file].path, callback || logCallback);
    delete this.files[file];
  }
  return this;
}

/**
  Sets the default maxFilesize configuration
  
  @method maxFilesize
  @param {int} size Filesize to expect in bytes
  @return {object} instance
 */

FileManager.prototype.maxFilesize = function(size) {
  this.defaults.maxFilesize = size;
  return this;
}

/* 
  Sets the filemanager configuration to allow specific mime types
  
  @method allow
  @param {str} Mime type to allow (multiple args)
  @return {object} instance;
 */

FileManager.prototype.allow = function(mime) {
  if (typeof mime == 'string') mime = [mime];
  else if (mime.constructor !== Array) {
    throw new Error("Invalid argument");
  }
  this.defaults.mimeTypes = _.unique(this.defaults.mimeTypes.concat(mime));
  return this;
}

/* 
  Sets the filemanager configuration to allow empty files
  
  @method allowEmpty
  @return {object} instance;
 */

FileManager.prototype.allowEmpty = function() {
  this.defaults.noEmptyFiles = false;
  return this;
}

/**
  Gets a specific file
  
  @method get
  @param {string} file
  @return {object} file data
  @public
 */
 
FileManager.prototype.get = function(file) {
  return this.files[file] || null;
}

/**
  Removes all files uploaded
  
  @method removeAll
  @param {function} callback Callback to pass to each fs.unlink call (optional)
  @public
 */

FileManager.prototype.removeAll = function(callback) {
  for (var file in this.files) {
    this.removeFile(file, callback);
  }
  return this;
}

/**
  Iterates over the files uploaded
  
  @method forEach
  @param {function} callback
  @public
 */

FileManager.prototype.forEach = function(callback) {
  var files = this.files;
  for (var key in files) {
    callback.call(this, key, files[key]);
  }
  return this.files;
}

function logCallback(err) {
  if (err) (app.errorLog || app.log)(err);
}

module.exports = FileManager;