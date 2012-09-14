
/**
  Mailer
  
  Provides mail functionality to the application, with full unicode support.
  
  Transports available are SMTP, Amazon SES (Simple Email Service) and sendmail.
  
  » References:
  
    http://github.com/andris9/nodemailer

  » SMTP Example:
  
    app.use('mailer', {
      SMTP: {
        host: 'smtp.example.com',     // required
        port: 25,                     // optional, defaults to 25 or 465
        use_authentication: false,    // optional, false by default
        user: '',                     // used only when use_authentication is true 
        pass: ''                      // used only when use_authentication is true
      }
    });
  
  » Amazon SES Example:
  
    app.use('mailer', {
      SES: {
        AWSAccessKeyID: 'ACCESSKEY',  // required
        AWSSecretKey: 'SECRETKEY',    // required
        ServiceUrl: 'https://email.us-east-1.amazonaws.com', // optional
      }
    });

  » Sendmail Example (default):
  
    app.use('mailer', {
      sendmail: true
    });
    
    app.use('mailer', {
      sendmail: '/path/to/sendmail'
    });
  
 */

var app = protos.app,
    util = require('util'),
    nodemailer = protos.requireDependency('nodemailer', 'Mailer Middleware', 'mailer'),
    Application = app.constructor,
    allowedTransports = ['SMTP', 'SES', 'sendmail'];
    
// http://www.nodemailer.org/

function Mailer(config, middleware) {
  
  // Middleware configuration
  var keys = Object.keys(config);
  if (keys.length === 0) config = {sendmail: true};
  
  // Validate mail transports
  if (keys.length > 1) {
    // More than one transport configuration specified
    throw new Error(util.format("Only one of the following allowed: %s", allowedTransports.join(', ')));
  } else {
    var transport = Object.keys(config).pop();
    if (allowedTransports.indexOf(transport) >= 0) {
      // Configure nodemailer transport
      nodemailer[transport] = config[transport];
    } else {
      // Provided transport not supported
      throw new Error(util.format("Mail transport not supported: '%s'. It should be one of: %s", 
        transport, allowedTransports.join(', ')));
    }
  }
  
}

/**
  Sends mail using the configured transport
  
  @param {object} data
  @public
 */

Application.prototype.sendmail = function(data) {
  return nodemailer.send_mail(data);
}

module.exports = Mailer;