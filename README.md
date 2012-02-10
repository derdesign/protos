# CoreJS [![Build Status](https://secure.travis-ci.org/corejs/corejs.png)](http://travis-ci.org/corejs/corejs)

Getting everything ready for public release, scheduled for March 1st on [corejs.org](http://corejs.org).

You can see the planned features & enhancements by visiting the [Issues page](https://github.com/corejs/corejs/issues).

## Status: alpha

## About

CoreJS is a Web Application Framework for [node.js](http://nodejs.org), using the 
[MVC](http://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller) architecture.

## Installation

Install the dependencies with `make deps` or `npm install`

## Usage

Run the Application server with `node skeleton/`

To start with the debug environment + node inspector: `NODE_ENV=debug node skeleton/`

## Running Tests

Before running _all_ tests, make sure to run `make testconfig`, and enter the database information
for your testing environment.

Run **all** tests_ with `make tests`

Run **unit tests** with `make test-unit`

Run **storage tests** with `make test-sto`

Run **driver tests** with `make test-drv`

Run **engine tests** with `make test-eng`

Run **integration tests** with `make test-int`

## License

[MIT](http://www.opensource.org/licenses/mit-license.php) Licensed.