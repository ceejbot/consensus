navigator.id.watch(
{
	loggedInUser: authed_user,
	onlogin: function(assertion)
	{
		$.ajax(
		{
			type: 'POST',
			url: '/auth/signin',
			data: { assertion: assertion },
			success: function(res, status, xhr)
			{
				window.location.reload();
			},
			error: function(xhr, status, err)
			{
				navigator.id.logout();
				console.log("Login failure: " + err);
			}
		});
	},
	onlogout: function()
	{
		$.ajax(
		{
			type: 'POST',
			url: '/auth/signout',
			success: function(res, status, xhr)
			{
				if (window.location.href === '/')
					window.location.reload();
				else
					window.location.href = '/';
			},
			error: function(xhr, status, err) { console.log("Logout failure: " + err); }
		});
	}
});

$(document).ready(function()
{
	$('.signin').click(function()
	{
		navigator.id.request({siteName: 'Consensus'});
	});

	$('#signout').click(function()
	{
		navigator.id.logout();
	});
});
