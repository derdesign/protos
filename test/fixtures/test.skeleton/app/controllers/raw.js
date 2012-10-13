
function RawController(app) {
  
  this.filter(function(req, res, promise) {
    req.set('filter1', true);
    promise.emit('success');
  });
  
  this.filter(function(req, res, promise) {
    req.set('filter2', true);
    promise.emit('success');
  });
  
  function pre_callback(req, res) {
    req.set('pre_callback', true);
    req.next();
  }
  
  function callback(req, res) {
    res.json(req.__metadata);
  }
  
  get('/hello/normal', pre_callback, callback);
  
  raw_get('/hello', pre_callback, callback);
  
}

module.exports = RawController;