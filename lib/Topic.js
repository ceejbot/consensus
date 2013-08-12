var
	assert   = require('assert'),
	P        = require('p-promise'),
	polyclay = require('polyclay'),
	uuid     = require('node-uuid')
	;

var Topic = module.exports = polyclay.Model.buildClass(
{
	properties:
	{
		key:         'string',
		owner:       'reference',
		agenda:      'reference',
		created:     'date',
		modified:    'date',
		title:       'string',
		description: 'string',
		votes:       'array'
	},
	required: [ 'key', 'title' ],
	singular: 'topic',
	plural: 'topics',
});
polyclay.persist(Topic, 'key');


Topic.prototype.saveP = function()
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

Topic.create = function(opts)
{
	assert(opts, 'you must pass an options object to Topic.create()');
	assert(opts.owner, 'you must pass opts.owner to Topic.create()')
	assert(opts.agenda, 'you must pass opts.agenda to Topic.create()')

	var topic = new Topic();
	topic.key         = uuid.v4();
	topic.created     = Date.now();
	topic.modified    = topic.created;
	topic.owner       = opts.owner;
	topic.agenda      = opts.agenda;
	topic.title       = opts.title;
	topic.description = opts.description;

	return topic.saveP();
};
