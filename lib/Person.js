var
	_         = require('lodash'),
	moment    = require('moment'),
	P         = require('p-promise'),
	polyclay  = require('polyclay'),
	requester = require('request'),
	Agenda    = require('./Agenda')
	;

moment().format();

var Person = module.exports = polyclay.Model.buildClass(
{
	properties:
	{
		email:       'string',
		name:        'string',
		created:     'date',
		modified:    'date',
		description: 'string',
		avatar:      'string',
		agendas:     'array',
		apikey:      'string'
	},
	required: [ 'email' ],
	singular: 'person',
	plural:   'people',
});
polyclay.persist(Person, 'email');
Person.defineAttachment('icon', 'image/*');

Person.personByEmail = function(email)
{
	var deferred = P.defer();

	Person.get(email, function(err, person)
	{
		if (err)
			return deferred.reject(err);
		if (!person || (Array.isArray(person) && person.length === 0))
			return deferred.resolve(null);

		deferred.resolve(person);
	});

	return deferred.promise;
};

Person.prototype.generateAPIKey = function()
{

};

Person.prototype.fetchSigil = function()
{
	var self = this,
		deferred = P.defer();

	var uri = 'https://sigil.cupcake.io/' + this.email + '/' + encodeURIComponent(this.name);
	request.get(uri, function(err, response, body)
	{
		if (err)
			return deferred.reject(err);

		if (response.statusCode !== 200)
			return deferred.resolve(false);

		self.icon = body;
		self.save()
		.then(function()
		{
			deferred.resolve(body);
		})
		.fail(function(err)
		{
			deferred.reject(err);
		}).done();
	});

	return deferred.promise;
};

Person.prototype.displayName = function()
{
	if (this.name.length > 0)
		return this.name;

	return this.email;
};

Person.prototype.createdSince = function createdSince()
{
	return moment(this.created).fromNow();
};

Person.create = function(email)
{
	var person = new Person();
	person.email = email;
	person.created = Date.now();
	person.modified = person.created;

	return person.save();
};

Person.prototype.addAgenda = function(key)
{
	if (this.agendas.indexOf(key) === -1)
	{
		this.agendas.push(key);
		return this.save();
	}

	return P('OK');
};

Person.prototype.fetchAgendas = function()
{
	return Agenda.get(this.agendas)
	.then(function(agendas)
	{
		agendas.sort(Agenda.compare);
		return agendas;
	});
};
