// Pull the pieces together.

var
	fs             = require('fs'),
	levelup        = require('levelup'),
	P              = require('p-promise'),
	path           = require('path'),
	sublevel       = require('level-sublevel'),
	Agenda         = require('./Agenda'),
	Person         = require('./Person'),
	Topic          = require('./Topic'),
	Vote           = require('./Vote'),
	LevelupAdapter = require('polyclay-levelup')
	;

var Controller = module.exports = function Controller(opts)
{
	opts = opts || {};

	var dbpath = opts.dbpath || path.join('.', 'db');
	if (!fs.existsSync(dbpath))
		fs.mkdirSync(dbpath);

	var dbloc = path.join(dbpath, 'consensus.db');
	this.db = sublevel(levelup(dbloc, { valueEncoding: 'json' }));

	dbloc = path.join(dbpath, 'consensus_attach.db');
	this.attachdb = sublevel(levelup(dbloc, { valueEncoding: 'binary' }));

	var options =
	{
		db:        this.db,
		attachdb: this.attachdb
	};
	Agenda.setStorage(options, LevelupAdapter);
	Person.setStorage(options, LevelupAdapter);
	Topic.setStorage(options, LevelupAdapter);
	Vote.setStorage(options, LevelupAdapter);
};

Controller.prototype.findOrCreatePerson = function(email)
{
	var self = this;

	return Person.personByEmail(email)
	.then(function(person)
	{
		if (person)
			return person;

		return Person.create(email);
	});
};

