if (Meteor.isClient) {

	Session.setDefault("sortby","online_status")
	Session.setDefault("sortdir","-1")
	
	//Inactivity highlighting
	var br_cutoff = 50
	var day_cutoff_below_br = 30
	var day_cutoff_above_br = 60

	//Newbie 
	var newbie_rank = 5 //Detainee
	var newbie_cutoff = 14 //When to mark as inactive
	var newbie_promote = 30  //When to mark for promotion (since outfit join)
	
	/*
	Takes the reqs array from the ItemSets collection.
	Idea is that a number represents an index of an item a player needs to own and an array is a choice of items players can own
	This excludes the "root" array
	Examples
	[1,2,3,4] 	= needs to own items 1,2,3 AND 4
	[[1,2,3,4]] 	= needs to own items 1,2,3 OR 4
	[1,2,[3,4]]	= needs to own items 1,2 and (3 or 4)
	
	*/
	
	function upcomingDay(day) {
		var dayMoment= moment().utc().day(day)
		var nextWeekDayMoment = moment().utc().day(day+7)
		return ((dayMoment < nextWeekDayMoment) ? nextWeekDayMoment.clone() : dayMoment.clone())
	}
	
	UI.registerHelper("timeTillDayHour",function(day,hour){
		return upcomingDay(day).utc().hours(hour).minutes(0).seconds(0).local()
	})
	
	UI.registerHelper("isOpsDay",function() {
		return ([0,2,3,5].indexOf((new Date).getUTCDay())>=0)
	})
	
	UI.registerHelper("niceTimeTill", function(timestamp) {
		var dif = timestamp - Date.now()
		var difDate = new Date(dif)
		//return (dif/(1000*60*60)) + "hours"
		return  difDate.getUTCHours() + " hours " + difDate.getUTCMinutes() + " minutes " + difDate.getUTCSeconds() + " seconds"
	})
	
	UI.registerHelper("getOpsTime", function() {
		return (new Date).setUTCHours(18,0,0,0)
	}) 
	
	UI.registerHelper("opsMoment", function(day,hour) {
		return moment().utc().days(day+7).hours(hour).minutes(0).seconds(0).local()
	})
	
	function playerOwnsItemSet(player_items,itemset_reqs) {
		
		function playerHasItem(item) {
			return (player_items.indexOf(item+"") >= 0)
		}
		
		function recurse(item,justone) {
			if (Array.isArray(item)) {
				var succes = !justone
				item.forEach(function(item) {  
					//succes = (recurse(item,true) || (justone && succes)) //&& (!justone && !succes) // MAGIC
					if (justone!=succes) {
						succes = (recurse(item,true) && (justone!=succes))
					}//&& (!justone && !succes) // MAGIC
				})
				return succes
			} else {
				return playerHasItem(item)
			}
		}
		
		if (player_items && itemset_reqs) {
			return recurse(itemset_reqs,false)
		} else {
			console.error("Invalid arguments for playerOwnsItemSet",player_items,itemset_reqs)
		}
	}

	function daysSince(utc) {
		return (Date.now()/1000 - utc) / (60*60*24)
	}
	
	function playerIsNewbie(player) {
		return (player.ranknum == newbie_rank)
	}
	
	function playerIsActive(player) {
		var days_since_join = daysSince(player.joindate)
		var days_since_login = daysSince(player.last_online)
		
		if (playerIsNewbie(player)) {
			return (days_since_login <= newbie_cutoff)
		} else {
			if (player.br >= br_cutoff) {
				return (days_since_login <= day_cutoff_above_br)
			} else {
				return (days_since_login <= day_cutoff_below_br)
			}
		}
	}
	
	function playerShouldBePromoted(player) {
		if (!playerIsNewbie(player)) {
			return false
		}
		return (daysSince(player.joindate) >= newbie_promote)
	}
	

	
	Template.navbar.events({
		"click #logout_button" : function(e,tmp) {
			e.preventDefault()
			e.stopPropagation()
			console.log(Router.current().path)
			if(Router.current().path == "/settings") {
				Router.go("home")
			}
			Meteor.logout()
		}
	})
	
	//--------------------------------------------------------
	
	Template.playertable.players = function() {
		var q = {}
		q[Session.get("sortby")]=Session.get("sortdir")
		
		//Dont double sort on br
		if (!Session.equals("sortby","br")) {
			q["br"]=-1
		}
		return Players.find({},{sort: q})
	}
	
	Template.playertable.events({
		"click thead td, tap thead td" : function(e,tmp){
			console.log(e)
			var sortby = e.target.getAttribute("data-sortby") || e.target.parentNode.getAttribute("data-sortby")
			if (sortby) {
				Session.set("sortby", sortby);
				Session.set("sortdir", Session.get("sortdir") * -1);
			}
		}
	})
	
	Template.player.name_class = function() {
		return (this.online_status > 0) ? "player_online" : "player_offline"
	}
	
	Template.player.days_since_login = function() {
		return Math.floor(daysSince(this.last_online))
	}
	
	Template.player.days_since_join = function() {
		return Math.floor(daysSince(this.joindate))
	}
	
	Template.player.row_class = function() {
		if (!playerIsActive(this)) {
			return "danger"
		} else if (playerShouldBePromoted(this)) {
			return "succes"
		}
	}
	
	Template.player.indicator_class = function() {
		return (this.online_status > 0) ? "indicator_online" : "indicator_offline"
	}
	
	Template.player.account = function() {
		//console.log(this._id,Meteor.users.findOne({"profile.ps2_id":this._id}))
		//console.log(Meteor.users.findOne({"profile.ps2_id":this._id}) == true)
		return Meteor.users.findOne({"profile.ps2_id":this._id})
	}
	
	Template.player.account_days_since_ts_login = function() {
		var ts3_id = TSClients.findOne(this.profile.ts3_id)
		if (ts3_id) {
			return Math.floor(daysSince(ts3_id.login_date))
		}
	}
	
	//--------------------------------------------------------
	
	
	Template.itemtable.itemset = function() {
		return ItemSets.find()
	}
	
	Template.itemtable.players = function() {
		return Players.find({},{sort: {br:-1}})
	}	
	
	Template.player_items.itemset = function() {
		return ItemSets.find()
	}
	
	Template.itemset_cell.cell_class = function(player) {
		return (playerOwnsItemSet(player.items,this.reqs) ? "succes" : "danger")
	}
	
	//--------------------------------------------------------
	
	Template.teamspeak.clients = function () {
		return TSClients.find({},{sort: {login_date:-1}})
	}
	
	Template.tsclient.days_since_login = function () {
		return Math.floor(daysSince(this.login_date))
	}
	
	//--------------------------------------------------------
	Template.register_form.events({
		"click button" : function(e,tmp) {
			e.preventDefault()
			e.stopPropagation()
			Accounts.createUser({
				username: tmp.find("#username").value,
				//email: tmp.find("#email").value,
				password: tmp.find("#password").value,
				profile: {name: tmp.find("#username").value}
			},function(err) {console.log(err)})
		}
	})
	
	Template.login_form.events({
		"click #login_button" : function(e,tmp) {
			e.preventDefault()
			e.stopPropagation()
			Meteor.loginWithPassword(tmp.find("#username").value,tmp.find("#password").value,function(err){
				Session.set("errormsg",err.reason)
			})
		}
	})
	
	//--------------------------------------------------------
	
	Template.text_update_field.fieldvalue = function() {
		if (!Meteor.user()) {return}
		return Meteor.user().profile[this.id]
	}
	
	Template.text_update_field.events({
		"click .btn" : function(e,tmp) {
			if (!Meteor.user()) {return}
			
			var value = tmp.find("input").value
			if(this.isNumber){
				value = parseInt(value,10)
			}
			
			Meteor.call("updateUserProfileField",this.id,value)
		}
	})
	
	//--------------------------------------------------------
	Template.hidden_modal.events({
		"click #remove_account_button" : function(e,tmp) {
			Meteor.call("removeUser")
			Meteor.logout()
			Router.go("home") //You're drunk
		}
	})
	//--------------------------------------------------------
	Template.settings.emails = function() {
		if (Meteor.user()) {
			return Meteor.user().emails
		}
	}
	
	Template.settings.some_helper_name = function() {
		return Players.findOne()
	}
	
	//--------------------------------------------------------
	Template.email_field.events({
		"click button" : function(e,tmp){
			e.preventDefault()
			e.stopPropagation()
			Meteor.call("sendVerificationMail",tmp.find("input").value)
		}
	})
	
	
	//--------------------------------------------------------
	Template.update_checkbox.checked = function() {
		if (!Meteor.user()) {return}
		if (typeof Meteor.user().profile[this.id] != "undefined") {
			return (Meteor.user().profile[this.id] == true && "true")
		} else {
			return "false" 
		}
	}
	
	
	Template.update_checkbox.events({
		"change input" : function(e,tmp) {
			Meteor.call("updateUserProfileField",this.id,tmp.find("input").checked)
		}
	})
	
	//--------------------------------------------------------
	
	Template.change_password_form.events({
		"click #change_password_button" : function(e,tmp) {
			e.preventDefault()
			e.stopPropagation()
			
			var pw_fields = tmp.findAll("input[type=\"password\"]")
			
			if (pw_fields[0].value===pw_fields[1].value) {
				Accounts.changePassword(tmp.find("#old_password").value,tmp.find("#new_password").value)
			} else {
				Session.set("errormsg","Passwords don't match")
			}
		}
	})
	
	Template.errormsg.msg = function() {
		return Session.get("errormsg")
	}
	
	Template.errormsg.events({
		"click button" : function(e,tmp) {
			Session.set("errormsg",null)
		}
	})
	
	Template.user_all_character_data.ps_char = function() {
		return Players.findOne(Meteor.user().profile.ps2_id)
	}
	
	Template.user_all_character_data.ts_id = function() {
		return Players.findOne(Meteor.user().profile.ts3_id)
	}
	
	Template.ps2_char_info.name = function() {
		var ps2_char = Players.findOne(Meteor.user().profile.ps2_id)
		if (ps2_char) {
			return ps2_char.name
		}
	}
	
	Template.ts3_id_info.name = function() {
		var ts_id = TSClients.findOne(Meteor.user().profile.ts3_id)
		if (ts_id) {
			return ts_id.name
		}
	}
	
	Template.user_array_as_labels.user_array =  function(){
		if (!this.user) {return}
		if (!this.user.profile) {return}
		if (!this.user.profile[this.arrayname]) {return}
		return this.user.profile[this.arrayname]
	}
	
	Template.user_array_as_labels.events({
		"click i" : function(e,tmp) {
			Meteor.call("userPullProfileArray",tmp.data.arrayname,this.toString())
		}
	})
	
	Template.member_info_label.events({
		"click .btn" : function(e,tmp) {
			e.preventDefault()
			e.stopPropagation()
			Meteor.call("userAddSkill",tmp.find("input").value)
		}
	})
	/*
	Template.member_info_label.events({
		"click i" : function(e,tmp) {
			//console.log(this,e,tmp)
			e.preventDefault()
			e.stopPropagation()
			console.log("removing ",tmp.data)
			Meteor.call("userRemoveSkill",tmp.data)
		}
	})
	*/
	
	Template.member_info.meteor_users = function (){
		return Meteor.users.find()
	}
	
	Template.member_info_label.should_show_close = function(parent) {
		return parent.user._id == Meteor.userId()
	}
	
	
	Template.playertable.rendered = function() {
		//$("thead td[data-sortby]").append("<i class=\"icon-resize-vertical pull-right\"></i>")
		
	}
	
	Template.user_array_append_button.events({
		"click button" : function(e,tmp) {
			e.preventDefault()
			e.stopPropagation()
			Meteor.call("userAppendProfileArray",this.arrayname,tmp.find("input").value)
		}
	})
	
}