exports.index = function(request, response)
{
	response.app.logger.info(Object.keys(response));
	response.render('index', { title: 'Consensus' });
};

exports.signin = function(request, response)
{
	response.app.controller.findOrCreatePerson()
	.then(function(person)
	{
		// create session
		// set flash message
		// redirect to index
	})
	.fail(function(err)
	{
		response.app.logger.warn(err);
		// set flash message
		// redirect to index
	}).done();
};

exports.signout = function(request, response)
{
	// remove user session
	// redirect
};
