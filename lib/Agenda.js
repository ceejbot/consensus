var
	_        = require('lodash'),
	assert   = require('assert'),
	P        = require('p-promise'),
	polyclay = require('polyclay'),
	uuid     = require('node-uuid'),
	Topic    = require('./Topic')
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
});
polyclay.persist(Agenda);

Agenda.fetch = function(key)
{
	var deferred = P.defer();

	Agenda.get(key, function(err, result)
	{
		if (err)
			deferred.reject(err);
		else
			deferred.resolve(result);
	});

	return deferred.promise;
};

Agenda.prototype.saveP = function()
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

Agenda.create = function(opts)
{
	assert(opts, 'you must pass an options object to Agenda.create()');
	assert(opts.owner, 'you must pass opts.owner to Agenda.create()');

	var agenda = new Agenda();
	agenda.key = uuid.v4();
	agenda.created = Date.now();
	agenda.modified = agenda.created;
	agenda.owner = opts.owner;
	agenda.title = opts.title;
	agenda.description = opts.description;

	return agenda.saveP();
};

Agenda.prototype.topics = function()
{
	var self = this,
		deferred = P.defer();

	var topicdb = Topic.adapter.objects;
	var keys = [];
	var opts =
	{
		start: this.key + '|',
		end: this.key + '}'
	};

	topicdb.createKeyStream(opts)
	.on('data', function(key)
	{
		keys.push(key);
	})
	.on('end', function()
	{
		Topic.get(keys, function(err, topics)
		{
			if (err)
				deferred.reject(err);
			else
				deferred.resolve(topics);
		});
	});

	return deferred.promise;
};

