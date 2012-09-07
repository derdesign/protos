
function CsrfController(app) {
  
  // Create csrf session data
  
  // NOTE: Why is app.session.loadSession used ? See test/middleware/session.js
  
  get('/', function(req, res) {
    app.session.loadSession(req, res, function() {
      res.sendHeaders();
      req.csrfToken('protect');
      res.end('{CSRF INDEX}');
    });
  });
  
  // Check csrf data in session
  get('/test', function(req, res) {
    app.session.loadSession(req, res, function() {
      res.json(req.session);
    });
  });
  
  // GET Csrf check, no params
  var cb1;
  get('/check/get', cb1 = function(req, res) {
    var self = this;
    app.session.loadSession(req, res, function() {
      self.getQueryData(req, 'protect', function(fields) {
        res.json(fields);
      });
    });
  });
  
  // GET Csrf check, with query
  
  get('/check/get/query', {name: 'alpha', age: 'integer'}, cb1);
  
  // POST/PUT Csrf check, no params
  var cb2;
  post('/check/post', cb2 = function(req, res) {
    var self = this;
    app.session.loadSession(req, res, function() {
      self.getRequestData(req, 'protect', function(fields, files) {
        res.json(fields);
        files.removeAll();
      });
    });
  }, 'put');
  
  // POST/PUT Csrf check, with fields
  post('/check/post/fields', {name: 'alpha', age: 'integer'}, cb2, 'put');
  
}

module.exports = CsrfController;