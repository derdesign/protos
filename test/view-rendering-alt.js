
var app = require('./fixtures/bootstrap'),
    vows = require('vows'),
    fs = require('fs'),
    assert = require('assert'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;
    
var TEST = -1;

vows.describe('View Rendering').addBatch({
  
  'Preliminary Tests': {
    
    topic: function() {
      
      app.config.staticViews.defaultExtension = 'html'; // Set default static extension

      app.reload({static: true}); // Reload static views to get the default static extension
      
      return true;
      
    },
    
    'Static view defaults properly set': function() {
    
      assert.deepEqual(app.views.staticAssoc, {
        '/markdown.html': 'markdown.ejs',
        '/session-test.html': 'session-test.hbs',
        '/static-view-event.html': 'static-view-event.hbs',
        '/static.html': 'static.hbs',
        '/category/archive.html': 'category/archive.hbs',
        '/category/uncategorized/post.html': 'category/uncategorized/post.hbs',
        '/ext-test/default-ext.html': 'ext-test/default-ext.hbs',
        '/ext-test/file.css': 'ext-test/file[css].hbs',
        '/ext-test/file.doc': 'ext-test/file[doc].hbs',
        '/ext-test/file.html': 'ext-test/file[html].hbs',
        '/ext-test/file.js': 'ext-test/file[js].hbs',
        '/ext-test/file.json': 'ext-test/file[json].hbs',
        '/ext-test/file.txt': 'ext-test/file[txt].hbs',
        '/ext-test/someview.html': 'ext-test/someview.raw.hbs',
        '/ext-test/someview.xhtml': 'ext-test/someview[xhtml].raw.hbs',
        '/ext-test/unknown-ext.whatever': 'ext-test/unknown-ext[whatever].hbs',
        '/ext-test/without-ext': 'ext-test/without-ext[].hbs'
      });
    
      assert.deepEqual(app.views.staticRaw, {
        '/ext-test/file.css': true,
        '/ext-test/file.doc': true,
        '/ext-test/file.html': true,
        '/ext-test/file.js': true,
        '/ext-test/file.json': true,
        '/ext-test/file.txt': true,
        '/ext-test/someview.html': true,
        '/ext-test/someview.xhtml': true,
        '/ext-test/unknown-ext.whatever': true
      });
    
      assert.deepEqual(app.views.staticMime, {
        '/markdown.html': 'text/html',
        '/session-test.html': 'text/html',
        '/static-view-event.html': 'text/html',
        '/static.html': 'text/html',
        '/category/archive.html': 'text/html',
        '/category/uncategorized/post.html': 'text/html',
        '/ext-test/default-ext.html': 'text/html',
        '/ext-test/file.css': 'text/css',
        '/ext-test/file.doc': 'application/msword',
        '/ext-test/file.html': 'text/html',
        '/ext-test/file.js': 'application/javascript',
        '/ext-test/file.json': 'application/json',
        '/ext-test/file.txt': 'text/plain',
        '/ext-test/someview.html': 'text/html',
        '/ext-test/someview.xhtml': 'application/xhtml+xml',
        '/ext-test/unknown-ext.whatever': 'application/octet-stream'
      });
    
      assert.deepEqual(app.views.staticExtOverride, {
        '/ext-test/file.css': 'css',
        '/ext-test/file.doc': 'doc',
        '/ext-test/file.html': 'html',
        '/ext-test/file.js': 'js',
        '/ext-test/file.json': 'json',
        '/ext-test/file.txt': 'txt',
        '/ext-test/someview.xhtml': 'xhtml',
        '/ext-test/unknown-ext.whatever': 'whatever'
      });

    }
    
  }
  
}).addBatch({
  
  'Static View Extensions': {
    
    topic: function() {
      
      var multi = new Multi(app);
      var promise = new EventEmitter();
      
      // Properly assigns default extension
      multi.curl('-i /ext-test/default-ext'); // 404
      multi.curl('-i /ext-test/default-ext.html');
      
      // Sets raw from filename
      multi.curl('-i /ext-test/someview');
      multi.curl('-i /ext-test/someview.html');
      
      // Set raw & extension from filename
      multi.curl('-i /ext-test/someview.xhtml');
      
      // Unknown extensions (application/octet-stream mime type)
      multi.curl('-i /ext-test/unknown-ext'); // 404
      multi.curl('-i /ext-test/unknown-ext.whatever');
      
      // Remove default extension by setting empty ext
      // Also, does not get default extension assigned
      multi.curl('-i /ext-test/without-ext.html'); // 404
      multi.curl('-i /ext-test/without-ext');
      
      // Content Type override for app.config.staticViews.setEncoding matches
      multi.curl('-i /ext-test/file.html');
      multi.curl('-i /ext-test/file.css');
      multi.curl('-i /ext-test/file.js');
      multi.curl('-i /ext-test/file.json');
      multi.curl('-i /ext-test/file.txt');
      
      // Content Type is not overridden for exts not matched by setEncoding
      multi.curl('-i /ext-test/file.doc');
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;

    },
    
    'Properly assigns default extension': function(results) {
      
      var r1 = results[++TEST];
      var r2 = results[++TEST];
      
      assert.isTrue(r1.indexOf('HTTP/1.1 404 Not Found') >= 0);
      assert.isTrue(r2.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r2.indexOf('Content-Type: text/html;charset=utf-8') >= 0);
      assert.isTrue(r2.indexOf('* default-ext.hbs *') >= 0);
      assert.isTrue(r2.indexOf('<!doctype html>') >= 0);

    },
    
    'Sets raw from filename': function(results) {

      var r1 = results[++TEST];
      var r2 = results[++TEST];
      
      assert.isTrue(r1.indexOf('HTTP/1.1 404 Not Found') >= 0);
      assert.isTrue(r2.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r2.indexOf('Content-Type: text/html;charset=utf-8') >= 0);
      assert.isTrue(r2.indexOf('* someview.raw.hbs *') >= 0);
      assert.isTrue(r2.indexOf('<!doctype html>') === -1);

    },
    
    'Sets raw & extension from filename': function(results) {
      
      var r = results[++TEST];
      
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r.indexOf('Content-Type: application/xhtml+xml;charset=utf-8') >= 0);
      assert.isTrue(r.indexOf('* someview[xhtml].raw.hbs *') >= 0);
      assert.isTrue(r.indexOf('<!doctype html>') === -1); // Is a raw view

    },
    
    'Properly handles unknown extensions': function(results) {
      
      var r1 = results[++TEST];
      var r2 = results[++TEST];

      assert.isTrue(r1.indexOf('HTTP/1.1 404 Not Found') >= 0);
      assert.isTrue(r2.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r2.indexOf('Content-Type: application/octet-stream') >= 0);
      assert.isTrue(r2.indexOf('* unknown-ext[whatever].hbs *') >= 0);
      assert.isTrue(r2.indexOf('<!doctype html>') === -1); // Is a raw view

    },
    
    'Properly removes default ext from filename': function(results) {
      
      var r1 = results[++TEST];
      var r2 = results[++TEST];
      
      assert.isTrue(r1.indexOf('HTTP/1.1 404 Not Found') >= 0); // without-ext.html should not be found
      assert.isTrue(r2.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r2.indexOf('Content-Type: text/html;charset=utf-8') >= 0);
      assert.isTrue(r2.indexOf('* without-ext[].hbs *') >= 0);
      assert.isTrue(r2.indexOf('<!doctype html>') >= 0); // It's a normal view

    },
    
    'Sets encoding for matches in setEncoding': function(results) {
      
      var html = results[++TEST];
      var css = results[++TEST];
      var js = results[++TEST];
      var json = results[++TEST];
      var txt = results[++TEST];

      assert.isTrue(html.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(html.indexOf('Content-Type: text/html;charset=utf-8') >= 0);
      assert.isTrue(html.indexOf('* file[html].hbs *') >= 0);
      assert.isTrue(html.indexOf('<!doctype html>') === -1); // Is a raw view
      
      assert.isTrue(css.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(css.indexOf('Content-Type: text/css;charset=utf-8') >= 0);
      assert.isTrue(css.indexOf('* file[css].hbs *') >= 0);
      assert.isTrue(css.indexOf('<!doctype html>') === -1); // Is a raw view
      
      assert.isTrue(js.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(js.indexOf('Content-Type: application/javascript;charset=utf-8') >= 0);
      assert.isTrue(js.indexOf('* file[js].hbs *') >= 0);
      assert.isTrue(js.indexOf('<!doctype html>') === -1); // Is a raw view
      
      assert.isTrue(json.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(json.indexOf('Content-Type: application/json;charset=utf-8') >= 0);
      assert.isTrue(json.indexOf('* file[json].hbs *') >= 0);
      assert.isTrue(json.indexOf('<!doctype html>') === -1); // Is a raw view
      
      assert.isTrue(txt.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(txt.indexOf('Content-Type: text/plain;charset=utf-8') >= 0);
      assert.isTrue(txt.indexOf('* file[txt].hbs *') >= 0);
      assert.isTrue(txt.indexOf('<!doctype html>') === -1); // Is a raw view
      
    },
    
    'No encoding set for exts not matched by setEncoding': function(results) {
      var r = results[++TEST];
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r.indexOf('Content-Type: application/msword') >= 0);  // Encoding not set
      assert.isTrue(r.indexOf('* file[doc].hbs *') >= 0);
      assert.isTrue(r.indexOf('<!doctype html>') === -1); // Is a raw view
    },
    
    'Restoring previous staticView configuration state': function() {
      
      app.config.staticViews.defaultExtension = false; // Set default static extension

      app.reload({static: true}); // Reload static views to get the default static extension
      
    }
    
  }
  
}).addBatch({
  
  'View Messages (#msg template not present)': {
    
    topic: function() {
      
      // process.exit();
      
      var promise = new EventEmitter();

      var msgTemplate = app.fullPath('app/views/'+ app.paths.restricted +'/msg.mustache');
      
      fs.renameSync(msgTemplate, msgTemplate + '1');
      
      app.request(app.url('/raw-message'), function(err, res, buf) {
        
        fs.renameSync(msgTemplate + 1, msgTemplate);
        
        promise.emit('success', [err, buf, res.headers]);
        
      });
      
      return promise;
      
    }, 
    
    'Sends responses in plain text with no template': function(data) {
      var err = data[0], buf = data[1], headers = data[2];
      assert.strictEqual(buf, "This is a raw message");
      assert.strictEqual(headers['content-type'], 'text/plain;charset=utf-8');
      assert.strictEqual(headers.status, '200 OK');
    }
    
  }

}).addBatch({
  
  'Plain View Engine': {
    
    'Registers valid extensions': function() {
      assert.deepEqual(app.engines.plain.extensions, ['txt', 'txt.html']);
    },
    
    'Returns valid view buffer': function() {
      var buf = "<h1>HELLO WORLD</h1>";
      var tpl = app.engines.plain.render(buf);
      assert.strictEqual(buf, tpl(buf));
    }

  }
  
}).addBatch({
  
  'Handlebars Integration': {
    
    topic: function() {
      
      var multi = new Multi(app);
      var promise = new EventEmitter();
      
      multi.curl('/handlebars-integration');
      
      multi.on('pre_exec', app.backupFilters);
      multi.on('post_exec', app.restoreFilters);
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results[0])
      });
          
      return promise;
      
    },
    
    "Provides expected output": function(buf) {
      var output = fs.readFileSync('test/fixtures/handlebars-integration-output.txt', 'utf8');
      assert.equal(buf, output);
    }
    
  }



}).addBatch({
  
  'Swig Integration': {
    
    topic: function() {
      
      var promise = new EventEmitter();
      var multi = new Multi(app);
      
      multi.curl('/swig-integration');
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results[0]);
      });
      
      return promise;
      
    },
    
    "Template inheritance works as expected": function(buf) {
      assert.strictEqual(buf, '\n<p>This is the alpha block</p>\n<p>This is the beta block</p>\n<p>This is the gamma block</p>\n');
    }
    
  }
  
}).export(module);