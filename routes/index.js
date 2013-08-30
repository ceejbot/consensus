var
	assert    = require('assert'),
	requester = require('request'),
	Agenda    = require('../lib/Agenda'),
	Topic     = require('../lib/Topic'),
	Vote      = require('../lib/Vote'),
	Person    = require('../lib/Person'),
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

exports.signout = function signout(request, response)
{
	request.session.delAll();
};

exports.relevantAgendas = function relevantAgendas(request, response)
{
	var locals = {};
	var owner = response.locals.authed_user;

	if (!owner)
	{
		response.redirect('/');
		return;
	}

	owner.fetchAgendas()
	.then(function(agendas)
	{
		locals.agendas = agendas;
		response.render('agendas-mine', locals);
	})
	.fail(function(err)
	{
		request.flash('error', err.message);
		response.redirect('/');
	}).done();
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

		return agenda.fetchTopics();
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

exports.newAgenda = function(request, response)
{
	response.render('agenda-edit', { title: 'New agenda' });
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
		request.flash('success', 'Agenda created.');
		response.redirect('/agendas/' + agenda.key);
	}).fail(function(err)
	{
		response.app.logger.error(err);
		request.flash('error', err.message);
		response.render('agenda-edit', { title: 'New agenda', ititle: opts.title, idesc: opts.description });
	}).done();
};

exports.editAgenda = function(request, response)
{
	var owner = response.locals.authed_user;
	var locals = {};

	Agenda.fetch(request.params.id)
	.then(function(agenda)
	{
		if (!agenda)
		{
			request.flash('error', 'That agenda can\'t be found.');
			response.redirect('/');
			return;
		}

		if (agenda.owner_id !== owner.email)
		{
			request.flash('error', 'That agenda doesn\'t belong to you.');
			response.redirect('/');
			return;
		}

		locals.agenda = agenda;
		locals.title = agenda.title;
		locals.ititle = agenda.title;
		locals.idesc = agenda.description;

		response.render('agenda-edit', locals);
	}).fail(function(err)
	{
		response.app.logger.error(err);
		request.flash('error', err.message);
		response.redirect('/');
	}).done();
};

exports.handleEditAgenda = function(request, response)
{
	var owner = response.locals.authed_user;

	Agenda.fetch(request.params.id)
	.then(function(agenda)
	{
		if (!agenda)
		{
			request.flash('error', 'That agenda can\'t be found.');
			response.redirect('/');
			return;
		}

		if (agenda.owner_id !== owner.email)
		{
			request.flash('error', 'That agenda doesn\'t belong to you.');
			response.redirect('/');
			return;
		}

		agenda.title = request.sanitize('ititle').xss();
		agenda.description = request.sanitize('idesc').xss();
		return agenda.saveP();
	})
	.then(function()
	{
		request.flash('Your agenda has been marked as inactive.');
		response.redirect('/agendas/' + request.params.id);

	}).fail(function(err)
	{
		response.app.logger.error(err);
		request.flash('error', err.message);
		response.redirect('/');
	}).done();

};

exports.handleCloseAgenda = function(request, response)
{
	var owner = response.locals.authed_user;
	var locals = {};

	Agenda.fetch(request.params.id)
	.then(function(agenda)
	{
		if (!agenda)
		{
			request.flash('error', 'That agenda can\'t be found.');
			response.redirect('/');
			return;
		}

		if (agenda.owner_id !== owner.email)
		{
			request.flash('error', 'That agenda doesn\'t belong to you.');
			response.redirect('/');
			return;
		}

		locals.agenda = agenda;
		agenda.active = false;
		return agenda.saveP();
	})
	.then(function()
	{
		request.flash('Your agenda has been marked as inactive.');
		response.redirect('/agendas/' + request.params.id);
	}).fail(function(err)
	{
		response.app.logger.error(err);
		request.flash('error', err.message);
		response.redirect('/');
	}).done();
};

exports.handleOpenAgenda = function(request, response)
{
	var owner = response.locals.authed_user;
	var locals = {};

	Agenda.fetch(request.params.id)
	.then(function(agenda)
	{
		if (agenda.owner_id !== owner.email)
		{
			request.flash('error', 'That agenda doesn\'t belong to you.');
			response.redirect('/');
			return;
		}

		locals.agenda = agenda;
		agenda.active = true;
		return agenda.saveP();
	})
	.then(function()
	{
		request.flash('Your agenda has been marked as active.');
		response.redirect('/agendas/' + request.params.id);
	}).fail(function(err)
	{
		response.app.logger.error(err);
		request.flash('error', err.message);
		response.redirect('/');
	}).done();
};


exports.topic = function topic(request, response)
{
	var owner = response.locals.authed_user;
	var locals = {};

	Topic.fetch(request.params.tid)
	.then(function(topic)
	{
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

		return topic.voters();
	})
	.then(function(voters)
	{
		locals.voters = voters;
		return Vote.fetchFor(locals.topic, owner);
	})
	.then(function(vote)
	{
		if (vote)
		{
			locals.vote = vote;

			switch (vote.state)
			{
			case 'yes': locals.yes_class = 'btn-success'; break;
			case 'no': locals.no_class = 'btn-success'; break;
			case 'flag': locals.flag_class = 'btn-danger'; break;
			}
		}

		return Agenda.fetch(locals.topic.agenda_id);
	})
	.then(function(agenda)
	{
		locals.agenda = agenda;
		response.render('topic', locals);
	})
	.fail(function(err)
	{
		request.app.logger.error('error fetching topic: ' + request.params.id, err);
		request.flash('error', err.message);
		response.redirect('/');
	}).done();
};

exports.newTopic = function newTopic(request, response)
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

exports.handleNewTopic = function handleNewTopic(request, response)
{
	var aid = request.params.id;
	var owner = response.locals.authed_user;
	var topic;

	Agenda.get(aid, function(err, agenda)
	{
		if (err)
		{
			request.flash('error', 'That agenda doesn\'t exist.');
			response.redirect('/');
			return;
		}

		var opts =
		{
			title:       request.sanitize('ititle').xss(),
			description: request.sanitize('idesc').xss(),
			owner:       owner,
			agenda:      agenda
		};

		Topic.create(opts)
		.then(function(newtopic)
		{
			topic = newtopic;
			return owner.addAgenda(aid);
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

exports.editTopic = function(request, response)
{
	var owner = response.locals.authed_user;
	var locals = {};

	Topic.fetch(request.params.tid)
	.then(function(topic)
	{
		if (!topic || (Array.isArray(topic) && topic.length === 0))
		{
			request.app.logger.info('topic not found: ' + request.params.id, err);
			request.flash('error', 'That topic doesn\'t exist.');
			response.redirect('/');
			return;
		}

		if (topic.owner_id !== owner.email)
		{
			request.flash('error', 'You are not authorized to edit that topic.');
			response.redirect('/topic/' + topic.key);
			return;
		}

		locals.topic = topic;
		locals.ititle = topic.title;
		locals.idesc =  topic.description;

		return Agenda.fetch(locals.topic.agenda_id);
	})
	.then(function(agenda)
	{
		locals.agenda = agenda;
		response.render('topic-edit', locals);
	})
	.fail(function(err)
	{
		request.app.logger.error('error fetching topic: ' + request.params.id, err);
		request.flash('error', err.message);
		response.redirect('/');
	}).done();

};

exports.handleEditTopic = function(request, response)
{
	Topic.fetch(request.params.tid)
	.then(function()
	{

	})
	.fail(function(err)
	{
		request.app.logger.error('error fetching topic: ' + request.params.id, err);
		request.flash('error', err.message);
		response.redirect('/');
	}).done();

	request.flash('error', 'topic editing not implemented yet');
	response.redirect('/');
};

exports.handleTopicVote = function handleTopicVote(request, response)
{
	var owner = response.locals.authed_user;
	var topic_id = request.params.tid;
	var state = request.params.vote;
	var vote;
	var isUpdate = false;

	var opts =
	{
		owner: owner,
		state: state,
	};

	Topic.fetch(topic_id)
	.then(function(topic)
	{
		opts.topic = topic;
		return Vote.fetchFor(topic, opts.owner);
	})
	.then(function(previous)
	{
		if (previous)
		{
			return opts.topic.rollback(opts.state, previous.state)
			.then(function()
			{
				previous.state = opts.state;
				return previous.saveP();
			})
			.then(function()
			{
				return previous;
			});
		}

		return Vote.create(opts);
	})
	.then(function(created)
	{
		vote = created;
		return opts.topic.recordVote(vote.state);
	})
	.then(function()
	{
		return owner.addAgenda(opts.topic.agenda_id);
	})
	.then(function()
	{
		response.app.logger.debug('vote: ' + vote.key + ' -> ' + vote.state);
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

exports.closeTopic = function(request, response)
{
	var person = response.locals.authed_user;
	var topic_id = request.params.tid;

	var opts = { };

	Topic.fetch(topic_id)
	.then(function(topic)
	{
		opts.topic = topic;
		return Agenda.fetch(topic.agenda_id);
	})
	.then(function(agenda)
	{
		if ((agenda.owner_id !== person.email) && (topic.owner_id !== person.email))
		{
			request.flash('error', 'You are not authorized to close that topic.');
			response.redirect('/topic/' + opts.topic.key);
			return;
		}

		opts.topic.state = 'closed';
		opts.topic.modified = Date.now();
		return opts.topic.saveP();
	})
	.then(function()
	{
		response.app.logger.debug('topic: ' + opts.topic.key + ' closed by ' + person.email);
		request.flash('success', 'That topic has been marked as closed.');
		response.redirect('/agendas/' + opts.topic.agenda_id);
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
		person: response.locals.authed_user,
		title: 'Your account'
	});
};

exports.handleSettings = function(request, response)
{
	var person = response.locals.authed_user;

	request.assert('iavatar', 'avatar is not a valid url').isUrl();

	var errors = request.validationErrors();
	if (errors)
	{
		request.flash(util.inspect(errors));
		var locals =
		{
			person: response.locals.authed_user,
			title: 'Your account'
		};
		response.render('settings', locals);
		return;
	}

	person.name = request.sanitize('iname').xss();
	person.description = request.sanitize('idesc').xss();
	person.avatar = request.sanitize('iavatar').xss();
	person.modified = Date.now();

	person.saveP()
	.then(function()
	{
		request.flash('success', 'You have updated your profile.');
		response.redirect('/');
	})
	.fail(function(err)
	{
		response.app.logger.error(err);
		request.flash('error', err.message);
		response.redirect('/settings');
	}).done();
};

exports.profile = function(request, response)
{
	var locals = {};
	var uid = request.params.uid;

	Person.personByEmail(uid)
	.then(function(person)
	{
		if (!person)
		{
			request.flash('warning', 'Profile for #{uid} not found.');
			response.redirect('/');
		}

		locals.person = person;
		locals.description =  marked(person.description);
		return person.fetchAgendas();
	})
	.then(function(agendas)
	{
		locals.agendas = agendas;
		response.render('profile', locals);
	})
	.fail(function(err)
	{
		response.app.logger.error(err);
		request.flash('error', err.message);
		response.redirect('/');
	}).done();
};

