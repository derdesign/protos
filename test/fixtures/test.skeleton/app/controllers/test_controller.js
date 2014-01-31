/*jshint immed: false */

var inspect = require('util').inspect;

function TestController(app) {

  /* Controller Handlers */
  
  app.handlerTests.test = {
    'handler.js': this.handler('handler')
  }

  /* Dynamic routes, covering all route methods */
  
  var routeMethods = this.prototype.routeMethods;
  
  for (var key,i=0; i < routeMethods.length; i++) {
    key = routeMethods[i];
    if (key != 'super_' && this.hasOwnProperty(key) && this[key] instanceof Function) {
      (function(k) {
        this[k]('/'+ k, function(req, res) {
          res.sendHeaders();
          res.end('{'+ k +'}\n\n');
        });
      }).call(this, key);
    }
  }
  
  /* ROUTES */
  
  get('/routes/:integer', function(req, res, params) {
    res.json(params);
  });
  
  get('/routes/:some/:route', function(req, res, params) {
    res.json(params);
  });
  
  /* GET */
  
  // Parameter validation: valid
  // Parameter validation: invalid
  
  get('/qstring/:rule1', {rule1: /^abcde$/}, function(req, res, params) {
    res.sendHeaders();
    res.end(inspect(params));
  });
  
  // Query String values + no param validation
  get('/qstring', function(req, res) {
    res.sendHeaders();
    res.end(inspect(req.queryData));
  }, 'post', 'put', 'delete', 'trace', 'options');
  
  // Query String values + param validation 
  get('/qstring/:rule1/:rule2', {rule1: 'alpha', rule2: 'integer'}, function(req, res, params) {
    res.sendHeaders();
    res.end(inspect(params) + ' ' + inspect(req.queryData));
  });
  
  /* GET REQUEST DATA */
  
  post('/body-parser/request-data', function(req, res) {
    req.getRequestData(function(fields, files) {
      res.end(JSON.stringify({
        fields: fields,
        files: files
      }));
    });
  }, 'put');
  
  /* FILE UPLOADS */
  
  app.on('upload_limit_exceeded', function(req, res) {
    res.setHeader('X-Upload-Limit-Exceeded', req.response === res);
  });
  
  // Upload Limits & Messages
  var uploadCb;
  post('/upload', uploadCb = function(req, res) {
    req.getRequestData(function(fields, files) {
      files.expect({
        file: {}
      });
      var f = files.get('file');
      if ( f ) { // File should be present, and not empty
        res.sendHeaders();
        res.end(inspect(f));
        files.removeAll();
      } else {
        res.httpMessage(400);
      }
    });
  }, 'put'); // Also register for PUT requests
}

module.exports = TestController;