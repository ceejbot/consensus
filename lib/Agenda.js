var
	polyclay = require('polyclay'),
	uuid     = require('node-uuid')
	;


var Agenda = module.exports = polyclay.Model.buildClass(
{
	properties:
	{
		key:         'string',
		title:       'string',
		created:     'date',
		modified:    'date',
		description: 'string',
		owner:       'reference',
	},
	enumerables:
	{
		state: ['open', 'closed']
	},
	required:   [ 'key', 'title', 'owner'],
	singular:   'agenda',
	plural:     'agendas',
	initialize: function()
	{
	},
});
polyclay.persist(Agenda);
