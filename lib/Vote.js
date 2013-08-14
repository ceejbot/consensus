var
	assert   = require('assert'),
	P        = require('p-promise'),
	polyclay = require('polyclay'),
	uuid     = require('node-uuid')
	;

var Vote = module.exports = polyclay.Model.buildClass(
{
	properties:
	{
		key:      'string',
		topic:    'reference',
		owner:    'reference',
		created:  'date',
		modified: 'date',
	},
	enumerables:
	{
		state: [ 'mu', 'yes', 'no', 'flag']
	},
	required: [ 'key', 'topic', 'owner', 'vote' ],
	singular: 'vote',
	plural:   'votes'
});
polyclay.persist(Vote, 'key');

Vote.fetch = function(key)
{
	var deferred = P.defer();

	Vote.get(key, function(err, result)
	{
		if (err)
			return deferred.reject(err);
		else
			deferred.resolve(result);
	});

	return deferred.promise;
};

Vote.fetchFor = function(topic, owner)
{
	var key = topic.key + '|' + owner.email;
	return Vote.fetch(key);
};

Vote.prototype.saveP = function()
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

Vote.create = function(opts)
{
	assert(opts, 'you must pass an options object to Vote.create()');
	assert(opts.owner, 'you must pass opts.owner to Vote.create()');
	assert(opts.topic, 'you must pass opts.topic to Vote.create()');
	assert(opts.state, 'you must pass opts.state to Vote.create()');

	var vote = new Vote();
	vote.key      = opts.topic.key + '|' + opts.owner.email;
	vote.created  = Date.now();
	vote.modified = vote.created;
	vote.owner    = opts.owner;
	vote.topic    = opts.topic;
	vote.state    = opts.state;

	return vote.saveP();
};
