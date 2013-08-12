var
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
		created:     'date',
		modified:    'date',
		title:       'string',
		description: 'string',
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
