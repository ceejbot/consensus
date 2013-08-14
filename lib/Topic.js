var
	assert    = require('assert'),
	P         = require('p-promise'),
	polyclay  = require('polyclay'),
	utilities = require('./utilities'),
	Vote      = require('./Vote')
	;

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
		tally:       'number'
	},
	required: [ 'key', 'title' ],
	singular: 'topic',
	plural: 'topics',
});
polyclay.persist(Topic, 'key');

Topic.fetch = function(key)
{
	var deferred = P.defer();

	Topic.get(key, function(err, result)
	{
		if (err)
			deferred.reject(err);
		else
			deferred.resolve(result);
	});

	return deferred.promise;
};

Topic.prototype.saveP = function saveP()
{
	var self = this,
		deferred = P.defer();

	this.save(function(err)
	{
		if (err)
			deferred.reject(err);
		else
			deferred.resolve(self);
	});

	return deferred.promise;
};

Topic.create = function create(opts)
{
	assert(opts, 'you must pass an options object to Topic.create()');
	assert(opts.owner, 'you must pass opts.owner to Topic.create()');
	assert(opts.agenda, 'you must pass opts.agenda to Topic.create()');

	var topic = new Topic();
	topic.key         = opts.agenda.key + '|' + utilities.randomID(5);
	topic.created     = Date.now();
	topic.modified    = topic.created;
	topic.owner       = opts.owner;
	topic.agenda      = opts.agenda;
	topic.title       = opts.title;
	topic.description = opts.description;
	topic.tally       = 0;

	return topic.saveP();
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

	return this.saveP();
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
		deferred = P.defer();

	var votedb = Vote.adapter.db;
	var keys = [];

	votedb.createKeyStream({ start: this.key + ':', end: this.key + ';'})
	.on('data', function(key)
	{
		keys.push(key);
	})
	.on('end', function()
	{
		Vote.get(keys, function(err, votes)
		{
			if (err) return deferred.reject(err);

			deferred.resolve(votes);
		});
	});

	return deferred.promise;
};
