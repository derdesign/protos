
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    util = require('util'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;

var sess, shash, storage, sessId, sessHash, guestSessId;

var multi = new Multi(app);

multi.on('pre_exec', app.backupFilters);
multi.on('post_exec', app.restoreFilters);

app.on('load_session', function(sid, session) {
  // Update sessId every time a new user session is created
  if (session.user) { 
    sessId = sid; 
    sessHash = session.fpr; 
  } else if (session.guest) { 
    guestSessId = sid; 
  }
});

// Avoid innecessary duplication of code. Keep the testing environment DRY.

function createUserSessionBatch(persistent) {
  
  return {
    topic: function() {
      var promise = new EventEmitter();
      
      // Request to create a permanent session
      multi.curl('-i -G -d "persistent='+ persistent +'" /session/create/ernie');
      
      multi.exec(function(err, results) {
        // Verify that session is indeed stored
        storage.getHash(sessId, function(err, data) {
          results.push(err || data);
          promise.emit('success', err || results);
        });
      });
      
      return promise;
    },
    
    'Verified cookies & session data (in storage)': function(results) {
      var r = results[0],
          session = results[1] || {};
      
      // Make sure session.pers is an integer, for util.inspect
      if (typeof session == 'object' && session.pers == persistent.toString()) session.pers = persistent;
      
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r.indexOf(util.format('Set-Cookie: %s=%s;', sess, sessId)) >= 0);         // Session ID
      assert.isTrue(r.indexOf(util.format('Set-Cookie: %s=%s;', shash, sessHash)) >= 0);   // Session Hash
      assert.isTrue(r.indexOf(util.inspect(session)) >= 0);
    },
    
    'Cookie expiration dates are accurate': function(results) {
      var r = results[0],
          session = results[1],
          success = false;
      
      // Check expiration date
      
      if (persistent) {
        
        var hashExpire, sessExpire;
        r.split(/\r\n/).forEach(function(line) {
          var expires, hashExpire, sessExpire, shouldExpire;
          if (line.indexOf('=' + sessHash) >= 0) {
            expires = line.slice(line.lastIndexOf('=')+1);
            
            if (expires.indexOf('; httpOnly') > 0) {
              expires = expires.replace('; httpOnly', '');
            } else {
              throw new Error("Sessions are expected to use httpOnly cookies");
            }
            
            hashExpire = new Date(expires).toString();
            hashExpire = hashExpire.slice(0, hashExpire.lastIndexOf(':')); // Second precision
            shouldExpire = new Date(Date.now() + app.session.config.regenInterval*1000).toString();
            shouldExpire = shouldExpire.slice(0, shouldExpire.lastIndexOf(':')); // Second precision
            assert.equal(hashExpire, shouldExpire);   // Check if Expiration matches config
            success = true;
          } else if (line.indexOf('=' + sessId) >= 0) {
            expires = line.slice(line.lastIndexOf('=')+1);
            
            if (expires.indexOf('; httpOnly') > 0) {
              expires = expires.replace('; httpOnly', '');
            } else {
              throw new Error("Sessions are expected to use httpOnly cookies");
            }
            
            sessExpire = new Date(expires).toString();
            sessExpire = sessExpire.slice(0, sessExpire.lastIndexOf(':')); // Second precision
            shouldExpire = new Date(Date.now() + app.session.config.permanentExpires*1000).toString();
            shouldExpire = shouldExpire.slice(0, shouldExpire.lastIndexOf(':')); // Second precision
            assert.equal(sessExpire, shouldExpire);  // Check if Expiration matches config
            success = true;
          }
        });
        
      } else {
        
        // Non-persistent
        var sessID = r.match(/X-Session-Id: (.+)\s+/)[1];
        var targetLine = util.format('Set-Cookie: _sess=%s; path=/; httpOnly', sessID);
        
        r.split(/\r\n/).forEach(function(line) {
          if (line === targetLine) {
            success = true;
          }
        });

      }
      
      assert.isTrue(success);
      
    }
  }
  
}

vows.describe('Session (middleware)').addBatch({
  
  'Guest Sessions disabled': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      app.use('cookie_parser');
      app.use('session', {storage: 'redis', guestSessions: false, salt: 'abc1234'});
      
      // Response should not contain any session cookies
      multi.curl('-i /session');
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'Response should not contain any session cookies': function(results) {
          
      var r1 = results[0];
      assert.strictEqual(r1.indexOf('Set-Cookie'), -1);
    }
    
  }
  
}).addBatch({
  
  'Guest Sessions enabled': {
    
    topic: function() {
      var promise = new EventEmitter();
          
      app.session.config.guestSessions = true;
      storage = app.session.storage;
      sess = app.session.config.sessCookie;
      shash = app.session.config.hashCookie;
      
      var sessRegex = new RegExp(sess + '=(.+);');
      
      // Response should include session cookies
      multi.curl('-i /session');
      
      multi.exec(function(err, results) {
        var matches = results[0].match(sessRegex);
        
        if (matches) {
          var guestCookie = matches[1];
          storage.getHash(guestSessId, function(err, data) {
            results.push(err || data);
            storage.delete(guestSessId, function(err, data) {
              if (err) console.log(err);
              promise.emit('success', err || results);
            });
          });
        } else {
          promise.emit('success', err || results);
        }
      });
      
      return promise;
    },

    'Verified cookies & session data (in storage)': function(results) {
      var r = results[0],
          session = results[1] || {};
          
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r.indexOf(util.format('Set-Cookie: %s=null;', shash)) >= 0);              // Session Hash
      assert.isTrue(r.indexOf(util.format('Set-Cookie: %s=%s;', sess, guestSessId)) >= 0);    // Session ID
      assert.deepEqual(session, {guest: '1'});
    },
    
    'Cookie Expiration dates are accurate': function(results) {
      var r = results[0],
          session = results[1];
          
      // Check expiration date
      var hashExpire, sessExpire;
      r.split(/\r\n/).forEach(function(line) {
        var expires, hashExpire, sessExpire, shouldExpire;
        if (line.indexOf(util.format('%s=null;', shash)) >= 0) {
          expires = line.slice(line.lastIndexOf('=')+1);
          hashExpire = new Date(expires).toString();
          hashExpire = hashExpire.slice(0, hashExpire.lastIndexOf(':')); // Second precision
          shouldExpire = new Date(Date.now() - 3600*1000).toString();
          shouldExpire = shouldExpire.slice(0, shouldExpire.lastIndexOf(':')); // Second precision
          assert.equal(hashExpire, shouldExpire);  // Cookie should have expired
        } else if (line.indexOf('=' + guestSessId) >= 0) {
          
          expires = line.slice(line.lastIndexOf('=')+1);
          
          if (expires.indexOf('; httpOnly') > 0) {
            expires = expires.replace('; httpOnly', '');
          } else {
            throw new Error("Sessions are expected to use httpOnly cookies");
          }
          
          sessExpire = new Date(expires).toString();
          sessExpire = sessExpire.slice(0, sessExpire.lastIndexOf(':')); // Second precision
          shouldExpire = new Date(Date.now() + app.session.config.guestExpires*1000).toString();
          shouldExpire = shouldExpire.slice(0, shouldExpire.lastIndexOf(':')); // Second precision
          assert.equal(sessExpire, shouldExpire);  // Check if Expiration matches config
        }
      });
    }
    
  }
  
}).addBatch({
  
  'Session Creation (persistent)': createUserSessionBatch(1) // Avoid unnecessary repetition
  
}).addBatch({
  
  'Session Creation (temporary)': createUserSessionBatch(0) // Avoid unnecessary repetition
  
}).addBatch({
  
  'Session Operations & Usage': {
    topic: function() {
      var promise = new EventEmitter();
      
      app.session.config.guestSessions = false;
      
      var sessCmd = util.format('-i --cookie "%s=%s; %s=%s" ', sess, sessId, shash, sessHash);
      
      // Session store
      multi.curl(sessCmd + '/session/set/counter/0');
      
      // Session retrieval
      multi.curl(sessCmd + '/session/get/counter');
      
      // Session update
      multi.curl(sessCmd + '/session/incr/counter');    // update
      multi.curl(sessCmd + '/session/get/counter');     // verify
      
      // Session delete
      multi.curl(sessCmd + '/session/delete/counter');  // delete
      multi.curl(sessCmd + '/session/get/counter');     // verify
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'Can store session data': function(results) {
      var r = results[0];
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.equal(r.indexOf('Set-Cookie: '), -1);
      assert.isTrue(r.indexOf('{OK}') >= 0);
    },
    
    'Can retrieve session data': function(results) {
      var r = results[1];
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.equal(r.indexOf('Set-Cookie: '), -1);
      assert.isTrue(r.indexOf('{0}') >= 0);
    },
    
    'Can update session data': function(results) {
      var r1 = results[2],
          r2 = results[3];
      
      // Update request
      assert.isTrue(r1.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.equal(r1.indexOf('Set-Cookie: '), -1);
      assert.isTrue(r1.indexOf('{SUCCESS}') >= 0);
      
      // Verify request
      assert.isTrue(r2.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.equal(r2.indexOf('Set-Cookie: '), -1);
      assert.isTrue(r2.indexOf('{1}') >= 0);
    },
    
    'Can delete session data': function(results) {
      var r1 = results[4],
          r2 = results[5];
      
      // Delete request
      assert.isTrue(r1.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.equal(r1.indexOf('Set-Cookie: '), -1);
      assert.isTrue(r1.indexOf('{OK}') >= 0);
      
      // Verify request
      assert.isTrue(r2.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.equal(r2.indexOf('Set-Cookie: '), -1);
      assert.isTrue(r2.indexOf('{}') >= 0);
    }
    
  }
  
}).addBatch({
  
  'Session Regenerate': {
    topic: function() {
      var promise = new EventEmitter();
      
      var sessCmd = util.format('-i --cookie "%s=%s; %s=%s" ', sess, sessId, shash, sessHash);
      var noSessHash = util.format('-i --cookie "%s=%s" ', sess, sessId);
      
      // Set verify token in session
      multi.curl(sessCmd + '/session/set/token/abc123');
      
      // Access session without a session hash (no session regeneration)
      multi.curl(noSessHash + '/session/noregen');
      
      // Access session without a session hash (will force session regeneration)
      multi.curl(noSessHash + '/session');
      
      multi.exec(function(err, results) {
        if (err) {
          promise.emit('success', err);
        } else {
          
          // Detect new Session ID
          var matches;
          
          results[2].split(/\r\n/).forEach(function(line) {
            
            var re = new RegExp(util.format('Set-Cookie: %s=([^;]+);', sess));
            
            matches = line.match(re);
            
            if (matches) {
              sessId = matches[1].split(';')[0];
              results.push(sessId);
              
              storage.getHash(sessId, function(err, data) {
                results.push(err || data.token);
                promise.emit('success', results);
              });
            }
          });
        }
      });
      
      return promise;
    },
    
    'Session regenerates successfully': function(results) {
      var r1 = results[0],
          r2 = results[1],
          r3 = results[2],
          sid = results[3],
          token = results[4];
          
      // console.log(r1);
      // console.log('--');
      // console.log(r2);
      // console.log('--');
      // console.log(r3);
          
      // Since we're reusing the previous test case session (in which we created a temporary 
      // session) we need to compare against the temporaryExpires value instead of permanentExpires.

      var shouldExpire = new Date(Date.now() + app.session.config.temporaryExpires*1000);
      
      // Store request
      assert.isTrue(r1.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r1.indexOf('{OK}') >= 0);
      
      // Session should be loaded without regenerating
      assert.isTrue(r2.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r2.indexOf('Set-Cookie:') === -1);
      assert.isTrue(r2.indexOf('{SESSION CONTROLLER}') >= 0);

      // Regenerate request
      assert.isTrue(r3.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r3.indexOf('{SESSION CONTROLLER}') >= 0);
      
      // Verify that regenerated session expires correctly
      assert.isTrue(r3.indexOf(util.format('Set-Cookie: _sess=%s; path=/; httpOnly\r\n', sid)) >= 0);
      
      // Verify that the token is on the new session
      assert.equal(token, 'abc123');
    }
  }
  
}).addBatch({
  
  'Session Destroy': {
    topic: function() {
      var promise = new EventEmitter();

      var sessCmd = util.format('-i --cookie "%s=%s; %s=%s" ', sess, sessId, shash, sessHash);

      // Verify token presence
      multi.curl(sessCmd + '/session/get/token');
      
      // Destroy the session
      multi.curl(sessCmd + '/session/destroy/' + sessId);
      
      // Verify session removal
      multi.curl(sessCmd + '/session/get/token');
      
      multi.exec(function(err, results) {
        // Verify that session data has been removed from storage
        storage.getHash(sessId, function(err, data) {
          
          // Append session data
          results.push(err || data);
          
          // Return promise
          promise.emit('success', err || results);
        });
      });

      return promise;
    },

    'Session destroys successfully': function(results) {
      var r1 = results[0],
          r2 = results[1],
          r3 = results[2],
          sessData = results[3];
      
      // Assert that session token is present
      assert.isTrue(r1.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.equal(r1.indexOf('Set-Cookie: '), -1);
      assert.isTrue(r1.indexOf('{abc123}') >= 0);
      
      // Assert that session is destroyed
      assert.isTrue(r2.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r2.indexOf(util.format('Set-Cookie: %s=null; ', sess)) >= 0);
      assert.isTrue(r2.indexOf(util.format('Set-Cookie: %s=null; ', shash)) >= 0);
      assert.isTrue(r2.indexOf('{SUCCESS}') >= 0);
      
      // Assert that proper response is sent
      assert.isTrue(r3.indexOf('HTTP/1.1 200 OK') >= 0);
      
      // Assert that session not present in storage
      assert.isTrue(r3.indexOf('{}') >= 0);
      
      // Assert that invalid session cookies are removed
      assert.isTrue(r3.indexOf(util.format('Set-Cookie: %s=null; ', sess)) >= 0);
      assert.isTrue(r3.indexOf(util.format('Set-Cookie: %s=null; ', shash)) >= 0);
    }
  }
  
}).addBatch({

  'Browser Sessions': {

    topic: function() {

      var promise = new EventEmitter();

      var sessCmd = util.format('-i --cookie "%s=%s; %s=%s" ', sess, sessId, shash, sessHash);

      var results = [];

      app.curl('-i /session/create/browser-session', function(err, buf) {
        
        results.push(err || buf);

        var sessCmd = util.format('-i --cookie "%s=%s; %s=%s" ', sess, sessId, shash, sessHash);

        storage.client.ttl(sessId, function(err, ttl) {
          
          results.push(err || ttl);
          
          promise.emit('success', err || results);
          
        });
          

      });

      return promise;

    },

    'Browser Cookies are properly set': function(results) {
      var r = results[0];
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r.indexOf(util.format('Set-Cookie: _sess=%s; path=/', sessId)) >= 0); // Browser session cookie
      assert.isTrue(r.indexOf(util.format('Set-Cookie: _shash=%s; path=/; expires=', sessHash)) >= 0);
    },

    'Uses defaultExpires as expiration (ttl check)': function(results) { // when temporaryExpires is set to zero
      var r = results[1];
      assert.isTrue(r <= (app.session.config.defaultExpires));
      assert.isTrue(r > (app.session.config.defaultExpires - 10));
    }

  }

}).addBatch({
  
  'Static View Sessions': {

    topic: function() {
      
      var promise = new EventEmitter();

      var sessCmd = util.format('-i --cookie "%s=%s; %s=%s" ', sess, sessId, shash, sessHash);

      multi.curl(sessCmd + '-i /session-test');
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });

      return promise;
      
    },
    
    'Are properly loaded': function(results) {
      var r = results[0];
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r.indexOf('VerifyPID: ' + process.pid) >= 0);
    }
    
  }
  
}).export(module);
