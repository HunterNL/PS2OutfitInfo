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
  if(!request.data || !request.data.players) {
      throw new Meteor.Error("ts3_connection_error","Did not get TS3 data from HP script",request);
  }

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
