
/* [handler] main/test.js */

module.exports = function(a, b, c) {
  
  var app = protos.app;
  
  return function(req, res) {
    return [a, b, c];
  }
  
}