/*jshint immed: false */

/**
  @module lib
*/

var app;

var _ = require('underscore'),
    _s = require('underscore.string'),
    fs = require('fs'),
    slice = Array.prototype.slice,
    EventEmitter = require('events').EventEmitter;
    
var aliasRegex = {re1: /Controller$/, re2: /^-/};

/**
  Controller class
  
  @private
  @constructor
  @class Controller
 */

function Controller() {
  
}

/** 
  If set to true, the controller will integrate with the [sessions middleware](http://derdesign.github.com/protos/middleware.html#session) to
  provide a layer of authentication to the controller`s resources.

  @static
  @type boolean
  @default false
  @property authRequired 
*/
Controller.prototype.authRequired = false;

/*
  @private
  @property filters
 */
Controller.prototype.filters = {};

/*
  @protected
  @property queuedRoutes
 */
Controller.prototype.queuedRoutes = {};

/*
  @protected
  @property httpMethods
 */
Controller.prototype.httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'TRACE'];

/*
  @protected
  @property routeMethods
 */
Controller.prototype.routeMethods = [];

var httpMethods = Controller.prototype.httpMethods;

/*
  Routing functions, accept the following parameters:
  
  @param {string} route, route to add
  @param {object} arg2, route validation (optional)
  @param {object} arg3, route validation messages (optional, requires arg2)
  @param {function} arg4, callback to run if route is resolved
 */

function getRouteArgs(m, args) {
  var regex, methods = [m], funcs = [];
  
  // Note: args is the `arguments` object passed from previous function
  args = slice.call(args, 0);
  
  // Get any additional methods defined for route
  while (typeof args.slice(-1).pop() == 'string') {
    // Array.pop() alters the arguments array
    methods.push(args.pop());
  }
  
  // Generate regular expression for the route method(s)
  regex = new RegExp('^('+ methods.join('|').toUpperCase() +')$');
  
  // Get route functions
  var f, allowed = [Array, Function];
  while ((f=args.slice(-1).pop())) {
    // Array.pop() alters the arguments array
    if (allowed.indexOf(f.constructor) >= 0) funcs.unshift(args.pop());
    else break;
  }
  
  // Flatten funcs
  funcs = _.flatten(funcs);
  
  // Append route functions array
  args.push(funcs);
  
  return {args: args, regex: regex};
}

for (var i=0; i < httpMethods.length; i++) {
  (function(m) {
    routeFunction(m,  function(route, arg2, arg3, arg4) {
      // Normal routes use the controller`s authRequired value
      
      // Define route metadata array
      var o = getRouteArgs(m, arguments);
      var routeArr = [this, o.regex, this.authRequired, route];
      
      // Override first argument with route metadata array
      o.args[0] = routeArr;
      
      // Run registerRoute function with modified arguments
      registerRoute.apply(null, o.args);
    });
    
    routeFunction('public_' + m,  function(route, arg2, arg3, arg4) {
      // Note: public routes force authRequired=false
      
      // Define route metadata array
      var o = getRouteArgs(m, arguments);
      var routeArr = [this, o.regex, false, route];
      
      // Override first argument with route metadata array
      o.args[0] = routeArr;
      
      // Run registerRoute function with modified arguments
      registerRoute.apply(null, o.args);
    });
  
    routeFunction('private_' + m,  function(route, arg2, arg3, arg4) {
      // private routes force authRequired=true
      
      // Define route metadata array
      var o = getRouteArgs(m, arguments);
      var routeArr = [this, o.regex, true, route];
      
      // Override first argument with route metadata array
      o.args[0] = routeArr;
      
      // Run registerRoute function with modified arguments
      registerRoute.apply(null, o.args);
    });
    
  }).call(this, httpMethods[i].toLowerCase());
}

/**
  Prepares the controller after instantiation
  
  @private
  @method prepare
  @param {object} app
 */
 
Controller.prototype.prepare = function(instance) {
  app = instance;
  var args, i, queuedRoutes = this.queuedRoutes[app.hostname];
  for (i=0; i < queuedRoutes.length; i++) {
    registerRoute.apply(this, args);
  }
  protos.util.onlySetEnumerable(this, ['className', 'authRequired']);
}

/**
  Adds a custom authentication filter to the  controller.
  
  This method is intended to be used within controllers. It can also be run
  multiple times, to register multiple filters for the same controller.
  
  Note: The context of this method is the constructor itself, not the instance.
  This methods is passed to the constructor prior to instantiation, which is
  why this method works on the constructor`s context.
  
  @static
  @method filter
  @param {function} cb
 */
 
Controller.prototype.filter = function(cb) {
  var ctor = this.name,
      filters = Controller.prototype.filters;

  if (!filters[ctor]) filters[ctor] = [];
  
  filters[ctor].push(cb);
}

/**
  Runs authentication filters for controller
  
  @private
  @method runFilters
  @param {object} req
  @param {object} res
  @param {object} params
  @param {function} callback
 */

Controller.prototype.runFilters = function(req, res, params, callback) {
  var self = this,
      app = protos.app,
      filters = this.filters,
      fCount = filters.length;

  var chain = callback.slice(0);
  
  if (chain.length > 1) {
    req.next = function() {
      var cb = chain.shift();
      if (cb instanceof Function) cb.call(self, req, res, params);
    }
  }

  if (fCount === 0) {
    
    // No filters to run, execute callback directly
    chain.shift().call(this, req, res, params);
    
  } else {
    
    var retVal, filter, 
        i=-1, 
        promise = new EventEmitter();
    
    // Success event, emitted by filters when authentication is successful
    promise.on('success', function() {
      if (++i == fCount) {
        // No more filters to run
        chain.shift().call(self, req, res, params);
      } else {
        // Run filter
        filter = filters[i];
        filter.call(self, req, res, promise);
      }
    });
    
    // Initially emit the `success` event to run first filter
    promise.emit('success');
  }
}

/**
  Retrieves GET parameters with field validation.
  
  The query parameters from the request will be validated against 
  the route`s validation rules.
  
  @method getQueryData
  @param {object} req
  @param {string} token CSRF Token (optional)
  @param {function} callback
 */

Controller.prototype.getQueryData = function(req, token, callback) {
  var badVal, field, key, msg,
      res = req.response,
      fields = req.queryData;
      
  if (typeof callback == 'undefined') { callback = token; token = null; }
      
  if (req.method == 'GET') {
    
    if (app.validate(req, fields, true)) {
      
      // Check CSRF Token upon validation
      if (app.supports.csrf) app.emit('csrf_check', req, token, fields);
      
      // Route stop: allows `csrf_check` event to stop execution
      if (req.__stopRoute) return;
      
      // Cleanup fields in req.params
      for (key in fields) {
        if (typeof req.params[key] == 'undefined') {
          delete req.params[key];
        }
      }
      
      callback.call(this, fields);
      
    } else if (req.route.messages != null && req.__invalidParam != null) {
      
      // Validate and provide message if available
      field = req.__invalidParam[0];
      badVal = req.__invalidParam[1];
      
      if ( (msg=req.route.messages[field]) != null ) {
        if (msg instanceof Function) msg = msg(badVal);
        res.httpMessage(req.isAjax ? 200 : 400, msg);
      } else {
        app.notFound(res);
      }
    } else {
      app.notFound(res);
    }

  } else {

    app.notFound(res);
    
  }
}

/**
  Returns a controller by its alias
  
  @method getControllerByAlias
  @param {string} name
  @return {object} Controller instance 
 */

Controller.prototype.getControllerByAlias = function(name) {
  // TODO: ignore /main
  var spos, controller, controllerName;
  name = name.replace(app.regex.startOrEndSlash, '');
  spos = name.indexOf('/');
  if (spos > 0) name = name.slice(0, spos);
  return app.controllers[name];
}

/**
  Gets a controller alias
  
  @method getAlias
  @param {string} Controller Class (optional)
  @return {string}
 */

Controller.prototype.getAlias = function(controllerClass) {
  if (!controllerClass) controllerClass = this.constructor.name;
  return (_s.dasherize(controllerClass
  .replace(aliasRegex.re1, ''))
  .replace(aliasRegex.re2, ''));
}

/**
  Determines which route to use and which callback to call, based on
  the request`s method & pathname.
  
  @private
  @method processRoute
  @param {object} urlData
  @param {object} res
  @param {object} req
 */

Controller.prototype.processRoute = function(urlData, req, res) {
  
  var cb, self = this,
      routes = (app.routes[this.constructor.name] || []),
      url = urlData.pathname;
  
  res.__controller = this;
  
  for (var route, i=0; i < routes.length; i++) {
    route = routes[i];
    
    // Route path matches URL
    // Note: To increase security, we check if the validation routes are empty
    
    if (route.path === url && route.paramKeys.length === 0) { // Route path matches url
      
      if (route.method.test(req.method)) { // If Route method matches request method
        
        req.route = route;
        
        if (app.supports.body_parser && (req.method == 'POST' || req.method == 'PUT') ) { // POST & PUT
          
          if (req.exceededUploadLimit()) return;

          req.parseBodyData(function(fields, files) {

            req.__requestData = {
              fields: fields,
              files: files
            };

            // Preload callback
            req.__handledRoute = true;
            
            if (app.supports.session && route.authRequired) {
              app.session.loadSession(req, res, function() {
                if (req.session.user != null) {
                  route.callback.call(self, req, res, req.params);
                } else {
                  req.__requestData.files.removeAll();
                  app.login(res);
                }
              });
            } else {
              route.callback.call(self, req, res, req.params);
            }

          });
          
        } else { // GET & OTHERS
          
          // Preload callback
          req.__handledRoute = true;

          if (app.supports.session && route.authRequired) {
            app.session.loadSession(req, res, function() {
              if (req.session.user != null) {
                route.callback.call(self, req, res, req.params);
              } else {
                app.login(res);
              }
            });
          } else {
            route.callback.call(self, req, res, req.params);
          }

        }
        
      } else { // Route method doesn't match request method
      
        res.httpMessage(405); // HTTP/1.1 405 Method Not Allowed
        
      }
      
      return; // Exit function early. Don't delete this line or bad things will happen.
      
    } else if (route.regex.test(urlData.pathname)) { // Matched route with validation
      
      // Populate route params
      if (route.method.test(req.method)) {
        req.route = route;
        if (route.validation != null) {
          var match = urlData.pathname.match(route.regex);
          // console.exit(route.regex);
          var j = 1;
          for (var key in route.validation) {
            req.params[key] = match[j];
            j++;
          }
        }
        
        // console.exit(req.params);
        
        if (app.supports.body_parser && (req.method == 'POST' || req.method == 'PUT')) { // POST & PUT
          
          if (req.exceededUploadLimit()) return;
          
          req.parseBodyData(function(fields, files) {

            req.__requestData = {
              fields: fields,
              files: files
            };

            // Preload callback
            req.__handledRoute = true;

            if (app.supports.session && route.authRequired) {
              app.session.loadSession(req, res, function() {
                if (req.session.user != null) {
                  route.callback.call(self, req, res, req.params);
                } else {
                  req.__requestData.files.removeAll();
                  app.login(res);
                }
              });
            } else {
              route.callback.call(self, req, res, req.params);
            }
            
          });
          
        } else { // GET & OTHERS
          
          // Preload callback
          req.__handledRoute = true;

          if (app.supports.session && route.authRequired) {
            app.session.loadSession(req, res, function() {
              if (req.session.user != null) {
                route.callback.call(self, req, res, req.params);
              } else {
                app.login(res);
              }
            });
          } else {
            route.callback.call(self, req, res, req.params);
          }

        }
        
      } else {
        res.httpMessage(405); // HTTP/1.1 405 Method Not Allowed
      }
      
      return; // Exit function early. Don't delete this line or bad things will happen.
      
    }
    
  }
  
  /*
  
  ROUTE PROCESSING ORDER

  '/' and Single Parameter routes:
  
    a) If a controller is found associated with the route (and a route in it matches), render it 
    b) If a route is found in MainController that matches, render it 
    c) If there's a static view that matches the route, render it 
    d) Render 404

  Multiple Parameter routes:
  
    a) If a controller is found associated with the route (and a route in it matches), render it 
    b) If a route is found in MainController that matches, render it 
    c) Render 404
  
  */
  
  var alias, controller, isGet = (req.method == 'GET');
  
  if (this.constructor.name == 'MainController') {
    
    if (req.__isMainRequest) { // If it's a mainRequest
      
      // Try getting a controller for the route
      alias = url.replace(app.regex.startOrEndSlash, '');
      controller = alias !== 'main' ? this.getControllerByAlias(alias) : null;
      
      if (controller != null && routes != null) {
        // Controller found, process its routes
        controller.processRoute.call(controller, urlData, req, res);
      } else {
        
        if (isGet) { // If it's a GET request
        
          if (app._staticViewExists(url) ) {
            // Render a static view if found for such url
            renderStaticView.call(this, url, req, res);
          } else if (app.supports.static_server) {
            // Serve any static files matching URL (sends  404 response if not found)
            app._serveStaticFile(app.path + '/' + app.paths.public + url, req, res);
          } else {
            // Nothing found
            app.notFound(res);
          }
          
        } else {
          
          // Nothing found
          app.notFound(res);
          
        }
        
      }
      
    } else if (isGet) { // Not a mainRequest. See if it's a GET request

      if (app._staticViewExists(url)) {
        // Render a static view if found for such url
        renderStaticView.call(this, url, req, res);
      } else if (app.supports.static_server) {
        // Serve any static files matching URL (sends  404 response if not found)
        app._serveStaticFile(app.path + "/" + app.paths.public + url, req, res);
      } else {
        // Nothing found
        app.notFound(res);
      }
      
    } else {
      
      // Nothing found
      app.notFound(res);
      
    }

  } else if (isGet) {
    
    if (app._staticViewExists(url)) {
      // Render a static view if found for such url
      renderStaticView.call(this, url, req, res);
    } else if (app.supports.static_server) {
      // Serve any static files matching URL (sends 404 response if not found)
      app._serveStaticFile(app.path + "/" + app.paths.public + url, req, res);
    } else {
      // Nothing found
      app.notFound(res);
    }
    
  } else { // It's not a get request, as a last resource, try locating the route on MainController
    
    app.controller.processRoute.call(app.controller, urlData, req, res);
    
  }
}

/**
  Determines which controller to use for a request URL
  
  @private
  @method exec
  @param {object} urlData
  @param {object} req
  @param {object} res
 */
  
Controller.prototype.exec = function(urlData, req, res) {
  var controller,
      url = urlData.pathname,
      matches = url.match(app.regex.controllerAlias);
  
  if (matches) controller = app.controller.getControllerByAlias(matches[1]);
  controller = (controller || app.controller);
  controller.processRoute.call(controller, urlData, req, res);
}

/*
  Renders a static view
  
  @private
  @param {string} url
  @param {object} req
  @param {object} res
 */

function renderStaticView(url, req, res) {
  url = url.replace(app.regex.endsWithSlash, '');
  app.emit('static_view', req, res, url);
  if (!req.__stopRoute) {
    var template = app.views.staticAsoc[url];
    if (typeof template == 'string') {
      res.isStaticView = true;
      res.render('/' + template);
    } else {
      app.serverError(res, [new Error('Unable to load template for ' + url)]);
    }
  }
}


/*
  Route registration function, used both in Static & Prototype methods
  
  @private
  @params {mixed} specified in the `Routing Functions` section on this file
 */

function registerRoute(route, arg2, arg3, arg4) {
  
  /*
    Route registration happens in 2 iterations:

    1) The routes are added in the Application`s controller (routes are queued) 
    2) On instantiation, the routes are registered
  */
  
  var app = protos.app,
      getAlias = Controller.prototype.getAlias;
  
  var controller = route[0],
    caller = controller.name,
    method = route[1],
    authRequired = route[2];
    
  route = route[3];
  
  var validation, messages, callback, regex;
  
  if (arg3 === undefined && arg2 instanceof Array) {
    validation = null; messages = null; callback = arg2;
  } else if (arg4 === undefined && typeof arg2 == 'object' && arg3 instanceof Array) {
    messages = null; validation = arg2; callback = arg3;
  } else if (typeof arg2 == 'object' && typeof arg3 == 'object' && arg4 instanceof Array) {
    validation = arg2; messages = arg3; callback = arg4;
  } else {
    throw new Error("[" + app.hostname + "] Unable to process route on " + caller + ": " + route);
  }
  
  if ( !app.regex.startsWithSlash.test(route) ) route = "/" + route;
  if (caller !== 'MainController') {
    route = "/" + getAlias(caller) + route;
  }
  if (app.routes[caller] == null) app.routes[caller] = [];
  if (route !== '/') route = route.replace(app.regex.endsWithSlash, '');

  try {
    if (validation == null) {
      // allow an optional slash at the end
      regex = new RegExp('^' + route.replace(app.regex.regExpChars, '\\$1') + '\\/?$');
    } else {
      regex = route.replace(app.regex.regExpChars, '\\$1');
      for (var key in validation) {
        if (typeof validation[key] == 'string') {
          if (validation[key] in app.regex) {
            validation[key] = app.regex[validation[key]];
          } else {
            throw new Error('Invalid Regular Expression alias: ' + validation[key]);
          }
        }
        regex = regex.replace(new RegExp(':' + key, 'g'), '(' 
        + validation[key]
        .toString()
        .replace(app.regex.startOrEndSlash, '')
        .replace(app.regex.startOrEndRegex, '') + ')');
      }
      regex = regex.replace(/\(\(/g, '(').replace(/\)\)/g, ')');
      regex = new RegExp('^' + regex + '\\/?$');
    }
  } catch (e) {
    throw new Error("[" + app.hostname + "] " + caller + ' ' + route + ': ' + e);
  }

  var paramKeys = ( validation ) ? Object.keys(validation) : [];

  app.routes[caller].push({
    path: route,
    method: method,
    regex: regex,
    validation: validation || {},
    paramKeys: paramKeys,
    messages: messages,
    authRequired: authRequired,
    callback: function(req, res, params) {
      this.runFilters(req, res, params, callback);
    },
    caller: caller
  });
  
}

/*
  Automates the addition of routing functions
 */

function routeFunction() {
  var args = slice.call(arguments, 0),
      func = args.pop();
  for (var alias,i=0; i < args.length; i++) {
    alias = args[i];
    Controller.prototype.routeMethods.push(alias);
    Controller[alias] = func;
  }
}

module.exports = Controller;