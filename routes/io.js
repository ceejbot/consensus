var
	_      = require('lodash'),
	assert = require('assert'),
	Agenda = require('../lib/Agenda'),
	Topic  = require('../lib/Topic'),
	Vote   = require('../lib/Vote'),
	Person = require('../lib/Person')
	;

var logger;

exports.keepItReal = function(request, response)
{
	response.render('one-page');
};

exports.setLogger = function(log)
{
	logger = log.child({ type: 'socket.io' });
};

exports.avatar =
{
	url: function(request)
	{
		logger.info({ data: request.data }, 'SOCKET avatar:url');

		var data = request.data;
		var email = data.email;
		var url = data.url;

		Person.get(email)
		.then(function(person)
		{
			if (person)
			{
				person.avatar = url;
				return person.save();
			}
		})
		.then(function(result)
		{
			logger.info({ avatar: url, user: email }, 'avatar saved');
			request.io.respond({ okay: !!result, url: url });
		})
		.fail(function(err)
		{
			logger.error({ error: err }, 'while fetching person id=' +email);
			request.io.respond({ okay: false, error: true });
		}).done();
	}
};

exports.onReady = function(request)
{
	var data = request.data;
	logger.info('ready');

	// anything to do? log only?

	var reply = { success: 'ready freddy', data: data };
	request.io.respond(reply);
};

exports.person = function(request)
{
	var email = request.id;
	Person.get(email)
	.then(function(person)
	{
		if (!person)
			return request.io.respond({ okay: false });

		request.io.respond({ okay: true, person: person.toJSON() });
	})
	.fail(function(err)
	{
		logger.error({ error: err }, 'while fetching person id=' +email);
		request.io.respond({ okay: false, error: true });
	}).done();

};

exports.peopleHandlers =
{
	create: function(request)
	{
		// TODO
	},

	update: function(request)
	{
		// TODO
	},
};

exports.agendaHandlers =
{
	create: function(request)
	{
		// TODO
	},

	update: function(request)
	{
		// TODO
	},

	close: function(request)
	{
		// TODOs
	},
};

exports.topicHandlers =
{
	create: function(request)
	{
		// TODO
	},

	update: function(request)
	{
		// TODO
	},

	close: function(request)
	{
		// TODOs
	},

	vote: function(request)
	{

	},
};
