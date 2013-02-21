
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    util = require('util'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;

var sessionState;

var multi = new Multi(app);

multi.on('pre_exec', app.backupFilters);
multi.on('post_exec', app.restoreFilters);

vows.describe('Static File Server (middleware)').addBatch({
  
  '': {
    
    topic: function() {
      
      // Load static server middleware
      sessionState = app.supports.session;
      app.supports.session = false;
      app.use('static_server', {
        watchOn: [protos.environment]
      });
      
      var promise = new EventEmitter();
      
      multi.curl('-i /hello.txt');                    // file in root level
      multi.curl('-i /dir/file.txt');                 // file in subdir, level 1
      multi.curl('-i /dir/subdir/sub.txt');           // file in subdir, level 2
      multi.curl('-i /blog/post.txt');                // file in subdir, matches controller name
      multi.curl('-i /missing.txt');                  // missing file, root level
      multi.curl('-i /this/is/missing.txt');          // missing file, level 1
      multi.curl('-i /this/is/missing/file.txt');     // missing file, level 2
      multi.curl('-i /.missing-file');                // hidden file, root level (nonexistent)
      multi.curl('-i /dir/.missing-file');            // hidden file, level 1 (nonexistent)
      multi.curl('-i /.hidden-file');                 // hidden file, root level
      multi.curl('-i /dir/.hidden-file');             // hidden file, level 1

      // Partial content
      multi.request({                                 // partial file request, valid
        url: app.url('/ranges.txt'),
        headers: { Range: 'bytes=5-10' }
      })
      
      multi.request({                                 // partial file request, invalid
        url: app.url('/ranges.txt'),
        headers: { Range: 'bytes=10-5' }
      });
      
      // File download (without attachment name)
      multi.curl('-i /download');
      
      // File download with attachment name                
      multi.curl('-i -G -d "file=hello.txt" /download');
      
      multi.exec(function(err, results) {
        app.supports.session = sessionState;
        if (err) throw err;
        results = results.map(function(r) {
          try { return r.trim().split(/\r\n/); }
          catch(e) { return r; }
        });
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'Properly sets cache control headers': function(results) {
      var r = results[0];
      var cc = app.config.cacheControl;
      assert.isTrue(r.indexOf(util.format('Cache-Control: %s, max-age=%d', cc.static, cc.maxAge)) >= 0);
    },
    
    'Gets files in public/ » root level': function(results) {
      var r = results[0];
      assert.isTrue(r.indexOf('Status: 200 OK') >= 0);
      assert.isTrue(r.indexOf('Content-Length: 11') >= 0);
      assert.isTrue(r.indexOf('Content-Type: text/plain') >= 0);
      assert.equal(r.pop(), '{hello.txt}');
    },

    'Gets files in public/ » 1 level deep': function(results) {
      var r = results[1];
      assert.isTrue(r.indexOf('Status: 200 OK') >= 0);
      assert.isTrue(r.indexOf('Content-Length: 14') >= 0);
      assert.isTrue(r.indexOf('Content-Type: text/plain') >= 0);
      assert.equal(r.pop(), '{dir/file.txt}');
    },
    
    'Gets files in public/ » 2 levels deep (and up)': function(results) {
      var r = results[2];
      assert.isTrue(r.indexOf('Status: 200 OK') >= 0);
      assert.isTrue(r.indexOf('Content-Length: 20') >= 0);
      assert.isTrue(r.indexOf('Content-Type: text/plain') >= 0);
      assert.equal(r.pop(), '{dir/subdir/sub.txt}');
    },
    
    'Does not conflict with controllers': function(results) {
      var r = results[3];
      assert.isTrue(r.indexOf('Status: 200 OK') >= 0);
      assert.isTrue(r.indexOf('Content-Length: 15') >= 0);
      assert.isTrue(r.indexOf('Content-Type: text/plain') >= 0);
      assert.equal(r.pop(), '{blog/post.txt}');
    },
    
    'Responds with 404 for files not found': function(results) {
      var r1 = results[4],
          r2 = results[5],
          r3 = results[6];
      assert.equal(r1[0], 'HTTP/1.1 404 Not Found');
      assert.equal(r2[0], 'HTTP/1.1 404 Not Found');
      assert.equal(r3[0], 'HTTP/1.1 404 Not Found');
    },
    
    'Denies access to hidden files': function(results) {
      var r1 = results[7],
          r2 = results[8],
          r3 = results[9],
          r4 = results[10];
      assert.equal(r1[0], 'HTTP/1.1 404 Not Found');
      assert.equal(r2[0], 'HTTP/1.1 404 Not Found');
      assert.equal(r3[0], 'HTTP/1.1 404 Not Found');
      assert.equal(r4[0], 'HTTP/1.1 404 Not Found');
    },
    
    'Responds with 206 for Partial Content requests': function(results) {
      var r1 = results[11], // HTTP/1.1 206 Partial Content
          r2 = results[12]; // HTTP/1.1 416 Requested Range Not Satisfiable
      assert.equal(r1[1], 'fghijk');
      assert.equal(r1[0].headers.status, '206 Partial Content');
      assert.equal(r2[1], undefined);
      assert.equal(r2[0].headers.status, '416 Requested Range Not Satisfiable');
    },
    
    'Successfully sends files (forcing download)': function(results) {
      var r1 = results[13],
          r2 = results[14];
      assert.isTrue(r1.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r1.indexOf('Content-Disposition: attachment') >= 0);
      assert.isTrue(r2.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r2.indexOf('Content-Disposition: attachment; filename="hello.txt"') >= 0);
    }
    
  }
  
}).export(module);