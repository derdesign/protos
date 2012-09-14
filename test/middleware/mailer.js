
var app = require('../fixtures/bootstrap.js'),
    vows = require('vows'),
    assert = require('assert');

vows.describe('Mailer Middleware').addBatch({
  
  '': {
    
    topic: function() {
      app.use('mailer', {
        default: 'sendmail',
        smtp: ['SMTP', {}],
        other: ['SES'],
      });
      return app.mailer;
    },
    
    "Properly configures transports": function(mailer) {
      // default
      assert.equal(mailer.default.transportType, 'SENDMAIL');
      assert.equal(mailer.default.constructor.name, 'Transport');
      assert.isFunction(mailer.default.sendMail);
      
      // smtp
      assert.equal(mailer.smtp.transportType, 'SMTP');
      assert.equal(mailer.smtp.constructor.name, 'Transport');
      assert.isFunction(mailer.smtp.sendMail);
      
      // ses
      assert.equal(mailer.other.transportType, 'SES');
      assert.equal(mailer.other.constructor.name, 'Transport');
      assert.isFunction(mailer.other.sendMail);
    },
    
    "The sendMail method uses the default transport": function(mailer) {
      assert.isFunction(mailer.sendMail);
      assert.isTrue(mailer.sendMail.toString().indexOf('return this.default.sendMail(data, callback);') >= 0);
    },
    
    "Properly renders messages using view partials": function(mailer) {
      
      var expected = {
        html: '<p>Hello John Doe &amp; Jane Doe!</p>\n',
        text: 'Hello John Doe & Jane Doe!\n' 
      };
      
      var message = mailer.renderMessage('mailer_template', {
        one: 'John Doe',
        two: 'Jane Doe'
      });
      
      assert.deepEqual(message, expected);
    }

  }
  
}).export(module);