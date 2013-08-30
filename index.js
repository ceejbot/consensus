var
	bunyan      = require('bunyan'),
	express     = require('express.io'),
	exValidator = require('express-validator'),
	fs          = require('fs'),
	http        = require('http'),
	path        = require('path'),
	routes      = require('./routes'),
	util        = require('util'),
	Person      = require('./lib/Person'),
	Controller  = require('./lib/controller')
	;

var app = express();
app.http().io();

var appname = 'consensus';

app.SESSION_TTL = 60 * 60 * 24 * 365; // 1 year in seconds

var config = fs.readFileSync(process.env.CONFIG_FILE || './config.js');
if (config.length)
	config = JSON.parse(config);

var controller = new Controller(config);
app.controller = controller;
var sessiondb = require('level-session')(
{
	location: path.join(config.dbpath, 'sessions.db'),
	expire:   app.SESSION_TTL,
	keys:     config.secrets
});

// ----------------------------------------------------------------------
// middleware

function flash(request, response, next)
{
	request.flash = function(type, message)
	{
		request.session.get('flash', function(err, flashmess)
		{
			flashmess = flashmess || {};

			if (arguments.length > 2 && format)
			{
				var args = Array.prototype.slice.call(arguments, 1);
				message = util.format.apply(undefined, args);
				(flashmess[type] = flashmess[type] || []).push(message);
			}
			else if (Array.isArray(message))
			{
				message.forEach(function(val)
				{
					(flashmess[type] = flashmess[type] || []).push(val);
				});
			}
			else
			{
				(flashmess[type] = flashmess[type] || []).push(message);
			}

			request.session.set('flash', flashmess);
		});
	};

	next();
}

function initializePageLocals(request, response, next)
{
	response.locals.sitename = config.name;

	request.session.get('user_id', function(err, user_id)
	{
		response.locals.user_id = user_id;

		request.session.get('flash', function(err, flash)
		{
			flash = flash || {};
			response.locals.flash = {};
			response.locals.flash.info = flash.info;
			response.locals.flash.error = flash.error;
			response.locals.flash.success = flash.success;
			response.locals.flash.warning = flash.warning;

			request.session.set('flash', {}, function(err)
			{
				next();
			});
		});
	});
}

function authenticatedUser(request, response, next)
{
	response.locals.authed_user = null;

	var email = response.locals.user_id;
	if (!email)
		return next();

	Person.personByEmail(email)
	.then(function(person)
	{
		response.locals.authed_user = person;
	})
	.fail(function(err)
	{
		app.logger.warn('session error', err);
	}).done(function()
	{
		next();
	});
}

function requireAuthedUser(request, response, next)
{
	if (response.locals.authed_user)
		return next();

	request.app.logger.debug('requireAuthedUser did not find a user');
	response.cookie('destination', request.originalUrl);
	request.flash('info', 'You must log in before you can continue');
	response.redirect('/');
}

// ----------------------------------------------------------------------

if (!fs.existsSync(config.logging.path))
	fs.mkdirSync(config.logging.path);

var fname = path.join(config.logging.path, appname + '.log');
var logopts =
{
	name: appname,
	serializers: bunyan.stdSerializers,
	streams: [ { level: 'info', path: fname, } ]
};
if (config.logging.console)
	logopts.streams.push({level: 'debug', stream: process.stdout});

app.logger = bunyan.createLogger(logopts);

var logstream =
{
	write: function(message, encoding) { app.logger.info(message.substring(0, message.length - 1)); }
};

// ----------------------------------------------------------------------

// all environments
app.set('port', process.env.PORT || config.port || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger({stream: logstream, format: 'tiny'}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.bodyParser());
app.use(exValidator());
app.use(express.methodOverride());
app.use(express.cookieParser(process.env.NOMNOMNOM));
app.use(sessiondb);
app.use(flash);
app.use(initializePageLocals);
app.use(authenticatedUser);
app.use(app.router);

if ('development' == app.get('env'))
{
	app.use(express.errorHandler());
}

// ----------------------------------------------------------------------

app.get('/', routes.index);
app.post('/auth/signin', routes.signin);
app.post('/auth/signout', routes.signout);

app.get('/agendas/new', requireAuthedUser, routes.newAgenda);
app.post('/agendas/new', requireAuthedUser, routes.handleNewAgenda);
app.get('/agendas/relevant', requireAuthedUser, routes.relevantAgendas);
app.get('/agendas/:id', routes.agenda);
app.post('/agendas/:id/close', routes.handleCloseAgenda);
app.post('/agendas/:id/open', routes.handleOpenAgenda);

app.get('/agendas/:id/topics/new', requireAuthedUser, routes.newTopic);
app.post('/agendas/:id/topics/new', requireAuthedUser, routes.handleNewTopic);
app.post('/topics/:tid/vote/:vote', requireAuthedUser, routes.handleTopicVote);
app.post('/topics/:tid/close', routes.closeTopic);
app.get('/topics/:tid/edit', routes.editTopic);
app.post('/topics/:tid/edit', routes.handleEditTopic);
app.get('/topics/:tid', routes.topic);

app.get('/u/:uid', routes.profile);
app.get('/settings', requireAuthedUser, routes.settings);
app.post('/settings', requireAuthedUser, routes.handleSettings);

app.get('/ping', function(request, response)
{
	var health =
	{
		pid:    process.pid,
		uptime: process.uptime(),
		memory: process.memoryUsage(),
	};
	response.json(health);
});

// ----------------------------------------------------------------------

http.createServer(app).listen(app.get('port'), function()
{
	app.logger.info('Express server listening on port ' + app.get('port'));
});

