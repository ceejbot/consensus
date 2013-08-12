var
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
		vote: [ 'mu', 'yea', 'nay', 'flag']
	},
	required: [ 'key', 'topic', 'owner', 'vote' ],
	singular: 'vote',
	plural:   'votes'
});
polyclay.persist(Vote, 'key');

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
