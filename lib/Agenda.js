var
	_        = require('lodash'),
	assert   = require('assert'),
	P        = require('bluebird'),
	polyclay = require('polyclay'),
	Puid     = require('puid'),
	through  = require('through'),
	Topic    = require('./Topic')
	;

var puid = new Puid(true);

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
		active:      'boolean'
	},
	required:   [ 'key', 'title', 'owner'],
	singular:   'agenda',
	plural:     'agendas',
	initialize: function()
	{
		this.active = true;
	},
});
polyclay.persist(Agenda);

Agenda.compare = function(left, right)
{
	if (!left.active && right.active)
		return -1;

	if (!right.active && left.active)
		return 1;

	return left.title.localeCompare(right.title);
};

Agenda.create = function(opts)
{
	assert(opts, 'you must pass an options object to Agenda.create()');
	assert(opts.owner, 'you must pass opts.owner to Agenda.create()');

	var agenda = new Agenda();
	agenda.key = puid.generate();
	agenda.created = Date.now();
	agenda.modified = agenda.created;
	agenda.owner = opts.owner;
	agenda.title = opts.title;
	agenda.description = opts.description;

	return agenda.save()
	.then(function()
	{
		return agenda;
	});
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
}

Agenda.prototype.fetchTopics = function()
{
	if (this.topics)
		return P.cast(this.topics);

	var self = this,
		deferred = P.pending();

	var topicdb = Topic.adapter.objects;
	var keys = [];
	var opts =
	{
		start: this.key + ':',
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

				deferred.fulfill(self.topics);
			}
		});
	});

	return deferred.promise;
};

Agenda.stream = function()
{
	var thruStream = through();

	Agenda.adapter.objects.createReadStream()
	.on('data', function (data) {
		thruStream.queue(JSON.stringify(data.value) + '\n');
	})
	.on('error', function (err)
	{
		thruStream.end();
	})
	.on('end', function () {
		thruStream.end();
	});

	return thruStream;
};
