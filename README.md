# Protos [![Build Status](https://secure.travis-ci.org/derdesign/protos.png)](http://travis-ci.org/derdesign/protos)

Protos is a Web Application Framework, focused on high performance, integration, ease of 
deployment, maintainability and security. Runs on UNIX-like systems such as **Linux**, **FreeBSD** & **Mac OSX**.

**Note**: _Protos is under moderate development, and its internals can change quite often. Additionally, the documentation
may not reflect the current state of the framework._

## Features at a Glance

- Powerful Routing & Validation
- Controller Authentication & Filters
- REST Compliant Routing
- Environment based Configuration
- Fast Configuration with bootstrap file
- Multi Core Cluster support
- Easy Deployment
- Database Drivers & Storages: MongoDB, MySQL, PostgreSQL, Redis
- Message Queue: RabbitMQ
- ORM Models, Supporting Relationships
- Query Caching for Drivers & Models
- Multiple Template Engines Supported
- View Helpers
- View Partials
- JSON Responses
- Proxy Server for Multiple Applications
- Node Inspector for debugging
- Command Line Executable to create & manage apps
- Organized Directory Structure
- Includes complete test suite

## Middleware

- [asset_compiler](http://derdesign.github.com/protos/middleware#asset_compiler) &nbsp; *Compiles LESS, Stylus and CoffeeScript. Supports watch/compress/minify*
- [aws](http://derdesign.github.com/protos/middleware#aws) &nbsp; *Amazon Web Services. Provides clients to all services (ES3, EC2, etc)*
- [bcrypt](http://derdesign.github.com/protos/middleware#bcrypt) &nbsp; *Blowfish hashing*
- [body_parser](http://derdesign.github.com/protos/middleware#body_parser) &nbsp; *Allows Parsing of POST & PUT requests & file uploads*
- [cookie_parser](http://derdesign.github.com/protos/middleware#cookie_parser) &nbsp; *Cookie Parsing*
- [csrf](http://derdesign.github.com/protos/middleware#csrf) &nbsp; *CSRF Protection*
- [logger](http://derdesign.github.com/protos/middleware#logger) &nbsp; *Logger. Supported transports: MongoDB, Redis, File & console*
- [magick](http://derdesign.github.com/protos/middleware#magick) &nbsp; *Image Processing using ImageMagick*
- [mailer](http://derdesign.github.com/protos/middleware#mailer) &nbsp; *Mailer. Supports SMTP, SES or Sendmail*
- [ markdown ](http://derdesign.github.com/protos/middleware#markdown) &nbsp; *Markdown Parser*
- [mq](http://derdesign.github.com/protos/middleware#mq) &nbsp; *Message Queue using RabbitMQ*
- [repl](http://derdesign.github.com/protos/middleware#repl) &nbsp; *Appliction Runtime REPL*
- [response_cache](http://derdesign.github.com/protos/middleware#response_cache) &nbsp; *Response Caching*
- [session](http://derdesign.github.com/protos/middleware#session) &nbsp; *Sessions Support*
- [shortcode](http://derdesign.github.com/protos/middleware#shortcode) &nbsp; *WordPress-like shortcodes*
- [socket_io](http://derdesign.github.com/protos/middleware#socket_io) &nbsp; *Socket.io integration*
- [static_server](http://derdesign.github.com/protos/middleware#static_server) &nbsp; *Static Server. Supports ranges, Conditional GETs*

## Template Engines

- [CoffeeKup](https://github.com/mauricemach/coffeekup)
- [DoT](https://github.com/olado/doT)
- [Eco](https://github.com/sstephenson/eco)
- [EJS](https://github.com/visionmedia/ejs)
- [Haml](https://github.com/visionmedia/haml.js)
- [Haml-Coffee](https://github.com/9elements/haml-coffee)
- [Handlebars](https://github.com/wycats/handlebars.js)
- [Hogan.js](https://github.com/twitter/hogan.js)
- [Jade](https://github.com/visionmedia/jade)
- [Jazz](https://github.com/shinetech/jazz)
- [JQuery Templates](https://github.com/kof/node-jqtpl)
- [JSHtml](https://github.com/LuvDaSun/jshtml)
- [Kernel](https://github.com/c9/kernel)
- [Liquor](https://github.com/chjj/liquor)
- [Swig](https://github.com/paularmstrong/swig)
- [Whiskers](https://github.com/gsf/whiskers.js/tree)

## Resources

- [API Documentation](http://derdesign.github.com/protos/docs/index.html)
- [Google Groups Discussion](https://groups.google.com/group/protos-web-framework)
- [Github Repository](http://github.com/derdesign/protos)

## License

Copyright (c) 2012, Ernesto Méndez (github.com/derdesign)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation 
files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, 
modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software 
is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES 
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS 
BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT 
OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
