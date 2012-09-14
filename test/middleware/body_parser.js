
// TODO: Implement a method to retrieve uploaded files

// Use the /upload route on controllers/test_controller.js

/*
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    util = require('util'),
    assert = require('assert'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;

var multi = new Multi(app);

multi.on('pre_exec', app.backupFilters);
multi.on('post_exec', app.restoreFilters);

function successfulUpload(r) {
  assert.isTrue(r.indexOf('HTTP/1.1 100 Continue') >= 0);
  assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
  assert.isTrue(r.indexOf(util.format("path: '%s/%s", app.path, app.paths.upload)) >= 0);
  assert.isTrue(r.indexOf("size: 65536") >= 0);
  assert.isTrue(r.indexOf("name: 'file-64.junk'") >= 0);
  assert.isTrue(r.indexOf("type: 'application/octet-stream'") >= 0);
}

function uploadExceedsLimit(r) {
  assert.isTrue(r.indexOf('HTTP/1.1 100 Continue') >= 0);
  assert.isTrue(r.indexOf('HTTP/1.1 413 Request Entity Too Large') >= 0);
  assert.isTrue(r.indexOf('Upload limit exceeded: 0.125 MB') >= 0);
}

vows.describe('Body Parser (middleware)').addBatch({
  
  'File Uploads': {
    
    topic: function() {
      
      app.use('body_parser', {
        maxFieldSize: 64 * 1024,  // 64kb
        maxUploadSize: 128 * 1024 // 128kb
      });
    
      var promise = new EventEmitter();
      
      // Successful file upload (POST)
      multi.curl('-i -X POST -F "file=@test/fixtures/file-64.junk" /test/upload');
      
      // File upload exceeds upload limit (POST)
      multi.curl('-i -X POST -F "file=@test/fixtures/file-512.junk" /test/upload');    
        
      // Successful file upload (PUT)
      multi.curl('-i -X PUT -F "file=@test/fixtures/file-64.junk" /test/upload');
      
      // File upload exceeds upload limit (PUT)
      multi.curl('-i -X PUT -F "file=@test/fixtures/file-512.junk" /test/upload');
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'Files are uploaded successfully (POST)': function(results) {
      successfulUpload(results[0]);
    },
    
    'Forbids uploads that exceed maxUploadSize (POST)': function(results) {
      uploadExceedsLimit(results[1]);
    },
    
    'Files are uploaded successfully (PUT)': function(results) {
      successfulUpload(results[2]);
    },
    
    'Forbids uploads that exceed maxUploadSize (PUT)': function(results) {
      uploadExceedsLimit(results[3]);
    },
    
  }
  
}).export(module);

*/