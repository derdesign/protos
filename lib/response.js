
/**
  @module lib
  @namespace http
 */
 
/**
  @private
  @class OutgoingMessage
  @constructor
 */

var _ = require('underscore'),
    http = require('http'),
    pathModule = require('path'),
    util = require('util'),
    fs = require('fs'),
    slice = Array.prototype.slice,
    stringify = JSON.stringify,
    searchPattern = protos.util.searchPattern,
    OutgoingMessage = http.OutgoingMessage;

/**
  Renders the specified view

  @method render
  @param {string} view
  @param {object} data
  @param {boolean} raw
 */

var forceRaw = /^#([0-9]{3}|msg)(\.[a-z\.]+)?$/i;

// console.log(forceRaw.test('#404'));         // true
// console.log(forceRaw.test('#msg'));         // true
// console.log(forceRaw.test('#msg.html'));    // true
// console.log(forceRaw.test('#404.html'));    // true
// console.log(forceRaw.test('#404.kw.html')); // true
// console.log(forceRaw.test('#404.'));        // false
// console.log(forceRaw.test('#hello'));       // false

OutgoingMessage.prototype.render = function(view, data, raw) {

  var self = this,
      app = this.app;
      
  // Set raw if msg is either #{error}.html or #msg.html
  raw = forceRaw.test(view) || raw;
  
  // Don't render if no engines loaded
  if (app.loadedEngines.length === 0) {
    this.end('500 Internal Server Error');
    app.log(new Error("No Engines loaded. Unable to render " + this.request.url));
    return;
  }

  // Check for response_cache middleware -> get response_cache resource
  var cacheStore = (app.supports.response_cache && app.resources.response_cache.storage);

  if (cacheStore && this.cacheID != null) {
    var cb = function(err, response) {
      if (err) {
        return app.serverError(self, err);
      } else if (response == null) {
        self.__doResponseCache = true;
        asyncRender.call(self, view, data, raw);
      } else {
        self.__runtimeData = {
          views: [],
          buffer: response
        };
        app.debug("Using cached response for " + self.cacheID);
        renderViewBuffer.call(self);
      }
    }
    
    /*
      CacheIDs are stored in the `app.response_cache` object. If a cacheID
      is not present, the cache will be flushed and a new cache will be created.
      
      This allows you to invalidate caches anytime.
    */
    
    if (this.cacheID in app.response_cache) {
      // Already a fresh cache
      cacheStore.get(this.cacheID, cb);
    } else {
      // Create new cache (flush previous)
      cacheStore.delete(self.cacheID, function(err) {
        if (err) return app.serverError(self, err);
        else {
          app.debug("Refreshed cacheID for " + self.cacheID);
          app.response_cache[self.cacheID] = true;
          cacheStore.get(self.cacheID, cb);
        }
      });
    }
    
  } else {
    asyncRender.call(self, view, data, raw);
  }
}

/**
  Gets the view path

  VIEW RENDERING LOGIC

  Using a view alias or filename:

    res.render('index'); -> will render 'main/main-index.{extension}'
    res.render('hello-there.{extension}') -> will render 'main/hello-there.{extension}'

  Using a path relative to the views/ directory:

    res.render('main/index') -> will render 'main/main-index.{extension}'
    res.render('/main/index') -> will render 'main/main-index.{extension}'
    res.render('main/index.{extension}') -> will render 'main/index.{extension}'
    res.render('/hello') -> will render '/hello.{extension}' (relative to views/)
    res.render('/hello.{extension}') -> will render '/hello.{extension}' (relative to views/)

  @method getViewPath
  @param {string} view
  @return {string} Resolved view path
 */

OutgoingMessage.prototype.getViewPath = function(view) {
  var alias, app, controller, depth, dirname, file, path;
  app = this.app;
  controller = this.__controller || app.controller;
  dirname = pathModule.dirname(view);

  if (app.regex.layoutView.test(view)) {
    view = view.replace(app.regex.layoutView, '');
    path = app.mvcpath + "views/" + app.paths.layout + view;
  } else if (app.regex.restrictedView.test(view)) {
    view = view.replace(app.regex.restrictedView, '');
    path = app.mvcpath + "views/" + app.paths.restricted + view;
  } else if (!app.regex.startsWithSlash.test(view) && dirname == '.') {
    alias = controller.getAlias();
    if (app.regex.templateFile.test(view)) {
      path = app.mvcpath + "views/" + alias + "/" + view;
    } else {
      path = app.mvcpath + "views/" + alias + "/" + alias + "-" + view;
    }
  } else {
    view = view.replace(app.regex.startsWithSlash, '');
    dirname = pathModule.dirname(view);
    if (dirname == '.' || this.isStaticView) {
      path = app.mvcpath + "views/" + app.paths.static + view;
    } else {
      depth = (searchPattern(view, '/'))['/'].length;
      if (depth == 1) {
        view = view.split('/');
        path = (app.regex.templateFile.test(view[1])
        ? app.mvcpath + "views/" + view[0] + "/" + view[1]
        : app.mvcpath + "views/" + view[0] + "/" + view[0] + "-" + view[1]);
      } else {
        path = app.mvcpath + "views/" + view;
      }
    }
  }

  if (! app.regex.templateFile.test(path)) {
    path = app.views.pathAsoc[app.relPath(path)]
  }
  
  return path;

}

/**
  Renders the `app/views/__restricted/msg.html` template, passing a statusCode

  @method httpMessage
  @param {integer} statusCode (optional)
  @param {string} message
  @param {boolean} raw (optional)
 */

OutgoingMessage.prototype.httpMessage = function(statusCode, message, raw) {
  var buffer, ob, app = this.app;

  switch (typeof statusCode) {
    case 'object':
      // res.httpMessage({statusCode: 404, message: 'not found', raw: true});
      ob = statusCode;
      statusCode = ob.statusCode || 200;
      message = ob.message || null;
      raw = ob.raw
      break;
    case 'string':
      // res.httpMessage('hello');
      // res.httpMessage('hello', true);
      raw = (typeof message == 'boolean') && message;
      message = statusCode;
      statusCode = 200;
      break;
    case 'number':
      // res.httpMessage(200);
      // res.httpMessage(200, 'hello');
      // res.httpMessage(200, 'hello', true);
      if (typeof message == 'boolean') {
        raw = message;
        message = null;
      }
      break;
  }
  
  this.statusCode = statusCode;

  buffer = (message != null
  ? message
  : this.statusCode + " " + http.STATUS_CODES[this.statusCode] + "\n");

  if (this.request.isAjax || raw) {
    this.sendHeaders({'Content-Type': 'text/plain'});
    this.end(buffer, app.config.encoding);
  } else {
    this.render('#msg', {
      message: buffer.trim()
    }, app.config.rawViews);
  }

}

/**
  Redirects to a specific location, with a default HTTP Status Code of 302

  @method redirect
  @param {string} location
  @param {int} statusCode
 */

OutgoingMessage.prototype.redirect = function(location, statusCode) {
  if (this._header != null) return;
  
  this.statusCode = (statusCode || 302);

  if (! protos.regex.url.test(location) ) {
    location = this.app.url(location);
  }

  this.setHeaders({Location: location});

  if (this.__setCookie.length > 0) this.setHeader('Set-Cookie', this.__setCookie);
  
  this.sendHeaders();
  this.end();
}

/**
  Sets response headers

  @method setHeaders
  @param {object} headers
 */

OutgoingMessage.prototype.setHeaders = function(headers) {
  if (this._header != null) return; // Already sent headers
  return this.__headers = _.extend(this.__headers, headers);
}

/**
  Evaluate the dynamic headers provided by the application. The dynamic headers are functions
  that provide custom output, based on the current state of the response being returned.
  
  Dynamic headers can be found on `app.config.headers`.

  @method headerFilter
 */

OutgoingMessage.prototype.headerFilter = function() {
  if (this._header != null) return;
  var action, field;
  for (field in this.__headers) {

    // Check if header is overridden
    var ovr = (this._headers) ? this._headers[field.toLowerCase()] : void 0;

    if (typeof ovr != 'undefined') {
      this.__headers[field] = ovr;
      continue; // Skip field, already processed
    } else {
      action = this.__headers[field];
      if (typeof action == 'string') {
        this.__headers[field] = action;
      } else if (typeof action == 'function') {
        this.__headers[field] = action.call(this.app, this.request, this);
      } else {
        continue; // Skip field
      }
    }
  }
}

/**
  Sends the HTTP Headers

  @method sendHeaders
  @param {object} extraHeaders
 */

OutgoingMessage.prototype.sendHeaders = function(extraHeaders) {
  if (this._header != null) return;

  // Set extra headers
  if (extraHeaders != null && typeof extraHeaders == 'object') this.setHeaders(extraHeaders);

  this.headerFilter();
  
  if (this.__setCookie.length > 0) this.setHeader('Set-Cookie', this.__setCookie);
  
  for (var key in this.__headers) {
    this.setHeader(key, this.__headers[key]);
  }
  
  this.writeHead(this.statusCode);
}

/**
  Sends a JSON Response. This method behaves according to the configuration
  found on `app.config.json`.
  
  @method json
  @param {object} data Object containing json data
  @param {string} func Function name to use as jsoncallback
 */

OutgoingMessage.prototype.json = function(data, func) {
  var app = this.app,
      jsonConfig = app.config.json;

  this.statusCode = 200;

  this.sendHeaders({
    'Cache-Control': app.config.cacheControl.json,
    'Content-Type': jsonConfig.contentType,
    'Connection': jsonConfig.connection
  });
  
  var format = (jsonConfig.pretty) ? '  ' : null,
      json = stringify(data, jsonConfig.replacer, format);
  
  if (func && typeof func == 'string') {
    json = util.format('%s(%s)', func, json);
  }
  
  this.end(json);
}

/**
  Sets the response context.
  
  The response context is used to optimize performance, by isolating
  certain operations to a specific response context.
  
  For example, the `context` filter, allows you to modify the
  rendered response`s buffer, prior to sending it to the client.
  
  You can apply more specific filters by assigning your functions to 
  a context-specific filter. E.g.: `blog_context`.
  
  @method setContext
  @param {string} context
 */
 
OutgoingMessage.prototype.setContext = function() {
  var context = this.__context || (this.__context = []);
  for (var i=0,len=arguments.length; i < len; i++) {
    context.push(arguments[i]);
  }
}

/**
  Send an AJAX Response if it's an ajax request.
  
  It sends the message in plain text for ajax. If not, uses the #msg
  template to send the response.
  
  @method ajaxResponse
  @param {string} msg
  @public
 */

OutgoingMessage.prototype.ajaxResponse = function(msg) {
  if (this.request.isAjax) {
    this.end(msg);
  } else {
    this.httpMessage(msg);
  }
}

/* Private functions */


/*
  Reusable function that handles asynchronous rendering of templates

  @private
  @param {string} view
  @param {object} data
  @param {boolean} raw
 */

function asyncRender(view, data, raw) {
  var app = this.app,
      request = this.request;

  // Get raw option, or set default
  raw = (raw || app.config.rawViews);

  // Detect args
  if (typeof data == 'boolean') { raw = data; data = null; }
  
  // Get controller, or set default
  var controller = (this.__controller || app.controller);
  
  // Create new object with partials as prototype
  var proto = Object.create(app.views.partials);
  
  // Make app.globals available as view locals
  _.extend(proto, app.globals);
  
  if (data == null) {
    // If no data available, use proto as data
    data = proto;
  } else {
    // Set proto as data`s prototype
    data.__proto__ = proto;
  }
  
  // View Locals
  data = _.extend(data, {
    protos: protos,
    app: app,
    res: this,
    req: request,
    params: request.params,
    session: request.session || {},
    cookies: request.cookies || {},
  });
  
  // Add `locals` variable redundancy
  data.locals = this.viewLocals = data;
  
  // Add view data filter. Useful if you want to add locals
  app.emit('view_locals', data);
  
  // Get engine
  var engine = app.defaultEngine.getEngineByExtension(this.getViewPath(view));
  
  if (!engine) {
    // Using this.end to prevent infinite loops
    this.end('500 Internal Server Error');
    app.log(new Error("No engine detected for route: " + request.url));
    return;
  } else if (engine.multiPart === false) {
    // Force raw on non-multiPart engines
    raw = true;
  }
  
  // Attach engine to response
  this.engine = engine;

  // Render full layout or response
  // TODO: Ability to pass an array with the desired layout to res.render (awesome!)
  // TODO: If view is an array, ignore the `raw` option
  var views = (raw) ? [view] : ['@header', view, '@footer'];
    
  // TODO: Assign status code based on template name (validated with regex)
  if (view == '#404') this.statusCode = 404;
  else if (view == '#500') this.statusCode = 500;

  this.__runtimeData = {
    buffer: '',
    data: data,
    views: views,
    currentView: null,
    controller: controller,
    mainView: view,
  };
  
  renderViewBuffer.call(this);
}

/*
  Renders the view buffer

  @private
 */

var httpErrors = ['4', '5']; // 4xx, 5xx

function renderViewBuffer() {
  
  var buffer, codeBlock, controller, data, logData, relPath, request,
      template, view, viewBuffers, viewCaching, viewCallbacks,
      runtimeData = this.__runtimeData,
      app = this.app,
      cacheStore = (app.supports.response_cache && app.resources.response_cache.storage),
      self = this;
            
  // This block only runs when view rendering is complete
  request = this.request;
  
  // Prevent duplicate view rendering on static files
  if (request.isStatic) return delete request.isStatic;
  
  if (runtimeData.views.length === 0) {
    codeBlock = function() {
      if (this.__headers['Cache-Control'] == null) {
        var httpErr = (this.statusCode).toString().charAt(0);
        var cc = (httpErrors.indexOf(httpErr) >= 0) ? 'error' : 'dynamic';
        this.setHeaders({
          'Cache-Control': app.config.cacheControl[cc]
        });
      }
      this.sendHeaders();
      this.end(runtimeData.buffer, 'utf8');
    }
    
    // Run view filters (context event)
    applyViewFilters.call(this, runtimeData);

    if (cacheStore != null && this.__doResponseCache === true) {
      // console.log(runtimeData.buffer);
      cacheStore.set(this.cacheID, runtimeData.buffer, function(err, info) {
        if (err) {
          app.serverError(self, [err]);
        } else {
          app.debug("Cached response for " + self.cacheID);
          return codeBlock.call(self);
        }
      });
    } else {
      codeBlock.call(self);
    }
    
    return;
  }

  viewCaching = app.viewCaching;
  viewCallbacks = app.views.callbacks;
  viewBuffers = app.views.buffers;
  data = runtimeData.data;
  controller = runtimeData.controller;
  view = runtimeData.views.shift();
  
  template = this.getViewPath(view);
  
  if (typeof template == 'undefined') {
    // the specified view does not exist
    if (view) app.serverError(this, ['View does not exist: ' + controller.getAlias() + '/' + view]);
    return;
  }

  data.__filename = template;
  data.__dirname = pathModule.dirname(template);

  // Set engine for specific template
  self.engine = app.defaultEngine.getEngineByExtension(template);
  relPath = app.relPath(template, app.mvcpath.slice(1) + 'views');

  if (viewCaching) {
    if (viewCallbacks[relPath] instanceof Function) {
      try {
        buffer = viewCallbacks[relPath](data);
      } catch (e) {
        buffer = e;
      }
      if (typeof buffer == 'string') {
        app.emit('view_cache_access', app, relPath);
        runtimeData.buffer += buffer;
        renderViewBuffer.call(this);
        return;
      } else {
        app.emit('view_cache_access', app, relPath);
        logData = [relPath, buffer];
        app.serverError(this, logData);
        return;
      }
    } else if ((viewBuffers[relPath] != null) && util.isArray(viewBuffers[relPath])) {
      app.emit('view_cache_access', app, relPath);
      logData = viewBuffers[relPath];
      app.serverError(this, logData);
      return;
    }
  }
  
  fs.exists(template, function(exists) {
    if (viewCaching) app.emit('view_cache_store', app, relPath);
    if (exists) {
      fs.readFile(template, 'utf-8', function(err, templateBuffer) {
        if (err) {
          app.serverError(self, new Error(util.format('Unable to read file: %s', relPath)));
        } else {
          
          if (self.engine.async) {
            self.once('__async_template_done', function(buffer) {
              if (typeof buffer == 'string') {
                runtimeData.buffer += buffer;
                renderViewBuffer.call(self);
              } else {
                logData = [relPath, buffer];
                if (viewCaching) viewBuffers[relPath] = logData;
                app.serverError(self, logData);
              }
            });

            self.engine.render(templateBuffer, data, relPath);

          } else {
            
            buffer = self.engine.render(templateBuffer, data, relPath);
            if (typeof buffer == 'string') {
              runtimeData.buffer += buffer;
              renderViewBuffer.call(self);
            } else {
              logData = [relPath, buffer];
              if (viewCaching) viewBuffers[relPath] = logData;
              app.serverError(self, buffer);
            }

          }
        }
      });
    } else {
      app.serverError(self, new Error(util.format("The file can't be found: %s", app.relPath(template))));
    }
  });
}

/*
  Applies view filters
  
  If the response has a context set, the applied filter will have the context as the prefix.
  So, if a `blog` context is set, the filter will be `blog_context`. It's worth mentioning
  that the general `context` filter won't be applied if a context is set.
  
  You can apply the `context` filter from your context-specific filter. This allows fine
  grained control on how the content will be modified by the filters.
  
  @param {object} runtimeData
  @private
 */

function applyViewFilters(runtimeData) {
  var context, locals, app = this.app;
  var filter = 'context';
  
  // Run general context
  var buffer = app.applyFilters(filter, runtimeData.buffer, (locals = this.viewLocals) );
  
  // Run specific contexts
  if ( (context = this.__context) ) {
    for (var i=0,len=context.length; i < len; i++) {
      buffer = app.applyFilters(context[i] + '_' + filter, buffer, locals);
    }
  }
  
  runtimeData.buffer = buffer;
}
