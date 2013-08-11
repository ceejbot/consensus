var
	polyclay = require('polyclay')
	;

var Person = module.exports = polyclay.Model.buildClass(
{
	properties:
	{
		email:       'string',
		created:     'date',
		modified:    'date',
		description: 'string',
		avatar:      'string',
	},
	required: [ 'email' ],
	singular: 'person',
	plural:   'people',
});
polyclay.persist(Person, 'email');
