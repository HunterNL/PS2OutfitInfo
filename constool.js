Players = new Meteor.Collection("players");
TSClients = new Meteor.Collection("tsclients");
ItemSets = new Meteor.Collection("itemsets");

Meteor.users.allow({
	update : function(userId,doc) {
		return userId == doc._id;
	}
});

Router.map(function() {
	this.route("home", {path:"/"});
	this.route("items");
	this.route("teamspeak");
	this.route("settings");
	this.route("member_info");
	this.route("ops");
});

Router.configure({
	layoutTemplate: "masterlayout"
});

Meteor.methods({
	clearPlayers : function() {
		Players.remove({});
	},

	clearTSClients :  function() {
		TSClients.remove({});
	},

	clearItemSets : function() {
		ItemSets.remove({});
	},

	clearUsers : function() {
		Meteor.users.remove({});
	},

	updateUserProfileField : function(key,value) {
		if (this.userId) {
			//TODO: validate input here
			var subquery = {};
			subquery["profile."+key]=value;
			console.log("set "+key+" to "+value);
			Meteor.users.update(this.userId,{$set : subquery});
		}
	},

	userAppendProfileArray : function(arrayname,value) {
		if (!arrayname) {return;}
		if (!value) {return;}

		var q = {};
		q["profile."+arrayname]=value;
		Meteor.users.update(this.userId,{$push : q});
	},

	userPullProfileArray : function(arrayname,value) {
		if (!arrayname) {return;}
		if (!value) {return;}

		var q = {};
		q["profile."+arrayname]=value;
		console.log(arrayname,value);
		Meteor.users.update(this.userId,{$pull : q});
	},

	userAddSkill : function(skill) {
		Meteor.users.update(Meteor.userId(),{
			$push : {
				"profile.skills" : skill
			}
		});
	},

	userRemoveSkill : function(skill) {
		Meteor.users.update(Meteor.userId(),{
			$pull : {
				"profile.skills" : skill
			}
		});
	},

	populateItemsets : function() {
		if(ItemSets.find({}).count() === 0) {
			ItemSets.insert({
				name: "Phoenix",
				desc: "Phoenix Missile Launcher",
				reqs: [[33002,266]] //Include golden Phoenix
			});

			ItemSets.insert({
				name: "Hawk",
				desc: "Hawk Missile Launcher",
				reqs: [33004]
			});
			ItemSets.insert({
				name: "Max AI",
				desc: "Max Anti-Infrantry (Scatter,Grinder,Mattock,Hacksaw) on both hands",
				reqs: [[16000,7507,7505,7506],[16012,16026,16024,16025]]
			});
			ItemSets.insert({
				name: "Max AT",
				desc: "Max Anti-Tank (Falcon,Raven) on both hands",
				reqs: [[16013,16028],[16001,16029]]
			});
			ItemSets.insert({
				name: "Max AA",
				desc: "Max Anti-Air Bursters on both hands",
				reqs: [16004,16016]
			});
			ItemSets.insert({
				name: "Medic",
				desc: "Max level medic tool",
				reqs: [1621]
			});
			ItemSets.insert({
				name: "Engi",
				desc: "Max level engineer tool",
				reqs: [6012]
			});
			ItemSets.insert({
				name: "Skywhale",
				desc: "All Galaxy Walkers and bulldogs",
				reqs: [5517,5516,5518,5519]
			});
			ItemSets.insert({
				name: "Dark Wave",
				desc: "Dark Wave camo",
				reqs: [77202]
			});
		}
	}
});


if (Meteor.isServer) {

	function findPS2Char(name) {
		return Players.findOne({name_lower: new RegExp(name.toLowerCase())});
	}

	function findTS3Ident(name){
		return TSClients.find({name_lower: new RegExp(name.toLowerCase())},{sort: {login_date : -1}}).fetch()[0];
	}


	Accounts.onCreateUser(function(options,user) {
		user.profile = options.profile;

		var ps2_char = findPS2Char(user.profile.name);
		var ts3_id = findTS3Ident(user.profile.name);

		user.profile.ps2_id = ps2_char && ps2_char._id;
		user.profile.ts3_id = ts3_id && ts3_id._id;
		return user;
	});

	Meteor.methods({
		updatePlayers : function () {
			console.log("pre");
			updatePlayerData();
			console.log("post");
		},

		updateItemData : function() {
			updatePS2ItemData();
		},

		updateTSClients : function () {
			updateTSClientData();
		},

		delaytest : function () {
			console.log("test");
		},

		removeUser : function() {
			if (this.userId) {
				Meteor.users.remove(this.userId);
			}
		},

		matchNames : function() {

			Players.find().forEach(function(player) {
				var ps2_id = player._id;
				console.log(ps2_id);
				if (Meteor.users.findOne({"profile.ps2_id": ps2_id})) {
				return;}

				Accounts.createUser({
					username: player.name,
					//email: tmp.find("#email").value,
					password: "password",
					profile: {name: player.name}
				});
			});
			/*
			Meteor.users.forEach(function(user) {
				var ps2_char = findPS2Char(user.profile.name)
				var ts3_id = findTS3Ident(user.profile.name)

				user.profile.ps2_id = ps2_char && ps2_char._id
				user.profile.ts3_id = ts3_id && ts3_id._id
			})
			*/
		},

		sendVerificationMail : function(mail) {
			//Accounts.sendVerificationEmail(this.userId,mail)
		}
	});

	var outfit_id = Meteor.settings.outfitId;
	var ps2_player_url = "https://census.soe.com/get/ps2/outfit_member?outfit_id="+outfit_id+"&c:resolve=online_status,character&c:limit=500";
	var ps2_item_url = "https://census.soe.com/get/ps2/outfit_member/?outfit_id="+outfit_id+"&c:join=character^show:'name.first'battle_rank.value^inject_at:character_data(characters_item^list:1^inject_at:items^show:item_id)&c:limit=500";
	var ts3_url = Meteor.settings.ts3_url;

	//Debugging URLS for pasting to browser
	//https://census.soe.com/get/ps2/outfit_member?outfit_id=37509488620601506&c:resolve=online_status,character&c:limit=500
	//https://census.soe.com/get/ps2/outfit_member/?outfit_id=37509488620601506&c:join=character^show:'character_id^inject_at:character_data(characters_item^list:1^inject_at:items^show:item_id)&c:limit=500


	function updatePlayerData() {
		var jsonData = HTTP.get(ps2_player_url).data;
		console.log("Requesting PS2 Player Data");
		var member_list = jsonData.outfit_member_list;



		member_list.forEach(function(entry) {

			//Don't bother with deleted characters (thanks FNO)
			if (entry.character && entry.character.times) {
				var online_status = (entry.online_status > 0 ? 1 : 0);


				//Properly parse numeric values for sorting (and db optimization?)
				var id = parseInt(entry.character_id,10);
				var joindate = parseInt(entry.member_since,10);
				var br = parseInt(entry.character.battle_rank.value,10);
				var br_to_next = parseInt(entry.character.battle_rank.percent_to_next);
				var logindate = parseInt(entry.character.times.last_login,10);
				var ranknum = parseInt(entry.rank_ordinal,10);


				var rank = entry.rank;
				var name = entry.character.name.first;
				var name_lower = entry.character.name.first_lower;

				//Upsert updates and inserts if neccesary
				Players.upsert(id,{
					$set : {
						online_status: online_status,
						last_online : logindate,
						name : name,
						name_lower : name_lower,
						joindate : joindate,
						rank : rank,
						ranknum : ranknum,
						br: br,
						br_to_next : br_to_next
					},
					//$setOnInsert : { _id : entry.character_id}
				});
			}
		});
	}

	function updatePS2ItemData() {
		console.log("Requesting PS2 Item Data");
		var request = HTTP.get(ps2_item_url);

		var playerData = [];

		//For every player
		request.data.outfit_member_list.forEach(function (player) {

			//Check for removed players
			if (typeof player.character_data != "undefined" && typeof player.character_data.items != "undefined") {

				//Collect all items
				var items = [];
				player.character_data.items.forEach(function (item) {
					items.push(item.item_id);
				});


				var id = parseInt(player.character_id,10);
				//And throw them in the DB
				Players.upsert(id,{
					$set : {
						items : items
					}
				});
			}
		});

	}

	function updateTSClientData() {
		console.log("Requesting TS3 Client Data");
		var request = HTTP.get(ts3_url);

		request.data.players.forEach(function(entry) {
			var id = entry.id;
			var name = entry.name;
			var name_lower = entry.name.toLowerCase();
			var last_connected = parseInt(entry.last_connected,10);

			TSClients.upsert(id, {
				$set : {
					name: name,
					name_lower : name_lower,
					login_date: last_connected
				}
			});
		});
	}

	Meteor.startup(function () {

		Meteor.call("populateItemsets");

		Meteor.setInterval(updatePlayerData,1000*60*1); //Every minute
		Meteor.setInterval(updateTSClientData,1000*60*5); //Every 5 minutes
		Meteor.setInterval(updatePS2ItemData,1000*60*5); //Every 5 minutes
	});
}
