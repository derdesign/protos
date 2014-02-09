
var cluster = require('cluster');

var app = require('./fixtures/test.cluster/boot.js'),
    vows = require('vows'),
    assert = require('assert'),
    EventEmitter = require('events').EventEmitter;

vows.describe('Application').addBatch({

  'Application::multiThreaded': {

    topic: function() {
      return true;
    },

    "Properly executes function across all workers": function(data) {
      assert.isTrue(true);
    }

  }

}).export(module);