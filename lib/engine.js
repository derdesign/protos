
/* lib/engine.js */

var app = protos.app;
var _ = require('underscore'),
    fs = require('fs'),
    pathModule = require('path'),
    isArray = require('util').isArray;

var startWs = /^\s+/,
    endWs = /\s+$/;

/**
  Engine class
  
  @class Engine
  @constructor
 */

function Engine() {

}

/**
  Engine`s compilation options
  
  @private
  @type object
  @default {}
 */

Engine.prototype.options = {};

/**
  Node module of the template engine
  
  @private
  @type object
  @default null
 */

Engine.prototype.module = null;

/**
  Whether or not this is an asynchronous template engine
  
  @private
  @type boolean
  @default false
 */
  
Engine.prototype.async = false;

/**
  Whether or not the template engine allows multiple parts (header/content/footer)
  
  @private
  @type boolean
  @default true
 */

Engine.prototype.multiPart = true;

/**
  Extensions to register for the template engine
  
  @private
  @type array
  @default []
 */

Engine.prototype.extensions = [];

/**
  Used for partials caching purposes
  
  @private
  @type object
  @default {}
 */

Engine.prototype.cache = {};


/**
  Gets a cached rendering function

  Wrapper for `_getCachedFunction` (internal function)

  @param {object} args
  @return {function} Cached function (if available). Null otherwise.
*/

Engine.prototype.getCachedFunction = function(args) {
  if (app.viewCaching) {
    return _getCachedFunction.apply(this, args);
  } else {
    return null;
  }
}

/** 
  Caches a rendering function
  
  Wrapper for `_cacheFunction` (internal function)

  @param {function} func
  @param {object} args
*/

Engine.prototype.cacheFunction = function(func, args) {
 if (!app.viewCaching) return;
 var argsArray = [func].concat(Array.prototype.slice.call(args, 0));
 _cacheFunction.apply(this, argsArray);
}

/**
  Runs a template function with arguments

  Wrapper for `_eval` (internal function)

  @param {function} func
  @param {object} args
  @param {boolean} addPartials
  @return {string} rendered view buffer
*/

Engine.prototype.evaluate = function(func, args, addPartials) {
  var argsArray = [func].concat(Array.prototype.slice.call(args, 0));
  if (addPartials === true) argsArray.push(true);
  return _eval.apply(this, argsArray);
}

/**
  Gets the template engine from extension

  @param {string} file
  @returns {object} engine
*/

Engine.prototype.getEngineByExtension = function(file) {
  if (typeof file == 'undefined') return null;
  file = pathModule.basename(file); // Prevent conflicts with apps containing dots in their names
  var ext = pathModule.basename(file).slice(file.indexOf('.') + 1);
  return app.enginesByExtension[ext];
}

/**
  Renders a view partial (function)

  @param {string} path
  @return {function}
*/

Engine.prototype.renderPartial = function(path) {
  var data = fs.readFileSync(path, 'utf-8'),
      func = this.render(data, null, app.relPath(path, app.mvcpath + 'views'));
  if (typeof func == 'function') {
    func.engine = this.className;
    func.async = this.async;
  }
  return func;
}

/**
  Returns a cached partial or generates/caches a new one
  
  @param {function} func
  @return {function}
 */

Engine.prototype.makePartialAsync = function(func) {
  var cachedPartial = this.cache[func.id];
  if (cachedPartial instanceof Function) return cachedPartial;
  else {
    return _makePartialAsync.call(this, func, this.asyncPartial(func), this.syncPartial(func));
  }
}

/**
  Generates an async partial from an async template engine.
  
  This serves a default for engines that expect [err, buffer]
  
  If the async template engine does not expect the parameters
  outlined below, then these methods should be overridden:
  
      callback(null, output);
  
  @param {function} func
  @returns {function}
 */
 
Engine.prototype.asyncPartial = function(func) {
 return func; // Accepts err, buffer
}

/**
  Generates an asynchronous partial from a synchronous template engine.
  
  This serves a default for engines that expect [err, buffer]
  
  If the async template engine does not expect the parameters
  outlined below, then these methods should be overridden:
  
      callback(null, output);
  
  @param {function} func
  @returns {function}
 */

Engine.prototype.syncPartial = function(func) {
 return function(arg, callback) {
   callback(null, func(arg));
 }
}

/**
  Returns available view partials
  
  This method should be overridden if the view engine has specific partial requirements.
  
  @returns {object}
 */

Engine.prototype.returnPartials = function() {
  return app.views.partials;
}

/**
  Returns the start/end whitespace of a template
  
  @private
  @param {string} data
  @return {array} Array containing [start, end] values
 */
 
Engine.prototype.getBoundaryWhitespace = function(data) {
  var sw = data.match(startWs),
      ew = data.match(endWs);
  sw = (sw && sw[0]) || '';
  ew = (ew && ew[0]) || '';
  return [sw, ew];
}

/*
  Makes functions asynchronous, following a specific pattern

  @private
  @param {string} data
  @param {object} vars
  @param {string} relPath
  return {function}
*/

function _makePartialAsync(func, asyncFn, syncFn) {
  // Return from cache
  var cached = this.cache[func.id];
  if (typeof cached == 'function') return cached;

  if (func.async) {
    // Async function
    return this.cache[func.relPath] = asyncFn;
  } else {
    // Sync function
    return this.cache[func.relPath] = syncFn;
  }
}

/* 
  Gets a view from the cache

  @private
  @param {function} func
  @param {string} data
  @param {object} vars
  @param {string} relPath
  @return {function} Function, or null
*/

function _getCachedFunction(data, vars, relPath) {
  var func;
  if (app.viewCaching) {
      func = app.views.callbacks[relPath];
      if (func instanceof Function) { return func; }
      else { return null; }
  } else { return null; }
}

/* 
  Caches a function into the view cache

  @private
  @param {function} func
  @param {string} data
  @param {object} vars
  @param {string} relPath
*/

function _cacheFunction(func, data, vars, relPath) {
  func.engine = this.className;
  if (vars) app.views.callbacks[relPath] = func;
}

/*
  Renders the evaluated template buffer.

  If there`s an error, an exception will be returned otherwise.

  @private
  @param {function} func
  @param {string} data
  @param {object} vars
  @param {string} relPath
  @return {function}
*/

function _eval(func, data, vars, relPath, partial) {
  /*jshint noempty: false */
  if (vars) {
    
    var appPartials = app.views.partials, 
        async = this.async,
        partials;
    
    // Add partials as helpers for all engines
    for (var f in appPartials) {
      if (async) {
        // Async engines need to make the helpers compatible with their asynchronous model
        vars[f] = this.makePartialAsync(appPartials[f]);
      } else {
        f = appPartials[f];
        if (f.async) {
          // Ignore async partials for sync engines
          // app.debug('Ignoring ' + f.id + ' partial on ' + vars.res.engine.constructor.name + ' engine (not asynchronous)');
        } else {
          // Sync engines only support sync partials
          vars[f.id] = f;
        }
      }
    }
    
    // Rendering a template
    var res = vars.res;
    
    try {
      if (res.engine.async) {
        // Render asynchronous template
        func(vars, function(err, buffer) {
          if (buffer && buffer instanceof String) buffer = buffer.toString();
          res.emit('__async_template_done', err || buffer);
        });
      } else {
        // Render normal template
        if (typeof func == 'function') {
          // Specify extra partial arguments for the engines that need it
          if (partial) {
            // call rendering function with partials
            var args = this.returnPartials();
            if (isArray(args)) {
              return func.apply(null, [vars].concat(args));
            } else {
              return func(vars, args);
            }
            
          } else {
            // call rendering function normally
            return func(vars); 
          }
        } else {
          return func;
        }
      }
    } catch (e) {
      return e;
    }
  } else {
    // Rendering a partial, just return the function
    return func;
  }
}

module.exports = Engine;
