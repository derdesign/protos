
# Protos [![Build Status](https://secure.travis-ci.org/derdesign/protos.png)](http://travis-ci.org/derdesign/protos)

Protos is a Web Application Framework for Node.js focused on building Highly Scalable Web Applications. 
Runs on UNIX Systems such as **Linux**, **FreeBSD** & **Mac OSX**.

## Getting Started

Install:

    npm install protos
    
Install (globally):
  
    sudo npm install -g protos

Create a project:

    protos create myapp

Create a minimal project:

    protos create myapp --minimal

Start the Server:
    
    node boot.js

Server can also be started anywhere within the project's path:

    protos server

Start a production server on port 8000:

    protos server --env production --port 8000
    
Start the server and make a request:

    node boot.js /
    
Command Line Help:

    protos --help
    
Development tasks (tests, lint, etc):

    make
    

## Features

- Powerful Routing
- Environment-based configuration
- Multicore friendly (IPC using event-based communication)
- Hot Code Reloading (update the app without restarting)
- Namespaced routes using Controllers
- Authentication for each Controller
- Route Filters for route preprocessing
- Application Server supports SSL
- Database Drivers (Mongodb, MySQL, PostgreSQL)
- NoSQL Storages for Caching and Sessions (mongodb, redis)
- Drivers & Storages share a similar API
- Models with Object-Relational Mapping
- Views, Helpers and Partials
- Multiple View Engines supported out of the box
- Synchronous and Asynchronous view engines
- Built-in Node Inspector for Debugging
- Organized Directory Structure
- FileManager class to handle file uploads
- Validator class to handle validation
- JSON Responses, File Downloads
- Get/Set Request specific data (shared between route handlers)
- File-based Route Handlers (reusable request handlers)
- File-based Business Logic
- File-based Configuration
- File-based Event Handlers (Hooks)
- File-based Application Extensions
- Client-side asset download via command line
- Code Generation via command line


## Middleware

- Asset Compiler and Minifier (LESS, CoffeeScript and Stylus)
- Amazon Web Services
- Bcrypt Password Hashing
- Body Parser
- Cookie Parser
- CSRF Protection
- Image Processing (GraphicsMagick, ImageMagick)
- Logging via multiple transports (File, JSON, Mongodb, Redis)
- Markdown Parser
- Mailer
- Message Queue (RabbitMQ)
- REPL
- Sessions
- Shortcodes
- SocketIO
- Static File Server
