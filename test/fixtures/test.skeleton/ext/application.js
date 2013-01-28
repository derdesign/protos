
/* Application Extensions */

var Application = protos.app.constructor;

protos.extend(Application.prototype, {
  
  // NOTE: The callbacks below are for testing purposes only, 
  //       Filter Callbacks receive (req, res, promise) as arguments.
  
  testMethodOne: function() {
    return "Output for app.testMethodOne";
  },
  
  testMethodTwo: function() {
    return "Output for app.testMethodTwo";
  }
  
});
