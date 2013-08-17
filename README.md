consensus
=========

Imagine a Google Moderator that didn't make you tear your hair out. That's Consensus.


## Operational requirements

Consensus stores its data in a set of leveldb databases, which are saved on disk. You'll wish to have sufficient fast disk to support your expected use. For small, inactive installations, just about anything will do. You'll also want to back those files up if the data Consensus stores is valuable to you.

Consensus makes no attempt to restrict access to the data or to account creation. If you have access to the site, you can create an account using [Mozilla Persona](https://www.mozilla.org/en-US/persona/). It is intended to be used behind a firewall. Note that it must be able to make outgoing connections at least to `verifier.login.persona.org:443` to verify user identities.

## Installing

Clone the repo or `npm install consensus`. Copy the sample config file in `config.js.sample` to `config.js` and edit to your satisfaction.

```javascript
{
	"port":    3000, // may be overridden by setting PORT env var
	"dbpath":  "/var/db/consensus",
	"logging": 
	{
		"path": "/var/log/consensus",
		"console": false
	},
	"secrets": ["your cookie secret passphrase thingie", "which get passed to keygrip" ]
}
```

You may also pass in the location of the config file using the `CONFIG_FILE` environment variable.

Then start the app: `npm start`.
