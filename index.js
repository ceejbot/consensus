var
	bunyan     = require('bunyan'),
	express    = require('express.io'),
	flash      = require('connect-flash'),
	fs         = require('fs'),
	http       = require('http'),
	path       = require('path'),
	routes     = require('./routes'),
	Controller = require('./lib/controller')
	;

var app = express();
app.http().io();

var appname = 'consensus';

var SESSION_TTL = 1000 * 60 * 60 * 24 * 365; // 1 year in milliseconds, TODO config

// CONFIGURATION???!!!!
var controller = new Controller();
app.controller = app;
var sessiondb = require('level-session')(path.join('.', 'db', 'sessions.db'));

// ----------------------------------------------------------------------
// middleware

function initializePageLocals(request, response, next)
{
	response.locals.user = request.session.handle;
	response.locals.user_id = request.session.user_id;

	response.locals.flash = {};
	response.locals.flash.info = request.flash('info');
	response.locals.flash.error = request.flash('error');
	response.locals.flash.success = request.flash('success');
	response.locals.flash.warning = request.flash('warning');

	next();
}

function authenticatedUser(request, response, next)
{
	response.locals.authed_user = null;
	var user_id = request.session.user_id;
	if (!user_id)
		return next();

	controller.personByEmail(user_id)
	.then(function(person)
	{
		app.logger.info('session found user', person);
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

	console.log('requireAuthedUser did not find a user');
	response.cookie('destination', request.originalUrl);
	request.flash('info', 'You must log in before you can continue');
	response.redirect('/login');
}

// ----------------------------------------------------------------------

if (!fs.existsSync('./log'))
	fs.mkdirSync('./log');

var fname = path.join('.', 'log', appname + '.log');
var logopts =
{
	name: appname,
	serializers: bunyan.stdSerializers,
	streams: [ { level: 'info', path: fname, } ]
};
logopts.streams.push({level: 'info', stream: process.stdout});

app.logger = bunyan.createLogger(logopts);

var logstream =
{
	write: function(message, encoding) { app.logger.info(message.substring(0, message.length - 1)); }
};

// ----------------------------------------------------------------------



// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger({stream: logstream, format: 'tiny'}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(flash());
app.use(express.cookieParser(process.env.NOMNOMNOM));
app.use(sessiondb);
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
app.post('/auth/signout', routes.signin);


app.get('/ping', function(request, response)
{
	response.send(200, 'pong');
});

app.get('/health', function(request, response)
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

