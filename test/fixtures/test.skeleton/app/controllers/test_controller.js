/*jshint immed: false */

var inspect = require('util').inspect;

function TestController(app) {

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
  });
  
  // Query String values + param validation 
  get('/qstring/:rule1/:rule2', {rule1: 'alpha', rule2: 'integer'}, function(req, res, params) {
    res.sendHeaders();
    res.end(inspect(params) + ' ' + inspect(req.queryData));
  });
  
  /* FILE UPLOADS */
  
  // Upload Limits & Messages
  var uploadCb;
  post('/upload', uploadCb = function(req, res) {
    // this.getRequestData(req, function(fields, files) {
    //       if ( files.expect('**file') ) { // File should be present, and not empty
    //         var f = files.get('file');
    //         res.sendHeaders();
    //         res.end(inspect(f));
    //         files.removeAll();
    //       } else res.httpMessage(400);
    //      });
  }, 'put'); // Also register for PUT requests
}

module.exports = TestController;