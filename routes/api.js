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

		response.send(person.toJSON());
	})
	.fail(function(err)
	{
		response.send(500, err);
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
		response.send(result);
	})
	.fail(function(err)
	{
		request.app.logger.error(err);
		response.send(500, err);
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
			response.send(200, agenda.toJSON());
	})
	.fail(function(err)
	{
		request.app.logger.error(err);
		response.send(500, err);
	}).done();
};

exports.agendas = function(request, response)
{
	Agenda.stream().pipe(response);
};
