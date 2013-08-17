# Consensus

Imagine a Google Moderator that didn't make you tear your hair out. That's Consensus.

## What's that when it's at home?

[Google Moderator](https://www.google.com/moderator/) is a tool for counting votes on topics. The intent of their tool is to count lots of votes from lots of people for giant events. I hear their own company meeting is an intended use. Sadly, smaller companies also sometimes use it as a convenient voting tool. That's where its typically horrible Google user interface starts to truly hurt.

I wanted a tool for counting votes for much smaller audiences, where topic discovery was much easier. Well, possible.

### Features

TBD

- automatic account provisioning & signin via [Mozilla Persona](https://www.mozilla.org/en-US/persona/)
- anyone can set up an agenda aka meeting
- anyone can add topics to an agenda
- everyone can vote on those topics
- markdown formatting for everything with a description


## Operational requirements

Consensus stores its data in a set of leveldb databases, which are saved on disk. You'll wish to have sufficient fast disk to support your expected use. For small, less-active installations, just about anything will do. You'll also want to back those files up if the data Consensus stores is valuable to you.

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

## API

TBD.
