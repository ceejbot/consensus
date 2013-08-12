var
	_        = require('lodash'),
	assert   = require('assert'),
	P        = require('p-promise'),
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
		topics:      'array'
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
	assert(opts.owner, 'you must pass opts.owner to Agenda.create()')

	var agenda = new Agenda();
	agenda.key = uuid.v4();
	agenda.created = Date.now();
	agenda.modified = agenda.created;
	agenda.owner = opts.owner;
	agenda.title = opts.title;
	agenda.description = opts.description;

	return agenda.saveP();
};

Agenda.prototype.addTopic = function(topic)
{
	this.topics.push(topic.key);
	this.topics = _.uniq(this.topics);

	return this.saveP();
};
