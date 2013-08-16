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
		state: ['active', 'archived']
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

function compareTopics(left, right)
{
	if (left.closed() && !right.closed())
		return -1;

	if (right.closed() && !left.closed())
		return 1;

	if (left.tally === right.tally)
		return (left.created.getTime() - right.created.getTime());

	return left.tally - right.tally;
};

Agenda.prototype.fetchTopics = function()
{
	if (this.topics)
		return P(this.topics);

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
			{
				self.topics = topics.sort(compareTopics).reverse();
				self.topics.open = _.filter(self.topics, function(item) { return !item.closed(); });
				self.topics.top = self.topics.open.slice(0, 3);
				self.topics.closed = _.filter(self.topics, function(item) { return item.closed(); });

				deferred.resolve(self.topics);
			}
		});
	});

	return deferred.promise;
};

