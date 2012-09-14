
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
  
  // GET Csrf check
  var cb1;
  get('/check/get', loadSession, cb1 = function(req, res) {
    req.getQueryData('protect', function(fields) {
      res.json(fields);
    });
  });
  
  // POST/PUT Csrf check
  var cb2;
  post('/check/post', loadSession, cb2 = function(req, res) {
    req.getRequestData('protect', function(fields, files) {
      res.json(fields);
      files.removeAll();
    });
  }, 'put');
  
}

module.exports = CsrfController;