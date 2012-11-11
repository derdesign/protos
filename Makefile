
# Reusable commands & options

vows = ./node_modules/vows/bin/vows
vowsOpts = --spec

# Test directories

unit = ./test/unit/*.js
storages = ./test/storages/*.js
drivers = ./test/drivers/*.js
engines = ./test/engines/*.js
integration = ./test/integration/*.js
middleware = ./test/middleware/*.js
commandline = ./test/command.js

# Make commands

default:
		@echo
		@echo "* Project Tasks\n"
		@echo "make deps             Install Dependencies"
		@echo "make deps-all         Install All Dependencies"
		@echo "make deps-clean       Removes the node_modules directory"
		@echo "make lint             Run Code Analysis tool (scans entire project)"
		@echo "make testconfig       Test Configuration Tool"
		@echo
		@echo "* Test Suites\n"
		@echo "make tests            Run All tests"
		@echo "make test-unit        Run Unit tests"
		@echo "make test-sto         Run Storage tests (testconfig required)"
		@echo "make test-drv         Run Driver tests (testconfig required)"
		@echo "make test-eng         Run View Engine tests"
		@echo "make test-int         Run Integration tests"
		@echo "make test-mid         Run Middleware tests"
		@echo "make test-cmd         Run command line tests"
		@echo

deps:
		@npm install -d
		@./tools/remove-sys-notice

deps-all:
		@./tools/merge-deps > package.json.all
		@mv package.json package.json.orig
		@mv package.json.all package.json
		@npm install -d
		@mv package.json.orig package.json
		@./tools/remove-sys-notice

deps-clean:
		@rm -Rf ./node_modules

lint:
		@ls -F | egrep / | egrep -v "(node_modules|test|docs|build|doctmp|resources)" | NODE_ENV=lintall xargs -n 1 ./tools/lint
		@echo

testconfig:
		@./tools/testconfig

test:
		@echo "\nAvailable Test Commands: tests  test-unit  test-sto test-drv test-eng test-int test-mid\n"

tests:
		@${vows} ${vowsOpts} ${unit} ${storages} ${drivers} ${engines} ${integration} ${middleware} ${commandline}

test-unit:
		@${vows} ${vowsOpts} ${unit}

test-sto:
		@${vows} ${vowsOpts} ${storages}

test-drv:
		@${vows} ${vowsOpts} ${drivers}

test-eng:
		@${vows} ${vowsOpts} ${engines}

test-int:
		@${vows} ${vowsOpts} ${integration}

test-mid:
		@${vows} ${vowsOpts} ${middleware}
		
test-cmd:
		@${vows} ${vowsOpts} ${commandline}

.PHONY: test docs