
/**

  Sample handler function. The exported function can be accessed by running the
  'handler' method from the controller, as such:
  
  get('/example', this.handler('example'));
  
  Additionally, a handler path can be specified, relative to the controller's 
  handlers/ directory:
  
  get('/example', this.handler('path/to/handler'));
  
 */

var app = protos.app;

module.exports = function(req, res) {
  res.end("Example handler function")
}