# PS2OutfitInfo
Meteor based website giving an overview of Planetside 2 outfit (guild) members and their equipment.
The site can show current ingame online state, show what admin-definable itemsets a user owns as well as various join and last activity dates.

My first major Meteor app, quite a mess, but if you _really_ want to use it:

### Requirements:
* Meteor environment (Node.js+MongoDB)
* (Optional) PHP environment with the [TS3 Framework](https://docs.planetteamspeak.com/ts3/php/framework/)
* (Optional) Teamspeak 3 query permissions

### Setup:
1. Unzip to your favorite Meteor location
2. Run Meteor with a `outfitId` setting (string) set to your outfit's ID , see the [Meteor Docs](http://docs.meteor.com/#/full/meteor_settings)
3. Done, hurray! ... or setup TS3:

#### TS3 setup:
1. Move php/ts3_clientdata to your php environment
2. Add the location of the php script to your Meteor settings as `ts3_url`
3. Create a TS3 query login, use the details in the next step
4. Create a JSON-formatted file and fill it with the following data:
`ts3_username`
`ts3_password`
`ts3_host`
`ts3_port (number)`
`ts3_port_virtual (number)`
5. Save it near your php script (but make sure its not publicly accessable!)
6. Edit ts3_clientdata line 4 to refer to the location of your login details file


