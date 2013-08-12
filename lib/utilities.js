var alpha = '0123456789abcdefghijklmnopqrstuvwxyz';
function randomID(length)
{
	length = length || 6;
	var result = '';
	var idx;
	for (var i = 0; i < length; i++)
		result += alpha[Math.floor(Math.random() * alpha.length)];

	return result;
}

exports.randomID = randomID;
