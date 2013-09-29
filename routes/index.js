var
	Agenda = require('../lib/Agenda'),
	Topic  = require('../lib/Topic'),
	Vote   = require('../lib/Vote'),
	Person = require('../lib/Person'),
	marked = require('marked'),
	util   = require('util')
	;

exports.index = function(request, response)
{
	Agenda.all()
	.then(function(agendas)
	{
		response.render('index', { title: 'Consensus', agendas: agendas });
	})
	.fail(function(err)
	{
		request.app.logger.error(err, 'error fetching agendas');
		request.flash('error', 'Warning: couldn\'t fetch agendas.');
		response.render('index', { title: 'Consensus', agendas: [] });
	}).done();
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

	Agenda.get(request.params.id)
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
		response.app.logger.error(err);
		request.flash('error', 'That agenda doesn\'t exist.');
		response.redirect('/');
	}).done();
};

exports.presentAgenda = function(request, response)
{
	var locals = {};
	var people = {};

	Agenda.get(request.params.id)
	.then(function(agenda)
	{
		locals.agenda = agenda;
		locals.title = agenda.title;
		locals.description = marked(agenda.description);

		people[agenda.owner_id] = true;

		return agenda.fetchTopics();
	})
	.then(function(topics)
	{
		locals.topics = topics.open;

		for (var i = 0; i < locals.topics.length; i++)
		{
			var t = locals.topics[i];
			people[t.owner_id] = true;
		}

		return Person.get(Object.keys(people));
	})
	.then(function(proposers)
	{
		for (var i = 0; i < proposers.length; i++)
			people[proposers[i].key] = proposers[i];

		locals.tjson = [];
		for (var i = 0; i < locals.topics.length; i++)
		{
			var t = locals.topics[i].toJSON();
			t.description = marked(t.description);
			t.owner = people[t.owner_id].toJSON();
			locals.tjson.push(t);
		}

		response.render('agenda-present', locals);
	})
	.fail(function(err)
	{
		response.app.logger.error(err);
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

	Agenda.get(request.params.id)
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

	Agenda.get(request.params.id)
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
		return agenda.save();
	})
	.then(function()
	{
		request.flash('Your agenda has been updated.');
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

	Agenda.get(request.params.id)
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
		return agenda.save();
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

	Agenda.get(request.params.id)
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
		agenda.active = true;
		return agenda.save();
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

exports.handleDeleteAgenda = function(request, response)
{
	var owner = response.locals.authed_user;
	var locals = {};
	var agenda;

	Agenda.get(request.params.id)
	.then(function(found)
	{
		if (!found)
		{
			request.flash('error', 'That agenda can\'t be found.');
			response.redirect('/');
			return;
		}

		if (found.owner_id !== owner.email)
		{
			request.flash('error', 'That agenda doesn\'t belong to you.');
			response.redirect('/');
			return;
		}

		agenda = found;
		return agenda.fetchTopics();
	})
	.then(function(topics)
	{
		return Topic.destroyBatch(topics);
	})
	.then(function()
	{
		return agenda.destroy();
	})
	.then(function()
	{
		request.flash('The agenda "' + agenda.title + '" has been deleted.');
		response.redirect('/');
	}).fail(function(err)
	{
		response.app.logger.error(err);
		request.flash('error', err.message);
		response.redirect('/');
	}).done();

};

exports.topic = function(request, response)
{
	var owner = response.locals.authed_user;
	var locals = {};

	Topic.get(request.params.tid)
	.then(function(topic)
	{
		if (!topic)
		{
			request.app.logger.info('topic not found: ' + request.params.tid);
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

		return Agenda.get(locals.topic.agenda_id);
	})
	.then(function(agenda)
	{
		locals.agenda = agenda;
		response.render('topic', locals);
	})
	.fail(function(err)
	{
		request.app.logger.error('topic() error: ' + request.params.tid, err);
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

exports.handleNewTopic = function(request, response)
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
			request.app.logger.info(topic, 'topic created by ' + owner.key);
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
	var locals = { title: 'Edit topic' };

	Topic.get(request.params.tid)
	.then(function(topic)
	{
		if (!topic || (Array.isArray(topic) && topic.length === 0))
		{
			request.app.logger.info('topic not found: ' + request.params.id);
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

		return Agenda.get(locals.topic.agenda_id);
	})
	.then(function(agenda)
	{
		locals.agenda = agenda;
		response.render('topic-edit', locals);
	})
	.fail(function(err)
	{
		request.app.logger.error('editTopic() error fetching topic: ' + request.params.tid, err);
		request.flash('error', err.message);
		response.redirect('/');
	}).done();

};

exports.handleEditTopic = function(request, response)
{
	var owner = response.locals.authed_user;

	Topic.get(request.params.tid)
	.then(function(topic)
	{
		if (!topic)
		{
			request.app.logger.info('topic not found: ' + request.params.id);
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

		topic.title = request.sanitize('ititle').xss();
		topic.description = request.sanitize('idesc').xss();
		topic.modified = Date.now();

		return topic.save();
	})
	.then(function()
	{
		request.flash('success', 'Topic edits saved.');
		response.redirect('/topics/' + request.params.tid);
	})
	.fail(function(err)
	{
		request.app.logger.error(err, 'handleEditTopic() error fetching topic: ' + request.params.tid);
		request.flash('error', err.message);
		response.redirect('/topics/' + request.params.tid);
	}).done();
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

	Topic.get(topic_id)
	.then(function(topic)
	{
		opts.topic = topic;
		return Vote.fetchFor(topic, opts.owner);
	})
	.then(function(previous)
	{
		if (previous)
		{
			vote = previous;
			if (opts.state === previous.state)
				return false;

			return opts.topic.rollback(opts.state, previous.state)
			.then(function()
			{
				vote.state = opts.state;
				return vote.save();
			})
			.then(function()
			{
				return vote;
			});
		}

		return Vote.create(opts);
	})
	.then(function(recordThis)
	{
		if (recordThis)
		{
			vote = recordThis;
			return opts.topic.recordVote(vote.state);
		}
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

	Topic.get(topic_id)
	.then(function(topic)
	{
		opts.topic = topic;
		return Agenda.get(topic.agenda_id);
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
		return opts.topic.save();
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

exports.handleDeleteTopic = function(request, response)
{
	var person = response.locals.authed_user;
	var topic_id = request.params.tid;
	var opts = {};

	Topic.get(topic_id)
	.then(function(topic)
	{
		opts.topic = topic;
		return topic.obliterate();
	})
	.then(function()
	{
		response.app.logger.debug('topic: ' + opts.topic.key + ' deleted by ' + person.email);
		request.flash('success', 'Topic "' + opts.topic.title + '" has been deleted.');
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
		title: 'Your profile'
	});
};

exports.handleSettings = function(request, response)
{
	var person = response.locals.authed_user;

	if (request.body.avatar)
		request.assert('iavatar', 'avatar is not a valid url').isUrl();

	var errors = request.validationErrors();
	if (errors)
	{
		request.flash('error', util.inspect(errors));
		var locals =
		{
			person: response.locals.authed_user,
			title: 'Your profile'
		};
		response.render('settings', locals);
		return;
	}

	person.name = request.sanitize('iname').xss();
	person.description = request.sanitize('idesc').xss();
	person.avatar = request.sanitize('iavatar').xss();
	person.modified = Date.now();

	person.save()
	.then(function()
	{
		request.flash('success', 'You have updated your profile.');
		response.redirect('/u/' + person.key);
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
			request.flash('warning', 'Profile for ' + uid + ' not found.');
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

