
function FilterController() {
  
  // Filter #1: block bad-route-1
  filter(function(req, res, promise) { // Using filter without this
    if (req.url == '/filter/bad-route-1') {
      res.sendHeaders();
      res.end('{BAD ROUTE 1}');
    } else promise.emit('success');
  });
  
  // Filter #2: block bad-route-2
  this.filter(function(req, res, promise) {
    if (req.url == '/filter/bad-route-2') {
      res.sendHeaders();
      res.end('{BAD ROUTE 2}');
    } else promise.emit('success');
  });
  
  get('/', function(req, res) {
    res.end('{FILTER CONTROLLER}');
  });
  
  get('/greeting/:name', {name: 'alpha'}, function(req, res, params) {
    res.end('{Hello ' + params.name + '}');
  });
  
  get('/bad-route-1', function(req, res) {
    throw new Error("This should not run");
  });
  
  get('/bad-route-2', function(req,res) {
    throw new Error("This should not run");
  });
  
}

module.exports = FilterController;