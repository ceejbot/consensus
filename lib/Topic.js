var
	polyclay = require('polyclay'),
	uuid     = require('node-uuid')
	;

var Topic = module.exports = polyclay.Model.buildClass(
{
	properties:
	{
		key:         'string',
		owner:       'reference',
		created:     'date',
		modified:    'date',
		title:       'string',
		description: 'string',
	},
	required: [ 'key', 'title' ],
	singular: 'topic',
	plural: 'topics',
});
polyclay.persist(Topic, 'key');
