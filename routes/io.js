var
	_      = require('lodash'),
	assert = require('assert'),
	Agenda = require('../lib/Agenda'),
	Topic  = require('../lib/Topic'),
	Vote   = require('../lib/Vote'),
	Person = require('../lib/Person')
	;

var logger;

exports.setLogger = function(log)
{
	logger = log;
}

exports.onReady = function(request)
{
	var data = request.data;
	logger.info('socket.io ready event');
	var reply = { success: 'ready freddy' };
	request.io.respond(reply);
}

exports.person = function(request)
{
	var email = request.params.id;
	Person.get(email)
	.then(function(person)
	{
		if (!person)
			return request.send(404);

		request.io.respond(person.toJSON());
	})
	.fail(function(err)
	{
		request.io.respond(500, err);
	}).done();
};

exports.people = function(request)
{
	Person.all()
	.then(function(people)
	{
		var result = _.map(people, function(p)
		{
			return p.toJSON();
		});
		request.io.respond(result);
	})
	.fail(function(err)
	{
		request.app.logger.error(err);
		request.io.respond(500, err);
	}).done();
};

exports.agenda = function(request)
{
	Agenda.get(request.params.id)
	.then(function(agenda)
	{
		if (!agenda)
			response.send(404);
		else
			request.io.respond(200, agenda.toJSON());
	})
	.fail(function(err)
	{
		request.app.logger.error(err);
		request.io.respond({ error: err });
	}).done();
};

exports.agendas = function(request)
{
	Agenda.stream().pipe(response);
};

exports.handleNewAgenda = function(request)
{
	var owner = response.locals.authed_user;
	var opts =
	{
		title: request.sanitize('ititle').xss(),
		description: request.sanitize('idesc').xss(),
		owner: owner
	};

	var agenda;

	Agenda.create(opts)
	.then(function(created)
	{
		agenda = created;
		return owner.addAgenda(agenda.key);
	})
	.then(function()
	{
		request.io.respond(201, agenda.toJSON());
	}).fail(function(err)
	{
		request.app.logger.error(err);
		request.io.respond({ error: err });
	}).done();
};

exports.handleEditAgenda = function(request)
{
	var owner = response.locals.authed_user;

	Agenda.get(request.params.id)
	.then(function(agenda)
	{
		if (!agenda)
		{
			response.send(404);
			return;
		}

		if (agenda.owner_id !== owner.email)
		{
			response.send(403);
			return;
		}

		agenda.title = request.sanitize('ititle').xss();
		agenda.description = request.sanitize('idesc').xss();
		return agenda.save();
	})
	.then(function(reply)
	{
		if (reply)
			request.io.respond(200, agenda.toJSON());
	}).fail(function(err)
	{
		response.app.logger.error(err);
		request.io.respond({ error: err });
	}).done();
};

exports.agendaTopics = function(request)
{
	Agenda.get(request.params.id)
	.then(function(agenda)
	{
		if (!agenda)
			return response.send(404);

		agenda.fetchTopics()
		.then(function(topics)
		{
			var result = _.map(topics, function(t)
			{
				return t.toJSON();
			});
			request.io.respond(200, result);
		});
	})
	.fail(function(err)
	{
		request.app.logger.error(err);
		request.io.respond({ error: err });
	}).done();
};

exports.topic = function(request)
{
	Topic.get(request.params.id)
	.then(function(topic)
	{
		if (!topic)
			response.send(404);
		else
			request.io.respond(200, topic.toJSON());
	})
	.fail(function(err)
	{
		request.app.logger.error(err);
		request.io.respond(500, err);
	}).done();
};

exports.topics = function(request)
{
	Topic.stream().pipe(response);
};

exports.topicVotes = function(request)
{
	Topic.get(request.params.id)
	.then(function(topic)
	{
		if (!topic)
			return response.send(404);

		topic.votes()
		.then(function(votes)
		{
			var result = _.map(votes, function(t)
			{
				return t.toJSON();
			});
			request.io.respond(200, result);
		});
	})
	.fail(function(err)
	{
		request.app.logger.error(err);
		request.io.respond(500, err);
	}).done();
};
