
require('../lib/extensions.js');

var fs = require('fs'),
    cp = require('child_process'),
    vows = require('vows'),
    assert = require('assert'),
    pathModule = require('path'),
    util = require('util'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;

var cwd = process.cwd(),
    tmp = pathModule.resolve('./test/fixtures/tmp');

var skeleton = fs.readdirSync(cwd + '/skeleton/');
var prefix = '../../../';

var jsLibs = require('../client/javascript.json');
var jQueryVersion = jsLibs.jquery.version;
var emberVersion = jsLibs.ember.version;

var protos = new Multi({
  command: function(str, callback) {
    cp.exec(util.format(prefix + 'bin/protos %s', str), function(err, stdout, stderr) {
      if (err) callback(err, stderr.trim());
      else callback(null, stdout.trim());
    });
  }
});

vows.describe('Command Line Interface').addBatch({
  
  'Preliminaries': {
    
    topic: function() {
      var promise = new EventEmitter();
      process.chdir('test/fixtures');
      cp.exec('rm -Rf tmp', function(err, stdout, stderr) {
        fs.mkdirSync('tmp');
        process.chdir('tmp');
        promise.emit('success', process.cwd());
      });
      return promise;
    },
    
    "Created temp directory": function(cwd) {
      assert.strictEqual(tmp, cwd);
    }
    
  }
  
}).addBatch({
  
  'protos create': {
    
    topic: function() {
      var promise = new EventEmitter(),
          results = [];
      
      protos.command('create myapp --domain protos.org --js jquery prototype --css bootstrap --model posts comment --controller admin dashboard');
      protos.command('create myapp1 --mustache --controller test');
      
      protos.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    "Creates application skeleton": function(results) {
      var r1 = results[0], 
          r2 = results[1];
      var expected = '» Successfully created myapp\n» Created myapp/app/models/posts.js\n» \
Created myapp/app/models/comments.js\n» Created myapp/app/controllers/admin.js\n» \
Created myapp/app/controllers/dashboard.js\n» Created myapp/app/helpers/admin.js\n» \
Created myapp/app/helpers/dashboard.js\n» Created myapp/app/views/admin/admin-index.html\n» \
Created myapp/app/views/dashboard/dashboard-index.html\n» \
Downloading Bootstrap CSS Toolkit from Twitter\n» \
Downloading jQuery JavaScript Library\n» \
Downloading Prototype JavaScript Framework';

      assert.equal(r1, expected);
      assert.deepEqual(fs.readdirSync('myapp'), skeleton);
      
      expected = '» Successfully created myapp1\n» Created myapp1/app/controllers/test.js\n» \
Created myapp1/app/helpers/test.js\n» Created myapp1/app/views/main/main-index.mustache\n» \
Created myapp1/app/views/test/test-index.mustache';
      
      assert.equal(r2, expected);
      assert.deepEqual(fs.readdirSync('myapp1'), skeleton);

    },
    
    "Creates .mustache templates when specified": function() {
      assert.isFalse(fs.existsSync('myapp1/app/views/main/main-index.html'));
      assert.isTrue(fs.existsSync('myapp1/app/views/main/main-index.mustache'));
      assert.isTrue(fs.existsSync('myapp1/app/views/test/test-index.mustache'));
    },
    
    "Downloads assets & libraries": function() {
      assert.isTrue(fs.existsSync('myapp/public/js/jquery-' + jQueryVersion + '.min.js'));
      assert.isTrue(fs.existsSync('myapp/public/js/prototype.js'));
      assert.isTrue(fs.existsSync('myapp/public/css/bootstrap/css/bootstrap-responsive.css'));
    },
    
    "Creates models": function() {
      assert.isTrue(fs.existsSync('myapp/app/models/posts.js'));
      assert.isTrue(fs.existsSync('myapp/app/models/comments.js'));
    },
    
    "Creates controllers": function() {
      assert.isTrue(fs.existsSync('myapp/app/controllers/admin.js'));
      assert.isTrue(fs.existsSync('myapp/app/controllers/dashboard.js'));
    },
    
    "Creates helpers": function() {
      assert.isTrue(fs.existsSync('myapp/app/helpers/admin.js'));
      assert.isTrue(fs.existsSync('myapp/app/helpers/dashboard.js'));
    },
    
    "Creates views": function() {
      assert.isTrue(fs.existsSync('myapp/app/views/admin/admin-index.html'));
      assert.isTrue(fs.existsSync('myapp/app/views/dashboard/dashboard-index.html'));
    }
    
  }
  
}).addBatch({
  
  'protos controller': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      process.chdir('myapp1');
      prefix += '../';
      protos.command('controller blog admin');
      protos.command('controller cool --nohelper');
      
      protos.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    "Properly generates controllers": function(results) {
      var r1 = results[0];
      var expected =  '» Created myapp1/app/controllers/blog.js\n» Created myapp1/app/controllers/admin.js\n» \
Created myapp1/app/helpers/blog.js\n» Created myapp1/app/helpers/admin.js\n» \
Created myapp1/app/views/blog/blog-index.html\n» Created myapp1/app/views/admin/admin-index.html';

      assert.equal(r1, expected);
      assert.isTrue(fs.existsSync('app/controllers/blog.js'));
      assert.isTrue(fs.existsSync('app/controllers/admin.js'));
      assert.isTrue(fs.existsSync('app/helpers/blog.js'));
      assert.isTrue(fs.existsSync('app/helpers/admin.js'));
      assert.isTrue(fs.existsSync('app/views/blog/blog-index.html'));
      assert.isTrue(fs.existsSync('app/views/admin/admin-index.html'));
      
    },
    
    "Skips helpers when using --nohelper": function(results) {
      var r1 = results[1];
      var expected = '» Created myapp1/app/controllers/cool.js\n» Created myapp1/app/views/cool/cool-index.html';
      
      assert.equal(r1, expected);
      assert.isTrue(fs.existsSync('app/controllers/cool.js'));
      assert.isFalse(fs.existsSync('app/helpers/cool.js'));
      assert.isTrue(fs.existsSync('app/views/cool/cool-index.html'));
      
    }
    
  }
  
}).addBatch({
  
    'protos model': {

      topic: function() {
        var promise = new EventEmitter();

        protos.command('model posts comments');

        protos.exec(function(err, results) {
          promise.emit('success', err || results);
        });

        return promise;
      },

      "Properly generates models": function(results) {
        var r1 = results[0];
        var expected =  '» Created myapp1/app/models/posts.js\n» Created myapp1/app/models/comments.js';

        assert.equal(r1, expected);
        assert.isTrue(fs.existsSync('app/models/posts.js'));
        assert.isTrue(fs.existsSync('app/models/comments.js'));

      }

    }
  
}).addBatch({
  
  'protos helper': {

    topic: function() {
      var promise = new EventEmitter();

      protos.command('helper helper1 helper2');

      protos.exec(function(err, results) {
        promise.emit('success', err || results);
      });

      return promise;
    },

    "Properly generates helpers": function(results) {
      var r1 = results[0];
      var expected =  '» Created myapp1/app/helpers/helper1.js\n» Created myapp1/app/helpers/helper2.js';

      assert.equal(r1, expected);
      assert.isTrue(fs.existsSync('app/helpers/helper1.js'));
      assert.isTrue(fs.existsSync('app/helpers/helper2.js'));

    }

  }
  
}).addBatch({
  
  'protos view': {

    topic: function() {
      var promise = new EventEmitter();

      protos.command('view main/info blog/post admin/settings.jade,update.mustache,user');
      protos.command('view main/m1 blog/m2 admin/m3 --ext eco.html');

      protos.exec(function(err, results) {
        promise.emit('success', err || results);
      });

      return promise;
    },

    "Properly generates views": function(results) {
      var r1 = results[0];
      
      var expected = '» Created myapp1/app/views/main/main-info.html\n» Created myapp1/app/views/blog/blog-post.html\n» \
Created myapp1/app/views/admin/settings.jade\n» Created myapp1/app/views/admin/update.mustache\n» \
Created myapp1/app/views/admin/admin-user.html';

      assert.equal(r1, expected);
      assert.isTrue(fs.existsSync('app/views/main/main-info.html'));
      assert.isTrue(fs.existsSync('app/views/blog/blog-post.html'));
      assert.isTrue(fs.existsSync('app/views/admin/settings.jade'));
      assert.isTrue(fs.existsSync('app/views/admin/update.mustache'));
      assert.isTrue(fs.existsSync('app/views/admin/admin-user.html'));
    },
    
    "Uses custom extensions when using --ext": function(results) {
      var r2 = results[1];
      var expected =  '» Created myapp1/app/views/main/main-m1.eco.html\n» \
Created myapp1/app/views/blog/blog-m2.eco.html\n» Created myapp1/app/views/admin/admin-m3.eco.html';

      assert.equal(r2, expected);
      assert.isTrue(fs.existsSync('app/views/main/main-m1.eco.html'));
      assert.isTrue(fs.existsSync('app/views/blog/blog-m2.eco.html'));
      assert.isTrue(fs.existsSync('app/views/admin/admin-m3.eco.html'));
    }
    
    

  }
  
}).addBatch({
  
    'protos partial': {

      topic: function() {
        var promise = new EventEmitter();

        protos.command('partial blog/post admin/widget');
        protos.command('partial blog/post admin/widget --ext coffee');

        protos.exec(function(err, results) {
          promise.emit('success', err || results);
        });

        return promise;
      },

      "Properly generates view partials": function(results) {
        var r1 = results[0];
        var expected =  '» Created myapp1/app/views/blog/partials/post.html\n» Created myapp1/app/views/admin/partials/widget.html';

        assert.equal(r1, expected);
        assert.isTrue(fs.existsSync('app/views/blog/partials/post.html'));
        assert.isTrue(fs.existsSync('app/views/admin/partials/widget.html'));
      },

      "Uses custom extensions when using --ext": function(results) {
        var r2 = results[1];
        var expected =  '» Created myapp1/app/views/blog/partials/post.coffee\n» Created myapp1/app/views/admin/partials/widget.coffee';

        assert.equal(r2, expected);
        assert.isTrue(fs.existsSync('app/views/blog/partials/post.coffee'));
        assert.isTrue(fs.existsSync('app/views/admin/partials/widget.coffee'));
      }

    }
    
}).addBatch({

  'protos layout': {
    
    topic: function() {
      var promise = new EventEmitter();

      protos.command('layout sidebar/display,posts.jade,pages hello.mustache nice/partial');
      protos.command('layout hello hi/there/another/dir/test --ext mustache');

      protos.exec(function(err, results) {
        promise.emit('success', err || results);
      });

      return promise;
    },

    "Properly generates layout partials": function(results) {
      var r1 = results[0];
      var expected =  '» Created myapp1/app/views/__layout/sidebar/display.html\n» Created myapp1/app/views/__layout/sidebar\
/posts.jade\n» Created myapp1/app/views/__layout/sidebar/pages.html\n» Created myapp1/app/views/__layout/hello.mustache\n» \
Created myapp1/app/views/__layout/nice/partial.html';
      
      assert.equal(r1, expected);
      assert.isTrue(fs.existsSync('app/views/__layout/sidebar/display.html'));
      assert.isTrue(fs.existsSync('app/views/__layout/sidebar/posts.jade'));
      assert.isTrue(fs.existsSync('app/views/__layout/sidebar/pages.html'));
      assert.isTrue(fs.existsSync('app/views/__layout/hello.mustache'));
      assert.isTrue(fs.existsSync('app/views/__layout/nice/partial.html'));
    },

    "Uses custom extensions when using --ext": function(results) {
      var r2 = results[1];
      var expected =  '» Skipping myapp1/app/views/__layout/hello.mustache: file exists\n» Created myapp1/app/views/__layout/hi/there/another/dir/test.mustache';
      
      assert.equal(r2, expected);
      assert.isTrue(fs.existsSync('app/views/__layout/hello.mustache'));
      assert.isTrue(fs.existsSync('app/views/__layout/hi/there/another/dir/test.mustache'));
    }
    
  }

}).addBatch({
  
  'protos static': {

    topic: function() {
      var promise = new EventEmitter();

      protos.command('static category/post,archive.jade,display about archive/2009/09/index,display.mustache');
      protos.command('static some/view view --ext jade');

      protos.exec(function(err, results) {
        promise.emit('success', err || results);
      });

      return promise;
    },

    "Properly generates layout partials": function(results) {
      var r1 = results[0];
      var expected =  '» Created myapp1/app/views/__static/category/post.html\n» Created myapp1/app/views/__static/category/\
archive.jade\n» Created myapp1/app/views/__static/category/display.html\n» Created myapp1/app/views/__static/about.html\n» \
Created myapp1/app/views/__static/archive/2009/09/index.html\n» Created myapp1/app/views/__static/archive/2009/09/display\
.mustache';
      
      assert.equal(r1, expected);
      assert.isTrue(fs.existsSync('app/views/__static/category/post.html'));
      assert.isTrue(fs.existsSync('app/views/__static/category/archive.jade'));
      assert.isTrue(fs.existsSync('app/views/__static/category/display.html'));
      assert.isTrue(fs.existsSync('app/views/__static/about.html'));
      assert.isTrue(fs.existsSync('app/views/__static/archive/2009/09/index.html'));
      assert.isTrue(fs.existsSync('app/views/__static/archive/2009/09/display.mustache'));
    },

    "Uses custom extensions when using --ext": function(results) {
      var r2 = results[1];
      var expected =  '» Created myapp1/app/views/__static/some/view.jade\n» Created myapp1/app/views/__static/view.jade';
      
      assert.equal(r2, expected);
      assert.isTrue(fs.existsSync('app/views/__static/some/view.jade'));
      assert.isTrue(fs.existsSync('app/views/__static/view.jade'));
    }

  }
  
}).addBatch({
  
  'protos fetch': {

    topic: function() {
      var promise = new EventEmitter();

      protos.command('fetch --js ember --css skeleton');

      protos.exec(function(err, results) {
        promise.emit('success', err || results);
      });

      return promise;
    },

    "Properly downloads & extracts assets into public/": function(results) {
      var r1 = results[0];
      var expected = '» Downloading Skeleton Mobile-Friendly Responsive Framework\n» Downloading Ember.js JavaScript Framework';
      assert.equal(r1, expected);
      assert.isTrue(fs.existsSync('public/js/ember-' + emberVersion + '.min.js'));
      assert.isTrue(fs.existsSync('public/css/skeleton'));
    }

  }
  
}).addBatch({
  
  'Cleanup': {
    
    topic: function() {
      var promise = new EventEmitter();

      process.chdir('../');
      cp.exec('rm -Rf myapp myapp1', function(err, stdout, stderr) {
        promise.emit('success', err);
      });

      return promise;
    },

    "Removed test applications": function(err) {
      assert.isNull(err);
    }
    
  }
  
}).export(module);
