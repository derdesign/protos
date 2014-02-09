
var app;
var messages = [];
var processes = 4, counter = 0, pass = 0;
var vows = require('vows');
var assert = require('assert');
var cluster = require('cluster');

var spec = require('../../../node_modules/vows/lib/vows/reporters/spec.js');
var batch = batch = vows.describe('Application::multiThreaded');

module.exports = require('../../../lib/protos.js').bootstrap(__dirname, {

  server: {
    multiProcess: processes,
  },
  
  events: {

    worker_message: function(msg) {
      if (msg instanceof Array && msg[0] === 'GOT_MESSAGE') {
        messages.push(msg);
        if (++counter === processes) {
          if (counter === 4) {
            if (pass === 1) {
              app.emit('finished_first_pass');
            } else {
              batch.addBatch({
                'Properly executes tasks on all workers': function() {
                  var expected = [];
                  for (var key in cluster.workers) {
                    expected.push(['GOT_MESSAGE', cluster.workers[key].process.pid]);
                  }
                  assert.deepEqual(messages, expected.concat(expected));
                }
              });
              app.emit('all_tests_finished');
            }
          }
        }
      }
    },
    
    all_tests_finished: function() {
      batch.run({
        reporter: spec
      }, function(tests) {
        setTimeout(function() {
          console.log('');
          process.exit((tests.broken || tests.errored) ? 1 : 0); // Report error to shell
        }, 400);
      });
    },
    
    workers_up: function() {
      app.log('Running tasks from master => worker');
      pass++; this.helloWorld();
      app.on('finished_first_pass', function() {
        app.log('Running tasks from worker => master');
        pass++; counter = 0;
        cluster.workers['1'].send(['run']);
      });
    },
    
    master_message: function(msg) {
      if (msg instanceof Array && msg[0] === 'run') {
        this.helloWorld();
      }
    },
    
    pre_init: function(instance) {
      app = instance;
    },
    
    init: function(app) {
      app.helloWorld = app.multiThreaded('task_id', function() {
        app.log("Running task on pid %d", process.pid);
        process.send(['GOT_MESSAGE', process.pid]);
      });
    }

  }

}).app;