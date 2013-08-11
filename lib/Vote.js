var
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
