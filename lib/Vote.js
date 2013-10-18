var
	assert   = require('assert'),
	P        = require('bluebird'),
	polyclay = require('polyclay')
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

Vote.fetchFor = function(topic, owner)
{
	if (!owner)
		return P.cast(null);

	var key = topic.key + ':' + owner.email;
	return Vote.get(key)
	.then(function(vote)
	{
		if (vote)
			return vote;
		return Vote.get(topic.key + '|' + owner.email);
	});
};

Vote.create = function(opts)
{
	assert(opts, 'you must pass an options object to Vote.create()');
	assert(opts.owner, 'you must pass opts.owner to Vote.create()');
	assert(opts.topic, 'you must pass opts.topic to Vote.create()');
	assert(opts.state, 'you must pass opts.state to Vote.create()');

	var vote = new Vote();
	vote.key      = opts.topic.key + ':' + opts.owner.email;
	vote.created  = Date.now();
	vote.modified = vote.created;
	vote.owner    = opts.owner;
	vote.topic    = opts.topic;
	vote.state    = opts.state;

	return vote.save()
	.then(function()
	{
		return vote;
	});
};
