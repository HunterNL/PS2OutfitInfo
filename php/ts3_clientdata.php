<?php
	//Depends on TS3 PHP framework
	require_once("TeamSpeak3.php");
	header('Content-Type: application/json');

	function echoAsJson($r) {
		if (isset($_GET["callback"]) && !empty($_GET["callback"])) {
			echo $_GET["callback"] . "(" . json_encode($r) . ")";
		} else {
			echo json_encode($r);
		}
	}

	function echoExeptionAsJson($e) {
		$r = array();
		$r["error_code"]=$e->getCode();
		$r["error_message"]=$e->getMessage();
		echoAsJson($r);
	}

	function getClients($ts,$count) {
		$offset=0;
		$result = array();
		while (true) {
			$clients = $ts->clientListDb($offset,200);
			$offset = $offset + 200;

			foreach($clients as $client) {
				//echo $client["client_nickname"];


				$clientID = $client["client_unique_identifier"]->toString();
				$clientname = $client["client_nickname"]->toString(); //WHyyyyyyyy
				$clientlogindate = $client["client_lastconnected"];  //consistencyyyyy

				$clientdata = array(
					"id" => $clientID,
					"name" => $clientname,
					"last_connected" =>$clientlogindate
				);

				$result[] = $clientdata;
			}

			if ($offset < $count ) {
				sleep(1); //Sleep do we don't get temp banned for exesive requests
			} else {
				break;
			}
		}
		return $result;
	}

	//Not exactly sure how port and virtual server port work, it seems like regular port is to connect to the query process and vs port to select what server to work with
	//Querry should look like "serverquery://irsmartclient:qwerty123@example.example.com:10011/?server_port=7220"
	function getTSHandle($username,$password,$ip,$port,$virtual_server_port) {
		if(isset($virtual_server_port)) {
			$suffix = "?server_port=$virtual_server_port";
		} else {
			$suffix = "";
		}
		return TeamSpeak3::factory("serverquery://$username:$password@$ip:$port/$suffix");
	}


	try {
		$jsonString = file_get_contents("php_settings.json");
		$jsonData = json_decode($jsonString);

		$ts3_login = $jsonData->ts3_username;
		$ts3_password = $jsonData->ts3_password;
		$ts3_host = $jsonData->ts3_host;
		$ts3_port = $jsonData->ts3_port;
		$ts3_port_virtual = $jsonData->ts3_port_virtual;

		$ts = getTSHandle($ts3_login,$ts3_password,$ts3_host,$ts3_port,$ts3_port_virtual);
		$count = $ts->clientCountDb();

		$return = array();
		$return["players"] = getClients($ts,$count);
		$return["count"] = $count;
		$return["timestamp"] = time();
		echoAsJson($return);

	} catch (TeamSpeak3_Adapter_ServerQuery_Exception $e) {
		echoExeptionAsJson($e);
	} catch (TeamSpeak3_Transport_Exception $e) {
		echoExeptionAsJson($e);
	}


?>
