var
	assert    = require('assert'),
	requester = require('request'),
	Agenda    = require('../lib/Agenda'),
	Topic     = require('../lib/Topic'),
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
			request.app.logger.error('persona verifier did not succeed:', (verified.reason || verified.error));
		}
	});
};

exports.signout = function(request, response)
{
	request.app.logger.info('/signout');
	request.session.delAll();
	response.redirect('/');
};

exports.agenda = function(request, response)
{
	Agenda.get(request.params.id, function(err, agenda)
	{
		if (err)
		{
			request.flash('error', 'That agenda doesn\'t exist.');
			response.redirect('/');
			return;
		}

		response.render('agenda',
		{
			agenda: agenda,
			title: agenda.title,
			description:  marked(agenda.description)
		});
	});
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

		Agenda.get(topic.agenda_id, function(err, agenda)
		{
			response.render('topic',
			{
				agenda: agenda,
				topic: topic,
				title: topic.title,
				description:  marked(topic.description)
			});
		});
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
		}
		response.render('topic-edit', locals);
	});
};

exports.topicNewPost = function(request, response)
{
	var aid = request.params.id;
	var topic;

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
		.then(function(newtopic)
		{
			topic = newtopic;
			return agenda.addTopic(topic);
		})
		.then(function()
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
	// TODO
};

