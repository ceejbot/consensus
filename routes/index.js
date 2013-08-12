var
	assert    = require('assert'),
	requester = require('request'),
	Agenda    = require('../lib/Agenda'),
	Topic     = require('../lib/Topic'),
	Vote      = require('../lib/Vote'),
	marked    = require('marked')
	;

exports.index = function(request, response)
{
	Agenda.all(function(err, agendas)
	{
		response.render('index', { title: 'Consensus', agendas: agendas });

	});
};

var AUDIENCE = 'http://localhost:3000';
var PERSONA = 'https://verifier.login.persona.org:443/verify';

exports.signin = function(request, response)
{
	var opts =
	{
		uri: PERSONA,
		json:
		{
			assertion: request.body.assertion,
			audience: AUDIENCE
		}
	};

	requester.post(opts, function(err, res, verified)
	{
		if (err)
		{
			request.app.logger.error('error calling persona verifier:', err.message);
			return;
		}
		// verified should have fields: status, email, audience, expires, issuer
		if (verified.status === 'okay')
		{
			response.app.controller.findOrCreatePerson(verified.email)
			.then(function(person)
			{
				if (!person)
				{
					response.redirect('/');
					return;
				}

				request.app.logger.info('login for ' + person.email + ' recorded');
				request.session.set('user_id', person.email);
				response.json({ page: '/' });
				// set flash message
				// redirect to index
			})
			.fail(function(err)
			{
				response.app.logger.warn(err);
				// set flash message
				// redirect to index
			}).done();
		}
		else
		{
			request.app.logger.error('persona verifier failed:', (verified.reason || verified.error));
		}
	});
};

exports.signout = function(request, response)
{
	request.session.delAll();
};

exports.agenda = function(request, response)
{
	var locals = {};

	Agenda.fetch(request.params.id)
	.then(function(agenda)
	{
		locals.agenda = agenda;
		locals.title = agenda.title;
		locals.description = marked(agenda.description);

		return agenda.topics();
	})
	.then(function(topics)
	{
		locals.agenda.topics = topics;
		response.render('agenda', locals);
	})
	.fail(function(err)
	{
		request.flash('error', 'That agenda doesn\'t exist.');
		response.redirect('/');
	}).done();
};

exports.agendaNewGet = function(request, response)
{
	response.render('agenda-edit', { title: 'New agenda' });
};

exports.agendaNewPost = function(request, response)
{
	var owner = response.locals.authed_user;
	var opts =
	{
		title: request.body.ititle,
		description: request.body.idesc,
		owner: owner
	};

	Agenda.create(opts)
	.then(function(agenda)
	{
		request.flash('success', 'Agenda created.');
		response.redirect('/agendas/' + agenda.key);
	}).fail(function(err)
	{
		response.app.logger.error(err);
		request.flash('error', err.message);
		response.render('agenda-edit', { title: 'New agenda', ititle: opts.title, idesc: opts.description });
	}).done();
};

exports.topic = function(request, response)
{
	var owner = response.locals.authed_user;
	var locals = {};

	Topic.get(request.params.tid, function(err, topic)
	{
		if (err)
		{
			request.app.logger.error('error fetching topic: ' + request.params.id, err);
			request.flash('error', err.message);
			response.redirect('/');
			return;
		}

		if (!topic || (Array.isArray(topic) && topic.length === 0))
		{
			request.app.logger.info('topic not found: ' + request.params.id, err);
			request.flash('error', 'That topic doesn\'t exist.');
			response.redirect('/');
			return;
		}

		locals.topic = topic;
		locals.title = topic.title;
		locals.description =  marked(topic.description);
		locals.yes_class = 'btn-default';
		locals.no_class = 'btn-default';
		locals.flag_class = 'btn-default';

		// TODO clean up
		if (owner)
		{
			Vote.fetchFor(topic, owner)
			.then(function(vote)
			{
				locals.vote = vote;

				if (vote)
				{
					switch (vote.state)
					{
					case 'yea': locals.yes_class = 'btn-success'; break;
					case 'nay': locals.no_class = 'btn-success'; break;
					case 'flag': locals.flag_class = 'btn-danger'; break;
					}
				}

				return Agenda.fetch(topic.agenda_id);
			})
			.then(function(agenda)
			{
				locals.agenda = agenda;
				response.render('topic', locals);
			})
			.fail(function(err)
			{
				response.app.logger.error(err);
				request.flash('error', err.message);
				response.redirect('/');
			}).done();
		}
		else
		{
			Agenda.fetch(topic.agenda_id)
			.then(function(agenda)
			{
				locals.agenda = agenda;
				response.render('topic', locals);
			})
			.fail(function(err)
			{
				response.app.logger.error(err);
				request.flash('error', err.message);
				response.redirect('/');
			}).done();
		}
	});
};

exports.topicNewGet = function(request, response)
{
	var aid = request.params.id;
	Agenda.get(aid, function(err, agenda)
	{
		if (err)
		{
			request.flash('error', 'That agenda doesn\'t exist.');
			response.redirect('/');
			return;
		}

		var locals =
		{
			title: 'New topic',
			agenda: agenda
		};
		response.render('topic-edit', locals);
	});
};

exports.topicNewPost = function(request, response)
{
	var aid = request.params.id;

	Agenda.get(aid, function(err, agenda)
	{
		if (err)
		{
			request.flash('error', 'That agenda doesn\'t exist.');
			response.redirect('/');
			return;
		}

		var owner = response.locals.authed_user;
		var opts =
		{
			title:       request.body.ititle,
			description: request.body.idesc,
			owner:       owner,
			agenda:      agenda
		};

		Topic.create(opts)
		.then(function(topic)
		{
			request.flash('success', 'Topic created.');
			response.redirect('/topics/' + topic.key);
		}).fail(function(err)
		{
			response.app.logger.error(err);
			request.flash('error', err.message);
			response.render('topic-edit',
			{
				title:  'New topic',
				ititle: opts.title,
				idesc:  opts.description,
				agenda: agenda
			});
		}).done();
	});
};

exports.topicVotePost = function(request, response)
{
	var voter = response.locals.authed_user;
	var topic_id = request.params.tid;
	var vote = request.params.vote;

	var opts =
	{
		owner: voter,
		state: vote,
	};

	Topic.fetch(topic_id)
	.then(function(topic)
	{
		opts.topic = topic;
		return Vote.create(opts);
	})
	.then(function(vote)
	{
		return topic.recordVote(vote.state);
	})
	.then(function()
	{
		request.flash('success', 'Your vote has been recorded.');
		response.redirect('/topics/' + topic_id);
	})
	.fail(function(err)
	{
		response.app.logger.error(err);
		request.flash('error', err.message);
		response.redirect('/topics/' + topic_id);
	}).done();
};

exports.settings = function(request, response)
{
	response.render('settings',
	{
		person: request.locals.authed_user,
		title: 'Your account'
	});
};

exports.settingsPost = function(request, response)
{
	// TODO
	var person = request.locals.authed_user;

};

