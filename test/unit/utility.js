
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    net = require('net'),
    EventEmitter = require('events').EventEmitter;

app.logging = false;

var strings, patterns;

vows.describe('lib/utility.js').addBatch({
  
  'Utility::typecast': {
    
    topic: function() {
      return protos.util.typecast;
    },
    
    'Converts integer': function(f) {
      assert.isTrue(f('5') === 5);
    },
    
    'Converts float': function(f) {
      assert.isTrue(f('2.3') === 2.3)
    },
    
    'Converts null': function(f) {
      assert.isNull(f('null'));
    },
    
    'Converts undefined': function(f) {
      assert.isUndefined(f('undefined'));
    },
    
    'Converts boolean': function(f) {
      assert.isTrue(f('true'));
      assert.isFalse(f('false'));
    },
    
  },
  
  'Utility::toCamelCase': {
    
    'Returns valid strings': function() {
      assert.strictEqual(protos.util.toCamelCase('my_test_suite'), 'MyTestSuite');
    }
    
  },
  
  'Utility::parseRange': {
    
    'Parses range strings': function() {
      
      function p(str) {
        return protos.util.parseRange(1000, 'bytes='+str);
      }
      
      assert.deepEqual(p('0-499'), [{start: 0, end: 499}]);
      assert.deepEqual(p('40-80'), [{start: 40, end: 80}]);
      assert.deepEqual(p('-500'), [{start: 500, end: 999}]);
      assert.deepEqual(p('-400'), [{start: 600, end: 999}]);
      assert.deepEqual(p('500-'), [{start: 500, end: 999}]);
      assert.deepEqual(p('400-'), [{start: 400, end: 999}]);
      assert.deepEqual(p('0-0'), [{start: 0, end: 0}]);
      assert.deepEqual(p('-1'), [{start: 999, end: 999}]);
    }
    
  },
  
  'Utility::searchPattern': {
    
    topic: function() {
      return protos.util.searchPattern;
    },
    
    'Detects single match w/ one find': function(f) {
      assert.deepEqual(f('hello world!', 'world'), {world: [6]});
    },
    
    'Detects single match w/ multiple finds': function(f) {
      assert.deepEqual(f('hello world!', ['o']), {o: [4,7]});
    },
    
    'Detects multiple matches w/ one find': function(f) {
      assert.deepEqual(f('hello world', ['o', 'hello']), {o: [4,7], hello: [0]});
    },
    
    'Detects multiple matches w/ multiple finds': function(f) {
      assert.deepEqual(f('hello world', ['o', 'l']), {o: [4,7], l: [2,3,9]});
    }
    
  },
  
  'Utility::extract': {
    
    'Returns an object with the extracted keys': function() {
      assert.deepEqual(protos.util.extract({a:1, b:2, c:3}, ['a','b']), {a:1, b:2});
    }
    
  }
  
}).addBatch({
  
  'Utility::checkLocalPort': {
    
    topic: function() {
      var promise = new EventEmitter();
      var errors = [];
      var port = 9999;
      var server = net.createServer().listen(port);
      server.on('listening', function() {
        protos.util.checkLocalPort(port, function(err) {
          errors.push(err); // err1
          server.close(function() {
            protos.util.checkLocalPort(port, function(err) {
              errors.push(err); // err2
              promise.emit('success', errors); // Send topic
            });
          });
        });
      });
      return promise;
    },
    
    'Detects if a port is in use': function(err) {
      err = err[0];
      assert.isNull(err); // If err1 is null => open port
    },
    
    'Detects if a port is not in use': function(err) {
      err = err[1];
      assert.isTrue(err instanceof Error && err.code == 'ECONNREFUSED'); // If err2 is Error => closed port
    }
    
  }
  
}).addBatch({
  
  'Utility::createRegexPattern': {
    
    topic: function() {
      
      var regexes = []
      regexes.push(protos.util.createRegexPattern('*.css'));
      regexes.push(protos.util.createRegexPattern('*.(css|js)'));
      regexes.push(protos.util.createRegexPattern('hello/[xyz][a-b]{1}[aeiou]{1,3}*.(css|js)'));
      regexes.push(protos.util.createRegexPattern('hello-world/hi\\+there/whoah!.(html|php)'));
      regexes.push(protos.util.createRegexPattern('hi+there'));
      
      return regexes;
    }, 
    
    'Creates valid regexp objects': function(regexes) {
      var typeCheck = regexes.map(function(ob) { return ob instanceof RegExp; });
      assert.deepEqual(typeCheck, [true, true, true, true, true]);
    },
    
    'Creates regexes properly': function(regexes) {
      regexes = regexes.map(function(ob) { return ob.toString(); });
      assert.strictEqual(regexes[0], '/^(.+)\\.css$/');
      assert.strictEqual(regexes[1], '/^(.+)\\.(css|js)$/');
      assert.strictEqual(regexes[2], '/^hello/[xyz][a-b]{1}[aeiou]{1,3}(.+)\\.(css|js)$/');
      assert.strictEqual(regexes[3], '/^hello-world/hi\\+there/whoah!\\.(html|php)$/');
      assert.strictEqual(regexes[4], '/^hi+there$/');
    },
    
    'Patterns are matched successfully': function(regexes) {
      // *.css
      assert.isTrue(regexes[0].test('hello.css'));
      assert.isTrue(regexes[0].test('yeah!.css'));
      assert.isTrue(regexes[0].test('c++.css'));
      assert.isFalse(regexes[0].test('hello-world.less'));
      assert.isFalse(regexes[0].test('c++.styl'));
      
      // *.(css|js)
      assert.isTrue(regexes[1].test('hello.css'));
      assert.isTrue(regexes[1].test('hello-world.css'));
      assert.isTrue(regexes[1].test('hi!.css'));
      assert.isTrue(regexes[1].test('whoah.js'));
      assert.isFalse(regexes[1].test('cool.html'));
      assert.isFalse(regexes[1].test('hi.php'));
      
      // hello/[xyz][a-b]{1}[aeiou]{1,3}*.(css|js)
      assert.isTrue(regexes[2].test('hello/xaeCOOL.css'));
      assert.isFalse(regexes[2].test('hello/xaeCOOL.html'));
      assert.isTrue(regexes[2].test('hello/ybi!.js'));
      assert.isFalse(regexes[2].test('hello/ybi!.php'));
      assert.isFalse(regexes[2].test('hello/anxq.css'));
      
      // /^hello-world/hi\+there/whoah!\\.(html|php)$/
      assert.isTrue(regexes[3].test('hello-world/hi+there/whoah!.html'));
      assert.isFalse(regexes[3].test('hello-world/hi+there/whoah.css'));
      
      // /^hi+there$/
      assert.isTrue(regexes[4].test('hiiiiiiiiiiiiiiiiithere'));
      assert.isFalse(regexes[4].test('hi+there'));
    },
    
    'Accepts an array of patterns (recursive)': function() {
      var patterns = protos.util.createRegexPattern(['hello*.css', 'assets/css/img.(jpg|png|gif)', 'you/(like|eat)/(apples|bananas).txt']);
      assert.isArray(patterns);
      assert.strictEqual(patterns[0].toString(), '/^hello(.+)\\.css$/');
      assert.strictEqual(patterns[1].toString(), '/^assets/css/img\\.(jpg|png|gif)$/');
      assert.strictEqual(patterns[2].toString(), '/^you/(like|eat)/(apples|bananas)\\.txt$/');
    }
    
  }
  
}).addBatch({

  'Utility::filterWithPattern': {

    topic: function() {
      strings = [];
      strings.push('hello/world/1.jpg');
      strings.push('hello/world/howdy.txt');
      strings.push('world/yes.doc');
      strings.push('assets/favicon.png');
      strings.push('magazine/page.tiff');
      
      patterns = [];
      patterns.push('hello/world/*.(jpg|png|tiff)');
      patterns.push('(assets|magazine)/*.(png|tiff)');

      return {strings: strings, patterns: patterns};

    },

    'Filters strings successfully': function(data) {
      var strings = data.strings, patterns = data.patterns;
      var filtered = protos.util.filterWithPattern(strings, patterns);
      assert.deepEqual(filtered, ['hello/world/1.jpg', 'assets/favicon.png', 'magazine/page.tiff']);
    },

    'Returns inverted results (exclusion)': function(data) {
      var strings = data.strings, patterns = data.patterns;
      var inverted = protos.util.filterWithPattern(strings, patterns, true);
      assert.deepEqual(inverted, ['hello/world/howdy.txt', 'world/yes.doc']);
    }

  }

}).addBatch({
  
  'Utility::excludeWithPattern': {
    
    topic: function() { 
      return protos.util.excludeWithPattern(strings, patterns);
    },

    'Successfully excludes strings matching patterns': function(excluded) { 
      assert.deepEqual(excluded, ['hello/world/howdy.txt', 'world/yes.doc']);
    }
    
  }

}).addBatch({
  
  'Utility::walkDir': {
    
    topic: function() {
      var path = protos.constructor.path + '/test/fixtures/compiled-assets';
      var regex = /(coffee|scss)\.txt$/;
      return {
        path: path,
        all: protos.util.walkDir(path),
        filtered: protos.util.walkDir(path, regex)
      }
    },
    
    'Successfully lists files in directory': function(data) {
      var files = data.all;
      assert.equal(files.length, 4);
      assert.equal(files[0], data.path + '/coffee.txt');
      assert.equal(files[1], data.path + '/less.txt');
      assert.equal(files[2], data.path + '/scss.txt');
      assert.equal(files[3], data.path + '/stylus.txt');
    },
    
    'Allows filtering with regular expression': function(data) {
      var files = data.filtered;
      assert.equal(files.length, 2);
      assert.equal(files[0], data.path + '/coffee.txt');
      assert.equal(files[1], data.path + '/scss.txt');
    }
    
  }
  
}).export(module);
