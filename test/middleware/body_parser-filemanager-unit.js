
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    fs = require('fs'),
    assert = require('assert'),
    EventEmitter = require('events').EventEmitter,
    Multi = protos.require('multi');

var FileManager;

var files = {
  alpha: {path: app.fullPath('incoming/alpha.txt'), size: 16, type: 'text/plain'},
  beta: {path: app.fullPath('incoming/beta.jpg'), size: 16, type: 'image/jpg'},
  gamma: {path: app.fullPath('incoming/gamma.gif'), size: 16, type: 'image/gif'},
  epsilon: {path: app.fullPath('incoming/epsilon.txt'), size: 0, type: 'text/plain'},
  delta: {path: app.fullPath('incoming/delta.png'), size: 5, type: 'image/png'},
}

// Simulates file uploads
function createFiles() {
  for (var file in files) {
    fs.writeFileSync(files[file].path, '', 'utf-8');
  }
}

var loggingStatus;

vows.describe('Body Parser (middleware) » FileManager').addBatch({
  
  'Integrity Checks': {
    
    topic: function() {
      
      app.logging = false;

      if (!app.supports.body_parser) app.use('body_parser');
      
      FileManager = app.body_parser.FileManager;
      
      return true;
      
    },
    
    'maxFilesize defaults to maxUploadSize config setting': function() {
      var fm = new FileManager({});
      assert.equal(fm.defaults.maxFilesize, app.body_parser.config.maxUploadSize);
    }
    
  }
  
}).addBatch({
  
  'FileManager::expect': {
    
    topic: function() {

      var results = [];

      createFiles();
      
      // File expected not present (required)
      var fm = new FileManager(files);
      fm.expect({
        other: {}
      });
      results.push(fm);
      
      // File expected not present (not required)
      createFiles();
      fm = new FileManager(files);
      fm.expect({
        other: {}
      });
      results.push(fm);
      
      // File expected present
      createFiles();
      fm = new FileManager(files);
      fm.expect({
        alpha: {}
      });
      results.push(fm);
      
      // Expected files with wrong mimetypes and size
      createFiles();
      fm = new FileManager(files);
      fm.expect({
        alpha: {
          maxFilesize: 10     // will fail, its size is 16 bytes
        },
        beta: {
          required: true,
          type: 'text/plain'  // will fail, it's mimetype is image/jpg
        }
      });
      results.push(fm);
      
      // Globally restricts on maxFilesize
      createFiles();
      fm = new FileManager(files);
      fm.maxFilesize(10).expect({
        alpha: {
          maxFilesize: 20   // overrides restriction
        },
        beta: {},
        gamma: {},
        epsilon: {},
        delta: {}
      });
      results.push(fm);
      
      // Globally restricts on mimeType
      createFiles();
      fm = new FileManager(files);
      fm.allow('image/png').allow(['image/jpg', 'image/tiff']).expect({
        alpha: {
          type: ['text/javascript', 'text/plain', 'text/css']
        },
        beta: {},
        gamma: {},
        epsilon: {},
        delta: {}
      });
      results.push(fm);
      
      // Globally restricts on mimeType and maxFilesize (only delta matches)
      createFiles();
      fm = new FileManager(files);
      fm.maxFilesize(5).allow('image/png', 'image/jpg').expect({
        alpha: {
          type: ['text/javascript', 'text/plain', 'text/css']
        },
        beta: {},
        gamma: {},
        epsilon: {},
        delta: {}
      });
      results.push(fm);
      
      // Allows empty files if fm.config.noEmptyFiles is false
      createFiles();
      fm = new FileManager(files);
      fm.allowEmpty().expect({
        epsilon: {}
      });
      results.push(fm);
      
      // Removes empty files automatically
      createFiles();
      fm = new FileManager(files);
      fm.expect({
        epsilon: {}
      });
      results.push(fm);
      
      // Automatically expects all given files when expect() run without arguments
      createFiles();
      fm = new FileManager(files);
      fm.expect();
      results.push(fm);
      return results;
    },
    
    'Required File expected n/a => removes all files': function(results) {
      
      var fm = results[0];
      assert.equal(fm.length, 0);
      assert.deepEqual(fm.removed, ['alpha', 'beta', 'gamma', 'epsilon', 'delta']);  // All files removed
    },
    
    'Optional File expected n/a => removes all files': function(results) {
      var fm = results[1];
      assert.equal(fm.length, 0);
      assert.deepEqual(fm.removed, ['alpha', 'beta', 'gamma', 'epsilon', 'delta']);  // All files removed
    },
    
    'File expected present => removes all except required': function(results) {
      var fm = results[2];
      assert.equal(fm.length, 1);
      assert.deepEqual(fm.removed, ['beta', 'gamma', 'epsilon', 'delta']);  // All files except 'alpha' removed
    },
    
    'Removes files not matching filesize and mimetype requirements': function(results) {
      var fm = results[3];
      assert.equal(fm.length, 0);
      assert.deepEqual(fm.removed, ['alpha', 'beta', 'gamma', 'epsilon', 'delta']); // All files removed
    },
    
    'Successfully executes restrictions on maxFilesize': function(results) {
      var fm = results[4];
      assert.equal(fm.length, 2);
      assert.deepEqual(fm.removed, ['beta', 'gamma', 'epsilon']); // All files removed except 'alpha' and 'delta'
    },
    
    'Successfully executes restrictions on mimeType': function(results) {
      var fm = results[5];
      assert.equal(fm.length, 3);
      assert.deepEqual(fm.removed, ['gamma', 'epsilon']); // All files removed except 'alpha', 'beta' and 'delta'
    },
    
    'Successfully restricts on maxFilesize and mimeType': function(results) {
      var fm = results[6];
      assert.equal(fm.length, 1);
      assert.deepEqual(fm.removed, ['alpha', 'beta', 'gamma', 'epsilon']); // All files removed except 'delta'
    },
    
    'Allows empty files if config.noEmptyFiles is false': function(results) {
      var fm = results[7];
      assert.equal(fm.length, 1);
      assert.deepEqual(fm.removed, ['alpha', 'beta', 'gamma', 'delta']);
      assert.deepEqual(fm.files, {
        epsilon: files.epsilon
      });
    },
    
    'Removes empty files by default': function(results) {
      var fm = results[8];
      assert.equal(fm.length, 0);
      assert.deepEqual(fm.removed, ['epsilon', 'alpha', 'beta', 'gamma', 'delta']);
      assert.deepEqual(fm.files, {});
    },
    
    'Automatically expects all files when running expect() w/o arguments': function(results) {
      var fm = results[9];
      assert.equal(fm.length, 4);
      assert.deepEqual(fm.removed, ['epsilon']);
      assert.deepEqual(fm.files, {
        alpha: files.alpha,
        beta: files.beta,
        gamma: files.gamma,
        delta: files.delta
      });
    },
    
    'Returns object with files (filtered)': function() {
      var fm = new FileManager(files);
      assert.isTrue(fm.files === fm.expect({}));
    },
    
  } 
    
}).addBatch({
  
  'FileManager::get': {
    
    topic: function() {
      
      var results = [];
      
      createFiles();
      var fm = new FileManager(files);
      
      fm.expect({
        gamma: {
          type: 'image/gif'
        }
      });
      
      return fm;
      
    },
    
    'Returns the file object if it exists': function(fm) {
      assert.deepEqual(fm.get('gamma'), files.gamma);
    },
    
    'Returns null if file not present': function(fm) {
      assert.isNull(fm.get('hello'));
    }
    
  }
  
}).addBatch({
  
  'FileManager::removeFile': {
    
    topic: function() {
      
      var promise = new EventEmitter();
      var testFilePath = app.fullPath('incoming/test-file.txt');
      
      fs.writeFileSync(testFilePath, '', 'utf-8');
      
      var fm = new FileManager({
        test_file: {
          path: testFilePath,
          size: 16,
          type: 'text/plain'
        }
      });
      
      var results = [fm.removed.concat([])]; // Using concat to get a copy of the array
      
      fm.removeFile('test_file', function(err) {
        
        results.push(err);
        
        fs.exists(testFilePath, function(exists) {
          
          results.push(exists);
          
          results.push(fm.removed);
          
          promise.emit('success', results);
          
        });
        
      });
      
      return promise;
      
    },
    
    'Successfully removes files': function(results) {
      assert.deepEqual(results[0], [])              // removed array empty
      assert.isNull(results[1]);                    // null   => no errors found removing file
      assert.isFalse(results[2]);                   // false  => file does not exist
      assert.deepEqual(results[3], ['test_file']);  // removed array contains removed file
    }

  }
  
}).addBatch({
  
  'FileManager::forEach': {
    
    topic: function() {
      
      var fm = new FileManager(files);
      
      var results = {};
      
      fm.forEach(function(file, data) {
        results[file] = data;
      });
      
      return results;
      
    },
    
    'Properly iterates over files': function(results) {
      assert.deepEqual(results, files);
    }
    
  }
  
}).addBatch({
  
  'FileManager::removeAll': {
    
    topic: function() {
      
      var promise = new EventEmitter();
      
      createFiles();
      var fm = new FileManager(files);
      var unlinkErrors = [];
      
      fm.removeAll(function(err) {
        unlinkErrors.push(err);
        if (unlinkErrors.length == 5) {
          
          var fsm = new Multi(fs);
          
          for (var file in files) {
            fsm.exists(files[file].path);
          }
          
          fsm.exec(function(err, results) {
            
            app.logging = true;
            
            promise.emit('success', {
              fm: fm,
              existResults: arguments,
              unlinkErrors: unlinkErrors
            })
          });
          
        }
      });
      
      return promise;
      
    },
    
    'Removes all files': function(results) {
      assert.deepEqual(results.fm.files, {});
      assert.deepEqual(results.fm.length, 0);
      assert.deepEqual(results.fm.fileKeys, []);
      assert.deepEqual(results.fm.removed, ['alpha', 'beta', 'gamma', 'epsilon', 'delta']);
      assert.deepEqual(results.unlinkErrors, [null, null, null, null, null ]);
      assert.isNull(results.existResults[0]);
      assert.deepEqual(results.existResults[1], ['OK', 'OK', 'OK', 'OK', 'OK']); // Exists is false => no err => 'OK'
    }
    
  }
  
}).export(module);
