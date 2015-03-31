
if(Meteor.settings.debug) {
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

        matchNames : function() {
            Players.find().forEach(function(player) {
                var ps2_id = player._id;
                console.log(ps2_id);
                if (Meteor.users.findOne({"profile.ps2_id": ps2_id})) {return;}

                Meteor.createUser({
        	        username: player.name,
        	        //email: tmp.find("#email").value,
        	        password: "password",
        	        profile: {name: player.name}
                });
            });
        }
	});
}
