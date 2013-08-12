navigator.id.watch(
{
	loggedInUser: authed_user,
	onlogin: function(assertion)
	{
		// A user has logged in! Here you need to:
		// 1. Send the assertion to your backend for verification and to create a session.
		// 2. Update your UI.
		$.ajax(
		{
			type: 'POST',
			url: '/auth/signin', // This is a URL on your website.
			data: { assertion: assertion },
			success: function(res, status, xhr)
			{
				if (res.page)
					window.location.href = res.page;
				else
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
			success: function(res, status, xhr) { window.location.reload(); },
			error: function(xhr, status, err) { console.log("Logout failure: " + err); }
		});
	}
});

$(document).ready(function()
{
	$('#signin').click(function()
	{
		navigator.id.request({siteName: 'Consensus'});
	});

	$('#signout').click(function()
	{
		navigator.id.logout();
	});
});
