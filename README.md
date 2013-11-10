
# Protos [![Build Status](https://secure.travis-ci.org/derdesign/protos.png)](http://travis-ci.org/derdesign/protos)

Protos is a Web Application Framework for Node.js. Runs on UNIX Systems such as **Linux**, **FreeBSD** & **OSX**.


## Usage

Install:

    npm install protos
    
Install (globally):
  
    sudo npm install -g protos

Create a project:

    protos create myapp

Create a minimal project:

    protos create myapp --minimal

Start server:
    
    node boot.js

Start server within project's path:

    protos server

Start production server on port 8000:

    protos server --env production --port 8000
    
Start server and make a CURL request:

    node boot.js -X GET /
    
Command Line Help:

    protos --help


## Features

- Regex-based Routing
- Environment based configuration
- Event based IPC
- Hot Code Reloading
- Authentication & Filters
- SSL Server Support
- Database Drivers: **MongoDB**, **MySQL**, **PostgreSQL**, **SQLite**
- Storages for Caching and Sessions: **MongoDB**, **Redis**, **SQLite**
- ORM Models API
- View Engines: **Handlebars**, **Swig**, **Hogan.js**, **EJS**, **Jade**
- Debugging using Webkit Inspector
- Built-in Shortcode Parser
- File Downloads, JSON Responses
- File-based API
- File-based Request Handlers
- File-based Configuration
- File-based Event Handlers
- File-based Extensions
- Code Generation


## Middleware

- Static File Server
- Asset Compiler and Minifier: **LESS**, **CoffeeScript**, **Stylus**
- Image Processing: **GraphicsMagick**, **ImageMagick**
- Logger with Transports: **File**, **JSON**, **MongoDB**, **Redis**
- Amazon Web Services
- Body Parser
- Cookie Parser
- CSRF Protection
- Markdown Parser
- Mailer
- REPL
- BCrypt
- Sessions


## License

`protos` is [MIT Licensed](https://github.com/derdesign/protos/blob/master/LICENSE)