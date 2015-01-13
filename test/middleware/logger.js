
var app = require('../fixtures/bootstrap'),
    fs = require('fs'),
    vows = require('vows'),
    assert = require('assert'),
    cp = require('child_process'),
    EventEmitter = require('events').EventEmitter;

var logging = app.logging;

var logMessage, redis, mongodb;

app.on('test_log', function(log) {
  redis = app.logger.transports.test.redis;
  mongodb = app.logger.transports.test.mongodb;
  logMessage = log.trim();
});

var accessLogMessage;

app.on('access_log', function(log) {
  accessLogMessage = log;
});

app.on('nice_log', function(log) {
  mutedLogs.push(log);
});

var mutedLogs = [];

vows.describe('Logger (middleware)').addBatch({
  
  'Log Transports': {
    
    topic: function() {
      
      var promise = new EventEmitter();
      
      cp.exec('mongo test --eval "db.test_log.drop()"', function(err, stdout, stdin) { // Cleanup test_log collection before proceeding
        
        if (/(true|false)\n/.test(stdout)) {
          
          var db = app.config.drivers;
          var sto = app.config.storages;
      
          fs.writeFileSync(app.fullPath('/log/test.log'), '', 'utf-8');
          fs.writeFileSync(app.fullPath('/log/json.log'), '', 'utf-8');
      
          // Remove date from json log data, test filter
          app.on('test_log_json', function(log) {
            log.pid = process.pid;
            delete log.date;
          });
      
          app.use('logger', {
            accessLog: {
              format: 'default',
              file: 'access.log',
              console: false
            },
            levels: {
              info: null,
              error: null,
              nice: {console: true},
              test: {
                file: 'test.log',
                console: true,
                json: {
                  stdout: true,
                  filename: 'json.log',
                  transports: {
                    mongodb: {
                      host: db.mongodb.host,
                      port: db.mongodb.port,
                      database: db.mongodb.database
                    }
                  }
                },
                mongodb: {
                  host: db.mongodb.host,
                  port: db.mongodb.port,
                  logLimit: 1
                },
                redis: {
                  host: sto.redis.host,
                  port: sto.redis.port,
                  logLimit: 1
                }
              }
            }
          });
      
          app.locals.nativeLog = {msg: "This log should be stored as native JSON", date: new Date().toGMTString()};
      
          app.testLog('This event should be logged!');
      
          app.logger.mute('nice');
      
          app.niceLog('IF YOU SEE THIS, MUTED LOGS ARE NOT WORKING');
      
          app.logger.unmute('nice');
      
          app.niceLog('If you see this, then muted logs are working');
      
          setTimeout(function() {
        
            var results = {};
        
            var collection = app.logger.transports.test.mongodb.collection;
        
            collection.find({}, function(err, cursor) {

              cursor.toArray(function(err, docs) {
            
                var doc = docs.pop();
            
                results.mongodb = (docs.length === 0 && doc.log === logMessage);
            
                var redis = app.logger.transports.test.redis.client;
                redis.lrange('test_log', 0, -1, function(err, res) {
                  if (err) results.redis = err;
                  else {
                    var doc = res.pop();
                    results.redis = (res.length === 0 && doc == logMessage);
                  }
              
                  results.file = fs.readFileSync(app.fullPath('/log/test.log', 'utf-8')).toString().trim() === logMessage;
              
                  var expectedJson = '{"level":"test","host":"localhost","msg":"This event should be logged!","pid":' + process.pid + '}';
                  var obtainedJson = fs.readFileSync(app.fullPath('/log/json.log', 'utf-8')).toString().trim();
              
                  results.json = expectedJson == obtainedJson;
              
                  // Test native logs
                  app.logger.transports.test.mongodb.write(app.locals.nativeLog);
              
                  collection = app.logger.transports.test.mongodb.collection;
              
                  collection.find({}, function(err, cursor) {
                    cursor.toArray(function(err, docs) {
                      var doc = docs.pop();
                      results.native = (doc.log.msg == app.locals.nativeLog.msg && doc.log.date == app.locals.nativeLog.date);
                  
                      // Test log forwarding
                  
                      app.logger.transports.test.json.otherTransports.mongodb.collection.find({}, function(err, cursor) {
                        cursor.toArray(function(err, docs) {
                          var doc = docs.pop();

                          // Forwarding is tested by comparing the logged message in MongoDB (coming from a json log)
                          // and then comparing it with the regular logMessage.
                          results.forwarding = (logMessage.slice(-doc.log.msg.length) === doc.log.msg) 
                            && logMessage.indexOf(doc.log.msg) === 39;
                      
                          promise.emit('success', results);
                      
                        });
                      });
                  
                    });
                  });
              
                });
            
              });
            });
        
          }, 1000);
          
        } else {
          
          throw new Error("MongoDB cleanup command failed");
          
        }
        
      });
      
      return promise;
      
    },
    
    "Stores logs using the JSON Transport": function(results) {
      
      console.log('');
      
      assert.isTrue(results.json);
    },
    
    "Stores logs using the File Transport": function(results) {
      assert.isTrue(results.file);
    },
    
    "Stores logs using the Redis Transport": function(results) {
      assert.isTrue(results.redis);
    },
    
    "Stores logs using the MongoDB Transport": function(results) {
      assert.isTrue(results.mongodb);
    },
    
    "MongoDB Transport stores native JSON logs": function(results) {
      assert.isTrue(results.native);
    },
    
    "Successfully forwards logs to other Transports": function(results) {
      assert.isTrue(results.forwarding);
    },
    
  }
  
}).addBatch({
  
  'Access Log': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      var logFile = app.fullPath('/log/access.log');
      
      fs.writeFileSync(logFile, '', 'utf-8');
      
      app.curl('/', function(err, res) {
        
        console.log('');
        
        if (err) promise.emit('success', err);
        else {
          
          // Account for Disk I/O
          setTimeout(function() {
            
            var buf = fs.readFileSync(logFile, 'utf-8').toString().trim();
            
            promise.emit('success', buf);
            
          }, 300); 
          
        }
      });
      
      return promise;
    },
    
    "Successfully stores access logs": function(log) {
      assert.equal(log, accessLogMessage);
    }
    
  }
  
}).addBatch({
  
  'Muted Logs': {
    
    'Successfully mutes/unmutes logs': function() {
      var comp = '[nice] If you see this, then muted logs are working';
      var log = mutedLogs.pop();
      log = log.slice(log.length - comp.length);
      assert.strictEqual(mutedLogs.length, 0); // There should only be 1 log, since the first one was muted
      assert.strictEqual(log, comp);
    }
    
  }
  
}).export(module);
