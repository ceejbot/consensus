var
	_        = require('lodash'),
	moment   = require('moment'),
	P        = require('p-promise'),
	polyclay = require('polyclay'),
	Agenda   = require('./Agenda')
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
		agendas:     'array'
	},
	required: [ 'email' ],
	singular: 'person',
	plural:   'people',
});
polyclay.persist(Person, 'email');

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


Person.prototype.createdSince = function createdSince()
{
	return moment(this.created).fromNow();
};

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

Person.prototype.addAgenda = function(key)
{
	if (this.agendas.indexOf(key) === -1)
	{
		this.agendas.push(key);
		return this.saveP();
	}

	return P('OK');
};

Person.prototype.fetchAgendas = function()
{
	return Agenda.fetch(this.agendas)
	.then(function(agendas)
	{
		agendas.sort(Agenda.compare);
		return agendas;
	});
};
