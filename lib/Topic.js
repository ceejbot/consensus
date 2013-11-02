var
	_         = require('lodash'),
	assert    = require('assert'),
	P         = require('bluebird'),
	polyclay  = require('polyclay'),
	through   = require('through'),
	utilities = require('./utilities'),
	Vote      = require('./Vote'),
	moment    = require('moment')
	;

moment().format();

var Topic = module.exports = polyclay.Model.buildClass(
{
	properties:
	{
		key:         'string',
		owner:       'reference',
		agenda:      'reference',
		created:     'date',
		modified:    'date',
		title:       'string',
		description: 'string',
		tally:       'number',
	},
	enumerables:
	{
		state: ['open', 'closed']
	},
	required: [ 'key', 'title', 'owner' ],
	singular: 'topic',
	plural: 'topics',
});
polyclay.persist(Topic, 'key');

Topic.prototype.closed = function()
{
	return this.state === 'closed';
};

Topic.create = function create(opts)
{
	assert(opts, 'you must pass an options object to Topic.create()');
	assert(opts.owner, 'you must pass opts.owner to Topic.create()');
	assert(opts.agenda, 'you must pass opts.agenda to Topic.create()');

	var topic = new Topic();
	topic.key         = opts.agenda.key + ':' + utilities.randomID(5);
	topic.created     = Date.now();
	topic.modified    = topic.created;
	topic.owner       = opts.owner;
	topic.agenda      = opts.agenda;
	topic.title       = opts.title;
	topic.description = opts.description;
	topic.tally       = 0;
	topic.state       = 'open';

	return topic.save()
	.then(function()
	{
		return topic;
	});
};

Topic.prototype.recordVote = function(state)
{
	switch (state)
	{
	case 'mu':
		break;

	case 'flag':
		break;

	case 'yes':
		this.tally++;
		break;

	case 'no':
		this.tally--;
		break;

	default:
		// wtf
	}

	return this.save();
};

Topic.prototype.rollback = function(newstate, oldstate)
{
	if (newstate === oldstate)
		return P('OK');

	if (oldstate === 'yea')
		this.tally--;
	else if (oldstate === 'nay')
		this.tally++;

	return P('OK');
};

Topic.prototype.votes = function votes()
{
	var self = this,
		deferred = P.pending();

	var votedb = Vote.adapter.objects;
	var keys = [];

	votedb.createKeyStream({ start: this.key + ':', end: this.key + '}'})
	.on('data', function(key)
	{
		keys.push(key);
	})
	.on('end', function()
	{
		Vote.get(keys, function(err, votes)
		{
			if (err) return deferred.reject(err);

			deferred.fulfill(votes);
		})
	})
	.on('error', function(err)
	{
		deferred.reject(err);
	});

	return deferred.promise;
};

Topic.prototype.voters = function getVoters()
{
	var self = this,
		deferred = P.pending();

	var votedb = Vote.adapter.objects;
	var voters = [];

	votedb.createKeyStream({ start: this.key + ':', end: this.key + '}'})
	.on('data', function(key)
	{
		var parts = key.split(':');
		if (!parts || parts.length === 1)
			parts = key.split('|');
		if ((parts.length == 3) && parts[2].length)
			voters.push(parts[2]);
	})
	.on('end', function()
	{
		deferred.fulfill(voters);
	})
	.on('error', function(err)
	{
		deferred.reject(err);
	});

	return deferred.promise;
};

Topic.prototype.proposedWhen = function proposedWhen()
{
	return moment(this.created).fromNow();
};

Topic.prototype.obliterate = function()
{
	var self = this,
		deferred = P.pending();

	var actions = [];
	var votedb = Vote.adapter.objects;

	votedb.createKeyStream({ start: this.key + ':', end: this.key + '}'})
	.on('data', function(key)
	{
		actions.push({ type: 'del', key: key});
	})
	.on('end', function()
	{
		votedb.batch(actions, function(err)
		{
			if (err)
				return deferred.reject(err);

			self.destroy()
			.then(function()
			{
				deferred.fulfill('OK');
			},
			function(err)
			{
				deferred.reject(err);
			}).done();
		});
	})
	.on('error', function(err)
	{
		deferred.reject(err);
	});

	return deferred.promise;
};

Topic.destroyBatch = function(topics)
{
	var actions = _.each(topics, function(t)
	{
		return t.obliterate();
	});

	return P.allSettled(actions);
};

Topic.stream = function()
{
	var thruStream = through();

	Topic.adapter.objects.createReadStream()
	.on('data', function (data) {
		thruStream.queue(JSON.stringify(data.value) + '\n');
	})
	.on('error', function (err)
	{
		thruStream.end();
	})
	.on('end', function () {
		thruStream.end();
	});

	return thruStream;
};

