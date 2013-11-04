
var app = require('../fixtures/bootstrap'),
    fs = require('fs'),
    vows = require('vows'),
    assert = require('assert'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;
    
var multi = new Multi(app);

vows.describe('Markdown (middleware)').addBatch({
  
  'Markdown::parse': {
    
    topic: function() {
      
      // Enable markdown middleware
      app.use('markdown');

      var source = fs.readFileSync('test/fixtures/markdown-source.txt', 'utf8');

      return app.markdown.parse(source, {
        sanitize: true,
        sanitizeURIPolicy: function(url) {
          return /(google|twitter)/.test(url) ? url : null;
        }
      });

    },
    
    'Provides expected output': function(buf) {
      var output = fs.readFileSync('test/fixtures/markdown-output.txt', 'utf8');
      assert.strictEqual(buf, output);
    }
    
  },
  
  'Markdown::addExtension': {
    
    'Properly adds showdown extension': function() {
      
      var str = 'Twitter @username';
      
      var before = app.markdown.parse(str);
      
      app.markdown.addExtension('twitter');
      
      var after = app.markdown.parse(str);
      
      // Should render with twitter extension disabled
      assert.equal(before, '<p>Twitter @username</p>');
      
      // Should render with twitter extension enabled
      assert.equal(after, '<p>Twitter <a href="http://twitter.com/username">@username</a></p>');

    }
    
  },
  
  'Markdown::setExtensions': {
    
    'Properly adds/overrides current extensions': function() {
      
      var src = 'This is ~~strikethrough~~ and @username';
      
      var before = app.markdown.parse(src);
      
      app.markdown.setExtensions([]);
      
      var after = app.markdown.parse(src);
      
      // Should render with available extensions. Twitter extension is enabled at this point, github enabled by default
      assert.strictEqual(before, '<p>This is <del>strikethrough</del> and <a href="http://twitter.com/username">@username</a></p>');
      
      // Should render without extensions
      assert.strictEqual(after, '<p>This is ~~strikethrough~~ and @username</p>');
      
    }
    
  },
  
  'The $markdown view helper': {
    
    topic: function() {
      var promise = new EventEmitter();

      // Markdown tests
      app.curl('-i /markdown', function(err, buf) {
        promise.emit('success', err || buf);
      });
      
      return promise;
    },
    
    "The '$markdown' view helper is properly registered": function() {
      assert.isFunction(app.views.partials.$markdown);
    },
    
    "The '$markdown' view helper can be used within views": function(r) {
      
      // Note: if the helper can be used within views, Markdown::parse is already being tested
      
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
      
      // The <script> tag should not be present inside <p>
      assert.isTrue(r.indexOf('<p id="sanitized"></p>') >= 0);
      
      // The <script> tag should be present, since it's unsanitized
      assert.isTrue(r.indexOf('<p id="unsanitized"><script type="text/javascript" src="myscript.js">window.hackme = true;</script></p>') >= 0);
    }
    
  }
  
}).export(module);