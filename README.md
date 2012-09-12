# Protos

Protos is an open source Web Application Framework, focused on high performance, integration, ease of 
deployment, maintainability and security. Runs on UNIX-like systems such as **Linux** &amp; **Mac OSX**. Windows 
support might be added in the future.

## Features

- Powerful Routing
- Controller Authentication & Route Filters
- RESTful Methods support
- Environment based Configuration
- Fast Configuration with bootstrap file
- Multi Core Cluster support
- Easy Deployment with JSON or Command line
- MongoDB, MySQL, PostgreSQL, Redis & RabbitMQ Development Stack
- Application Helpers
- Application Models supporting ORM &amp; Relationships
- Database Drivers & Storages
- Built-in Query Caching for Drivers & Models using NoSQL Storages
- Built-in Support for multiple Template Engines
- View Partials Support
- JSON Responses Support
- Custom & Dynamic Headers
- Built-in & Adjustable Cache-Control settings
- Built-in Proxy Server for Applications
- Built-in Node Inspector for debugging
- Executable used to create/manage/deploy applications &amp; servers
- Full Suite of Functional tests
- Organized Application directory structure

## Development Stack

Protos provides a set of APIs that allow the framework to be extended in all sorts of ways. Use it either to contribute
new functionality &amp; components to it, or to enhance it with the needs of your team/organization.

### Drivers

You have at your disposal the _Database Drivers_, which provide a common set of methods to operate the backend database,
implementing the _Models API_, which allows the Driver to connect with _Models_.

### Storages

_Storages_ are used for caching, session data and anything you can think of. These abstract databases with fast read/write 
operations, such as MongoDB and Redis. Storages are also used as the _caching layer_ for Drivers on the _Query Cache_ functionality.

### Models

Models use Drivers under the hood to handle the low level manipulation of their data. They provide automatic validation of data.
You can set your own validation rules with ease on a per-model basis.

The Models can relate with eaach other by using Relationships. These are used to connect models in specific ways, storing only the
references to their related models. You can then retrieve the related models either individually, or in groups.

Model (and Relationships) database-agnostic, you can change the underlying database driver used by the model, and no changes are required. This
means you can use a database backend for development, and another for production (just to give an example). No changes needed on deployment.

### Overview

Here's the Development Stack the framework provides, in a nutshell:

- **Drivers** &nbsp; _[MongoDB](https://bitbucket.org/derdesign/protos/src/master/drivers/mongodb.js), [PostgreSQL](https://bitbucket.org/derdesign/protos/src/master/drivers/postgres.js)_, [MySQL](https://bitbucket.org/derdesign/protos/src/master/drivers/mysql.js)_
- **Storages** &nbsp; _[MongoDB](https://bitbucket.org/derdesign/protos/src/master/storages/mongodb.js), [Redis](https://bitbucket.org/derdesign/protos/src/master/storages/redis.js)_
- **Models** &nbsp; _Use any Driver supported_
- **Query Cache (Drivers)** &nbsp; _Use any Storage supported_
- **Query Cache (Models)** &nbsp; _Handled by underlying Driver_
- **Caching** &nbsp; _Use any Storage supported_
- **Sessions** &nbsp; _Use any Storage supported_
- **Response Caching** &nbsp; _Use any Storage supported_
- **Logging** &nbsp; [MongoDB](https://bitbucket.org/derdesign/protos/src/master/middleware/logger/transport-mongodb.js), 
[Redis](https://bitbucket.org/derdesign/protos/src/master/middleware/logger/transport-redis.js), [File](https://bitbucket.org/derdesign/protos/src/master/middleware/logger/transport-file.js), 
[Console](https://bitbucket.org/derdesign/protos/src/master/middleware/logger/transport-console.js),
[JSON](https://bitbucket.org/derdesign/protos/src/master/middleware/logger/transport-console.js)
- **Message Queue** &nbsp; _Use the mq middleware_

To install the driver & storage component dependencies, use the `protos install <component>` command. For a full list of components and
their dependencies, see the [dependencies.json](https://bitbucket.org/derdesign/protos/src/master/dependencies.json) file.

## Middleware

The Application's functionality can be extended with the following (ready to use) components:

- [asset_compiler](http://derdesign.github.com/protos/middleware#asset_compiler) &nbsp; *Compiles LESS, Stylus and CoffeeScript, Supports Watch/Compress/Minify.*
- [aws](http://derdesign.github.com/protos/middleware#aws) &nbsp; *Amazon Web Services support. Provides clients to all services (ES3, EC2, etc)*
- [bcrypt](http://derdesign.github.com/protos/middleware#bcrypt) &nbsp; *Blowfish encryption support*
- [body_parser](http://derdesign.github.com/protos/middleware#body_parser) &nbsp; *Parse request bodies and file uploads in POST/PUT requests*
- [cookie_parser](http://derdesign.github.com/protos/middleware#cookie_parser) &nbsp; *Parse cookie headers, Integrates with Sessions & Auth*
- [csrf](http://derdesign.github.com/protos/middleware#csrf) &nbsp; *Cross-Site Request Forgery protection, integrates with Controller Validation*
- [logger](http://derdesign.github.com/protos/middleware#logger) &nbsp; *Application/Request logger, supporting several transports such as MongoDB, Redis, File &amp; console*
- [mailer](http://derdesign.github.com/protos/middleware#mailer) &nbsp; *Send email using SMTP, Amazon SES or Sendmail*
- [ markdown ](http://derdesign.github.com/protos/middleware#markdown) &nbsp; *Parse markdown syntax*
- [production_url](http://derdesign.github.com/protos/middleware#production_url) &nbsp; *Remove port number from application-generated URLs*
- [redirect](http://derdesign.github.com/protos/middleware#redirect) &nbsp; *Quick redirection support (useful for "maintenance mode")*
- [response_cache](http://derdesign.github.com/protos/middleware#response_cache) &nbsp; *Response caching into supported Storages (Redis, MongoDB, etc)*
- [session](http://derdesign.github.com/protos/middleware#session) &nbsp; *Full session support with Storages, guest sessions and regeneration*
- [shortcode](http://derdesign.github.com/protos/middleware#shortcode) &nbsp; *Allows custom content to be inserted into views using shortcodes*
- [socket_io](http://derdesign.github.com/protos/middleware#socket_io) &nbsp; *Socket.io Integration with applications*
- [static_server](http://derdesign.github.com/protos/middleware#static_server) &nbsp; *Complete Static Server solution, supporting Ranges, Conditional GETs, etc*
- [repl](http://derdesign.github.com/protos/middleware#repl) &nbsp; *Provides a REPL to interact with the application's runtime*
- [mq](http://derdesign.github.com/protos/middleware#mq) &nbsp; *Message Queue solution using RabbitMQ*

To install the middleware dependencies, use the `protos install <middleware>` command. For a full list of components and
their dependencies, see the [dependencies.json](https://bitbucket.org/derdesign/protos/src/master/dependencies.json) file.

## Template Engines

There is a lot of flexibility when it comes to template engines. To use a view engine, just add the extension 
to the template and you're set. You don't need to install any npm dependencies.

View Partials can be used across template engines. This means you can use Jade partials within Swig templates. Or CoffeeKup
partials within EJS templates (and vice versa). There are a few exceptions with mustache engines (due to their *logicless*
nature), such as Hogan and Handlebars.

The following view engine components are provided by protos:

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

To install the engine dependencies, use the `protos install <engine>` command. For a full list of components and
their dependencies, see the [dependencies.json](https://bitbucket.org/derdesign/protos/src/master/dependencies.json) file.


## License

Copyright (c) 2012, Ernesto Méndez (github.com/derdesign)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

## Resources

- Follow [@derdesign](http://twitter.com/derdesign) on Twitter for updates.
- Report issues on the [github issues](https://github.com/derdesign/protos/issues) page.
- For support, refer to the [Mailing List](https://groups.google.com/group/protos-web-framework).

