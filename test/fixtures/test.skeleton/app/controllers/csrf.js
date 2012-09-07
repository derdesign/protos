
function CsrfController(app) {
  
  // Create csrf session data
  
  // Using a function stub to be able to register the extra callback on the
  // route, since app.session.load is not available at this point in time.
  var loadSession = function(req, res) {
    return app.session.load(req, res);
  }
  
  get('/', loadSession, function(req, res) {
    res.sendHeaders();
    req.csrfToken('protect');
    res.end('{CSRF INDEX}');
  });
  
  // Check csrf data in session
  get('/test', loadSession, function(req, res) {
    res.json(req.session);
  });
  
  // GET Csrf check, no params
  var cb1;
  get('/check/get', loadSession, cb1 = function(req, res) {
    this.getQueryData(req, 'protect', function(fields) {
      res.json(fields);
    });
  });
  
  // GET Csrf check, with query
  
  get('/check/get/query', {name: 'alpha', age: 'integer'}, loadSession, cb1);
  
  // POST/PUT Csrf check, no params
  var cb2;
  post('/check/post', loadSession, cb2 = function(req, res) {
    this.getRequestData(req, 'protect', function(fields, files) {
      res.json(fields);
      files.removeAll();
    });
  }, 'put');
  
  // POST/PUT Csrf check, with fields
  post('/check/post/fields', {name: 'alpha', age: 'integer'}, loadSession, cb2, 'put');
  
}

module.exports = CsrfController;