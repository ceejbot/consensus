# use locally-installed tools
NPM_BIN := node_modules/.bin/
LINT := $(addprefix $(NPM_BIN), jshint)
UGLIFY := $(addprefix $(NPM_BIN), uglifyjs)
LESS := $(addprefix $(NPM_BIN), lessc)
MOCHA := $(addprefix $(NPM_BIN), mocha)
LOGGER := $(addprefix $(NPM_BIN), bunyan) -o short
BROWSERIFY := $(addprefix $(NPM_BIN), browserify)

# CSS setup
LESSOPTS := --include-path=bower_components/bootstrap/less
LESSDIR := build/less
CSSDIR := public/css
CSS := $(addprefix $(CSSDIR)/,main.css)
MINCSS = $(CSS:.css=.min.css)

css: $(CSS) $(MINCSS)

$(CSSDIR)/%.css : $(LESSDIR)/%.less $(LESSDIR)/scheme.less
	@echo Compiling $<
	@$(LESS) $(LESSOPTS) $< > $@

$(CSSDIR)/%.min.css : $(LESSDIR)/%.less $(LESSDIR)/scheme.less
	@echo Minifying $<
	@$(LESS) $(LESSOPTS) --yui-compress $< > $@

