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

Person.prototype.saveP = function()
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

Person.prototype.votes = function()
{
	// fetch all votes by this person
};

Person.prototype.agendas = function()
{
	// fetch all agendas owned by this person
};

Person.prototype.relevant = function()
{
	// fetch all agendas participated in by this person
};
