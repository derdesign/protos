
/**
  AMQP (Advanced Message Queue Protocol)
  
  Provides support for RabbitMQ or any other server that implements the AMQP protocol.
  
  » References:
  
    https://github.com/postwait/node-amqp
    http://www.rabbitmq.com/documentation.html
    http://www.rabbitmq.com/man/rabbitmqctl.1.man.html
    http://www.rabbitmq.com/tutorials/amqp-concepts.html

  » Example:
  
    app.use('mq', {
      server: 'amqp://localhost:5672',
      queues: ['my_queue'],
      exchanges: {
        alpha: {type: 'fanout'}
      },
      onInitialize: function(err, queues, exchanges) {
        app.log("MQ Initialized...");
        app.mq.queue('', function(err, q) {
          var counter = 0;
          q.bind(exchanges.alpha, '');
          q.subscribe(function(msg) {
            app.log("mq: " + msg.data.toString('utf8'));
          });
          setInterval(function() {
            counter++;
            exchanges.alpha.publish('', "Hello World! " + counter);
          }, 1000);
        });
      }
    });

 */
 
var app = protos.app,
    Multi = protos.require('multi'),
    amqp = protos.requireDependency('amqp', 'Message Queue Middleware', 'mq');

function MessageQueue(config, middleware) {
  
  var self = this;
  
  // Set app instance
  app[middleware] = this;
  
  // Extend config
  config = protos.extend({
    server: null,
    defaultExchange: null,
    queues: {},
    exchanges: {},
    onBeforeCreate: function(multi) { },
    onInitialize: function(err, queues, exchanges) { }
  }, config);
  
  // Exit if config.server not available
  if (!config.server) throw new Error("MQ: Server is required");
  
  // Set queues
  this.queues = {};
  
  // Set random queues
  this.randomQueues = [];
  
  // Set exchanges
  this.exchanges = {};
  
  // Set connection
  this.connection = amqp.createConnection({
    url: config.server, 
    defaultExchangeName: config.defaultExchange
  });
  
  // Process queues & exchanges on ready
  this.connection.on('ready', function() {
    
    var multi = new Multi(self);
    var qCount = 0;
    var eCount = 0;

    // Queues
    if (config.queues instanceof Array) {
      config.queues.forEach(function(q) {
        qCount++;
        multi.queue(q);
      });
    } else {
      for (var q in config.queues) {
        qCount++;
        multi.queue(q, config.queues[q]);
      }
    }
    
    // Exchanges
    if (config.exchanges instanceof Array) {
      config.exchanges.forEach(function(e) {
        eCount++;
        multi.exchange(e);
      });
    } else {
      for (var e in config.exchanges) {
        eCount++;
        multi.exchange(e, config.exchanges[e]);
      }
    }
    
    // Run config.onBeforeCreate
    config.onBeforeCreate(multi);
    
    // Run multi
    multi.exec(function(err, results) {
      app.emit('mq_init', err, self.queues, self.exchanges);
      config.onInitialize.call(self, err, self.queues, self.exchanges);
    });
  });
  
}

MessageQueue.prototype.queue = function(name, options, callback) {
  var self = this;
  if (!callback) { callback = options; options = {}; }
  if (name && name in this.queues) callback.call(this, null, this.queues[name]);
  else {
    this.connection.queue(name, options, function(queue) {
      if (name) self.queues[name] = queue;
      else self.randomQueues.push(queue);
      callback.call(self, null, queue);
    });
  }
}

MessageQueue.prototype.exchange = function(name, options, callback) {
  var self = this;
  if (!callback) { callback = options; options = {}; }
  if (name in this.exchanges) callback.call(this, null, this.exchanges[name]);
  else {
    this.connection.exchange(name, options, function(exchange) {
      self.exchanges[name] = exchange;
      callback.call(self, null, exchange);
    });
  }
}

module.exports = MessageQueue;
