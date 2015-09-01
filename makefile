TESTS = $(shell find test -type f -name test-*)
NPM_INSTALL_TEST = PYTHON=`which python2.6` NODE_ENV=test cnpm install
NPM_INSTALL_PRODUCTION = PYTHON=`which python2.6` NODE_ENV=production cnpm install
-TESTS := $(sort $(TESTS))

-BIN_MOCHA := ./node_modules/.bin/mocha
-BIN_ISTANBUL := ./node_modules/.bin/istanbul

-INIT_DIRS := run run/sockets logs out out/release

default: test
-common-pre: clean -npm-install

test: -common-pre
	@$(-BIN_MOCHA) \
		--no-colors \
		--check-leaks \
		--reporter tap \
		$(-TESTS)

bench: -common-pre
	node ./bench/index.js $(-BENCHS)

test-cov: -common-pre
	@$(-BIN_ISTANBUL) cover ./node_modules/.bin/_mocha -- -u exports -R tap $(-TESTS)
	@$(-BIN_ISTANBUL) report html

cov: test-cov
	@open ./coverage/index.html

release: -common-pre
	@echo 'make release begin'
	@rsync -av . ./out/release --exclude-from .rsyncignore
	@cd out/release && $(NPM_INSTALL_PRODUCTION)
	@cd out/release/public && $(NPM_INSTALL_PRODUCTION)
	@echo 'make release done'

-npm-install:
	@$(NPM_INSTALL_TEST)
	@cd public && $(NPM_INSTALL_TEST)

clean:
	@echo 'clean'
	@rm -rf $(-INIT_DIRS)
	@mkdir -p $(-INIT_DIRS)
