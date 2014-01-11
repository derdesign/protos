
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
hotCodeLoading = ./test/hot-code-loading.js

# Make commands

default:
		@echo; echo "Actions: tests | lint"; echo
		
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
		@./tools/lint bin/protos
		@echo "bin/ drivers/ engines/ lib/ middleware/ skeleton/ storages/ test/drivers test/engines test/integration test/middleware test/storages test/unit" | NODE_ENV=lintall xargs -n 1 ./tools/lint
		@echo

test:
		@echo "\nAvailable Test Commands: tests  test-unit  test-sto test-drv test-eng test-int test-mid\n"

tests:
		@${vows} ${vowsOpts} ${unit} ${storages} ${drivers} ${engines} ${integration} ${middleware} ${hotCodeLoading} ${commandline}

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

.PHONY: test