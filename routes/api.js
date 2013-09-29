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
	})
	.fail(function(err)
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
	})
	.fail(function(err)
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
	})
	.fail(function(err)
	{
		request.app.logger.error(err);
		response.json(500, err);
	}).done();
};

exports.agendas = function(request, response)
{
	Agenda.stream().pipe(response);
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
	})
	.fail(function(err)
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
	})
	.fail(function(err)
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
	})
	.fail(function(err)
	{
		request.app.logger.error(err);
		response.json(500, err);
	}).done();
};


