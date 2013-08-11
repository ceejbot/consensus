var
	P        = require('p-promise'),
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


Person.create = function(email)
{
	var deferred = P.defer();

	var person = new Person();
	person.email = email;
	person.created = Date.now();
	person.modified = person.created;

	person.save(function(err)
	{
		if (err)
			deferred.reject(err);
		else
			deferred.resolve(person);
	});

	return deferred.promise;
};
