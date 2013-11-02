var
	_      = require('lodash'),
	assert = require('assert'),
	Agenda = require('../lib/Agenda'),
	Topic  = require('../lib/Topic'),
	Vote   = require('../lib/Vote'),
	Person = require('../lib/Person')
	;

exports.person = function(request, response)
{
	var email = request.params.id;
	Person.get(email)
	.then(function(person)
	{
		if (!person)
			return request.send(404);

		response.json(person.toJSON());
	},
	function(err)
	{
		response.json(500, err);
	}).done();
};

exports.people = function(request, response)
{
	Person.all()
	.then(function(people)
	{
		var result = _.map(people, function(p)
		{
			return p.toJSON();
		});
		response.json(result);
	},
	function(err)
	{
		request.app.logger.error(err);
		response.json(500, err);
	}).done();
};

exports.agenda = function(request, response)
{
	Agenda.get(request.params.id)
	.then(function(agenda)
	{
		if (!agenda)
			response.send(404);
		else
			response.json(200, agenda.toJSON());
	},
	function(err)
	{
		request.app.logger.error(err);
		response.json(500, err);
	}).done();
};

exports.agendas = function(request, response)
{
	Agenda.stream().pipe(response);
};

exports.handleNewAgenda = function(request, response)
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
		response.json(201, agenda.toJSON());
	},
	function(err)
	{
		request.app.logger.error(err);
		response.json(500, err);
	}).done();
};

exports.handleEditAgenda = function(request, response)
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
			response.json(200, agenda.toJSON());
	},
	function(err)
	{
		response.app.logger.error(err);
		response.json(500, err);
	}).done();
};

exports.agendaTopics = function(request, response)
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
			response.json(200, result);
		});
	},
	function(err)
	{
		request.app.logger.error(err);
		response.json(500, err);
	}).done();
};

exports.topic = function(request, response)
{
	Topic.get(request.params.id)
	.then(function(topic)
	{
		if (!topic)
			response.send(404);
		else
			response.json(200, topic.toJSON());
	},
	function(err)
	{
		request.app.logger.error(err);
		response.json(500, err);
	}).done();
};

exports.topics = function(request, response)
{
	Topic.stream().pipe(response);
};

exports.topicVotes = function(request, response)
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
			response.json(200, result);
		});
	},
	function(err)
	{
		request.app.logger.error(err);
		response.json(500, err);
	}).done();
};
