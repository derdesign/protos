/*jshint undef: false */

function BlogController(app) {
  
  /* Handler Tests */
  
  app.handlerTests.blog = {
    'some/handler/dir/file.js': this.handler('some/handler/dir/file.js')
  }
  
  get('/', function(req, res) {
    res.end('{BLOG CONTROLLER /}');
  });
  
}

module.exports = BlogController;