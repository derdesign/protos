
/**

  The exported handler function can be accessed by running the 'handler' method 
  from the controller, as such:
  
    get('/example', this.handler('example.js'));
  
  A handler path can be specified, relative to the controller's handlers/ directory:
  
    get('/example', this.handler('path/to/example.js'));
    
  Any extra arguments passed to the 'handler' method will be passed to the function
  that generates the handler as arguments:
  
    get('/example', this.handler('example.js', arg1, arg2, arg3));
    
  The returned handler function will be wrapped into a new closure, having access to
  any arguments passed by the 'handler' method.
    
 */

module.exports = function(arg1, arg2, arg3) {
  
  var app = protos.app;
  
  return function(req, res) {
    
  }
  
}