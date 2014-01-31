/*jshint undef: false */

function BlogController(app) {
  
  /* Handler Tests */
  
  app.handlerTests.blog = {
    'some/handler/dir/file.js':  handler('some/handler/dir/file') // Using handler without this and without extension
  }
  
  get('/', function(req, res) {
    res.end('{BLOG CONTROLLER /}');
  });
  
}

module.exports = BlogController;