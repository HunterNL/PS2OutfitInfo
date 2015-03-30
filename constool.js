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
