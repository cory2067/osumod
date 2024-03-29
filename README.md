# osumod

## Usage for queue owners

### Home Tab

![(i) Pending](http://put.nu/files/JVTQTgd.png)

For each request, click the (i) icon to open a menu where you can set each request to accepted, rejected, nominated, etc.

If you select the "archived" option, the request will be removed from your home page, and moved to the "Archives" tab. This can be useful for decluttering your queue.

After being requested, map info won't update automatically. So if the map changes metadata or star rating, you can use the "Refresh" button to update them.

### Request Tab

There is an "open/closed" slider here for your convenience, which is not visible to others. You can always submit requests to yourself, even if you're closed. Submitting to yourself bypasses all checks (e.g. cooldown).

You also have the ability to add notes to the request page, such as adding queue rules or listing your preferences. These notes support [GitHub-flavored Markdown](https://guides.github.com/features/mastering-markdown/) (similar to message formatting on Discord). You can also specify the following variables, which will be replaced by your current queue settings: `{open}`, `{maxPending}`, `{cooldown}`.

For example, consider the following notes:
```
## Status: {open}
- This queue automatically closes after _{maxPending} requests_.
- After requesting, you need to wait {cooldown} days before requesting again.
- Anime is **banned**
```

Once you save the notes, it'll appear like this:

![image](https://user-images.githubusercontent.com/8433005/111926242-7ba93380-8a82-11eb-9779-0a7f61aec975.png)


### Settings Tab

When logged in and on your own queue, there should be a settings tab. The settings tab has the following options:

- **Open**: Whether the queue is accepting requests. If it's closed, you can still send requests to yourself.
- **Accept M4M requests**: If true, people will have the option to select "M4M" on your request form.
- **Max pending requests**: If the number of pending (not accepted/rejected) requests goes above this number, the queue automatically closes. Set to something large like 9999 if you don't want this
- **Cooldown between requests**: After requesting, a mapper must wait this many days before they can request again. Can set this to 0 if you don't want to enforce a cooldown.
- **Modder Type**: If you select BN, you'll be able to set the status of maps to "nominated". If you select regular modder, you'll just have a "finished" option instead.
- **Gamemodes**: Requests that aren't from the specified gamemode will be automatically rejected.

### Auto-cleanup
Sometimes, modders will create a queue and then abandon it, leaving clutter on the main page. To prevent this, queues will be cleaned up automatically if inactive:
- If a queue is left open for 3 weeks but the owner never responds to any requests, it will automatically be closed
- If the queue owner does nothing (doesn't respond to any requests, doesn't open, etc) for 8 weeks, the queue will be automatically archived

Archived queues can be revived by creating "Create Queue" from the homepage, and the 8 week counter will reset.

---

## Running osumod in development

The following section is written for people who want to contribute to the development of osumod. If you just wanna use a modding queue, you can stop reading.

First, you'll need node.js (at least v12) and npm. Then, you'll need to set up an environment config

## Setting up .env

Make a copy of `.env-template` and save it as `.env`

Fill out the `.env` file as follows (using no quotes/spaces)

- `MONGO_SRV`: Create a mongodb cluster on https://www.mongodb.com/cloud/atlas and put the SRV conection string here. Let me know if you need help with this
- `OSU_API_KEY`: API key you can get at https://old.ppy.sh/p/api
- `CLIENT_ID`: OAuth client ID for osu login. You can make a new OAuth application from https://osu.ppy.sh/home/account/edit at the bottom. Use http://localhost:5000/auth/osu/callback as the callback URL for dev environment
- `CLIENT_SECRET`: OAuth client secret
- `SESSION_SECRET`: You can just put some random string here

## Running the server

First, don't forget to run `npm install` in this directory. Then, in two separate terminals, run `npm start` and `npm run hotloader`. If everything works, you should be able to access the site at http://localhost:5000
