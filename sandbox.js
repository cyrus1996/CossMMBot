const $tls = require("tls");
const $url = require("url");
const $https = require("https");
const $util = require("util");
const $crypto = require("crypto");
const $fs = require("fs");
const $events = require("events"); 
const $assert = require("assert").strict;


class MMBot {

	/**
	 * The main and unique class for market making on 
	 * the COSS plateform for a complete documentation
	 * see : https://github.com/cyrus1996/CossMMBot
	 */


	constructor($spec,wallet){

		/**
		 * @var _spec <Object>
		 *
		 * 
		 * an Object that contains
		 * every specification for every 
		 * pair that we want to trade on 
		 */

		this._spec = {}

		/**
		 * @var _ob_list <Object>
		 *
		 * created in => this.createOrderbook()
		 *
		 * an Object that stores all the 
		 * order books of the pairs we are 
		 * trading on
		 */

		this._ob_list = {}

		/**
		 * @var _amount_min <Map>
		 *
		 * The map pair => min_amount that represents
		 * the minimum amount to trade on the base pairs
		 * (eg ETH: 0.02, COSS: 25)
		 */

		this._amount_min = new Map();

		/**
		 * @var _decimal <Map>
		 * 
		 * the specification given by 
		 * the exchange for every pair
		 * formed like this : 
		 * Pair => {price_decimal,amount_decimal}
		 */

		this._decimal = new Map()

		/**
		 * @var _wallet <Object>
		 *
		 * created in => this.getWallet
		 * 
		 * Stores your wallet specifications and amount
		 */

		this._wallet = {}

		/**
		 * @var _start <Bool>, used to determine wheather
		 * we have created all the stripes on each pair
		 * before reaching the maximum api calls within
		 * one minute
		 */

		this._start = false;

		/**
		 * @var _callcounter <Int>
		 *
		 * the number of call done during the 
		 * intialization phasis 
		 */

		this._cookie = false;

		this._callcounter = 15;

		this._kill = false;

		this._spec = $spec;

		for (var air in this._spec){

			console.log("open->" + '{"' + air + '":' + JSON.stringify(this._spec[air]) + "}");

		}

		process.on("uncaughtException", (err) => {

			console.log("ERROR: " + err.message);
			console.log(err);
			process.exit();

		})

		process.on("unhandledRejection", (err) => {

			console.log("ERROR: " + err.message);
			console.log(err);
			process.exit();

		})

		process.stdin.resume();

		process.stdin.on("data", async (data) => {
			
			data = data.toString().replace("\n","");
			data = data.split(",");
			var poll = [];

			var pair = data[3];

			if (data[0] == "a") {

				data = {"a":[data[1],data[2]]}

			} else {

				data = {"b":[data[1],data[2]]}

			}

			if (this._spec[pair]["created"]) {

				await this.updateStripes([data],pair);

			} else {

				for(var x of [data]){

					poll.push(x);

				}

				this._spec[pair]["events"].once("finish", async() => {

					await this.updateStripes(poll,pair);

				})

			}

		})

		/**
		 * Populates our wallet 
		 * and make the rest of the 
		 * function asychronously 
		 */

		this.getWallet(wallet).then(async(value) => {

			await this.getExchangeInfo();

			for(var pair in this._spec){

				if(await this.createSocket(pair)){

					console.log("stripes created on " + pair);

				} else {

					console.log("a problem while creating stripes on " + pair);

				}

			}

			this._start = true;

		})

	}

	async cancelOnce(ref = 0){

		if (!this._cookie) {

			return false;

		} else {

			return new Promise((resolve,reject)=>{

				var $response = "";

				var $date =  new Date().getTime() - 3000;

				var $data = '{"order_symbol": '+ pair +',"timestamp": '+ $date +',"recvWindow": 5000,"order_id": ' + id + '}';


				var hmac = $crypto.createHmac("sha256",$private);
				hmac.update($data);

				var options = {

					"protocol": "https:",
					"hostname": "trade.coss.io",
					"method": "DELETE",
					"port": 443,
					"path": "/c/api/v1/order/cancel",
					"headers": {

						"Content-Type": "application/json",
						"Content-Length": $data.length,
						"Authorization": $public,
						"Signature": hmac.digest("hex")
					}
				}

				req = $https.request(options,async(res) => {

					res.on("data", (chunk) => {$response += chunk.toString()});

					res.on("end", async() => {

						if ($response.indexOf("<html>") != -1 && $ref < 3) {
							
							Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
							this.cancelOnce(ref++).then(async (value) => {

								resolve(value);

							})

						} else {
							
							resolve(true);

						} 

					})

				});

				req.end($data);

				req.on("error", async(e) => {

					if (ref < 3) {

						this.cancelOnce(ref++).then(async (value) => {

							Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
							resolve(value);

						})

					} else {

						resolve(true);

					}

				})

			})

		}

	}

	async getOpenOrders(pair,ref = 0){

		return new Promise((resolve,reject) => {

			var $response = "";

			var $date =  new Date().getTime() - 3000;

			var $data = '{"order_symbol": '+ pair +'"timestamp": '+ $date +',"recvWindow": 5000}';


			var hmac = $crypto.createHmac("sha256",$private);
			hmac.update($data);

			var options = {

				"protocol": "https:",
				"hostname": "trade.coss.io",
				"method": "POST",
				"port": 443,
				"path": "/c/api/v1/order/list/open",
				"headers": {

					"Content-Type": "application/json",
					"Content-Length": $data.length,
					"Authorization": $public,
					"Signature": hmac.digest("hex")
				}
			}

			req = $https.request(options,async(res) => {

				res.on("data", (chunk) => {$response += chunk.toString()});

				res.on("end", async() => {

					try{

						var json = JSON.parse($response);
						resolve(json);

					} catch(e){

						this.getOpenOrders(pair,ref++).then(async (value) => {

							resolve(value);

						})

					}

				})

			});

			req.end($data);

			req.on("error", async(e) => {

				if (ref < 3) {

					this.getOpenOrders(pair,ref++).then(async (value) => {

						resolve(value);

					})

				} else {

					resolve(false);

				}
				
			})

		})

	}

	/**
	 *
	 *
	 */

	async cancelAllOrders(pair){

		return new Promise(async (resolve,reject) =>{

			var liste = await this.getOpenOrders(pair);

			if (!liste) { resolve(false)}

			if (this._callcounter + liste["list"].length < 700) {

				for(var x of liste["list"]){

					await this.cancelOne(x["order_id"],pair);
					resolve(true);

				}

			} else {

				resolve(false);

			}

		})


	}

	async timerCancelAll(pair){

		return new Promise((resolve,reject) => {

			setTimeout(async() => {

				await this.cancelAllOrders(pair);
				resolve(true);

			},65000)

		})

	}

	async cancelOne(id,pair,ref = 0){

		return new Promise((resolve,reject) => {

			var $response = "";

			var $date =  new Date().getTime() - 3000;

			var $data = '{"order_symbol": '+ pair +',"timestamp": '+ $date +',"recvWindow": 5000,"order_id": ' + id + '}';


			var hmac = $crypto.createHmac("sha256",$private);
			hmac.update($data);

			var options = {

				"protocol": "https:",
				"hostname": "trade.coss.io",
				"method": "DELETE",
				"port": 443,
				"path": "/c/api/v1/order/cancel",
				"headers": {

					"Content-Type": "application/json",
					"Content-Length": $data.length,
					"Authorization": $public,
					"Signature": hmac.digest("hex")
				}
			}

			req = $https.request(options,async(res) => {

				res.on("data", (chunk) => {$response += chunk.toString()});

				res.on("end", async() => {

					if ($response.indexOf("<html>") != -1 && $ref < 3) {
						
						Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
						this.cancelOne(id,pair,ref++).then(async (value) => {

							resolve(value);

						})

					} else {
						
						resolve(true);

					} 

				})

			});

			req.end($data);

			req.on("error", async(e) => {

				if (ref < 3) {

					this.cancelOne(id,pair,ref++).then(async (value) => {

						Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
						resolve(value);

					})

				} else {

					resolve(true);

				}

			})

		})

	}

	/**
	 * @param pair <String>
	 *
	 * Controls the opening of new
	 * sockets, by returning promises
	 */

	async openSocket(pair){

		return new Promise(async (resolve,reject) => {

			setTimeout(async () => {

				if(!await this.createSocket(pair)){
					await this.openSocket(pair)
				} else {
					resolve(true);
				}

			},70000)

		})

	}

	/**
	 * @params Ø
	 * 
	 * @return Promise
	 *
	 * This function returns our wallet
	 * and stores the results in the _wallet variable
	 */

	async getWallet(wallet){

		return new Promise((resolve,reject) => {

			this._wallet = wallet;
			resolve(true);

		})

	}

	/**
	 * @params none
	 *
	 * This function is used to retrieve
	 * infomations about the pairs on the 
	 * exchange
	 *
	 * @return Promise
	 */

	async getExchangeInfo(){
	 	
		return new Promise((resolve,rej) => {
			$https.get("https://trade.coss.io/c/api/v1/exchange-info", (res) => {
				let data = "";

				res.on("data", (chunk) => {
					data += chunk;
				});

				res.on("end", () => {
					data = JSON.parse(data);

					data['base_currencies'].forEach((value) => {
						this._amount_min.set(value['currency_code'],value['minimum_total_order']);
					});

					data['symbols'].forEach((value) => {
						this._decimal.set(value['symbol'],{amount_decimal: value['amount_limit_decimal'],price_decimal: value['price_limit_decimal']});
					});

					resolve(true);

				});

			});
		}); 	

	}

	/**
	 * @param $pair <string> 
	 *
	 * Creates a new connection on a specified
	 * websocket on the exchange
	 * in order to listen for data and update our 
	 * internal orderbook
	 */

	async createSocket($pair){

		this._spec[$pair]["pong"] = 0;

		this._spec[$pair]["events"] = new $events;

		this._spec[$pair]["reminder_asks"] = false;
		this._spec[$pair]["reminder_bids"] = false;

		$assert.ok(this._decimal.has($pair),"The pair you gave is not listed");

		console.log("opening socket on " + $pair);

		return new Promise((resolve,reject) => {

			this._spec[$pair]["socket"] = $tls.connect(443,"engine.coss.io", async ()=>{

				this._spec[$pair]["socket"].write("GET /ws/v1/dp/" + $pair +" HTTP/1.1\r\n" +
				"Host: engine.coss.io\r\n" +
				"Accept: */*\r\nConnection: Upgrade\r\n" +
				"Upgrade: websocket\r\nSec-WebSocket-Version: 13\r\n" +
				"Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n\r\n");

				/**
				 * If we receive a wrong response we reopen 
				 * a new socket on this pair until the connection 
				 * is ready.
				 */

				this._spec[$pair]["socket"].once("data",async (data) => {

					if (data.toString().indexOf("101") != -1) {

						console.log("---Ok on " + $pair);

						/** 
						 * Pong frames according to RFC 6455
						 */

						this._spec[$pair]["pong"] = setInterval(() => {
							this._spec[$pair]["socket"].write(Buffer.from([0x8A,0x80,0x77,0x77,0x77,0x77]));
						},20000);

						/**
						 * Once We've created our order book and our socket is 
						 * connected we add our 
						 * orders for the market making. If the orders have already been
						 * created created would be set to true so it would be useless to create stripes
						 * once again.
						 */

						/**
						 * Before listening to the data
						 * we have to create the order book in 
						 * order to prevent missing any data frame 
						 * from the websocket.
						 */
						var $ob = await this.createOrderbook($pair);

						/**
						 * If we failed to open the order book 
						 * we do not do any further actions
						 * because this would result in errors
						 */

						if (!$ob) {

							console.log("error on : " + $pair + " err message : ", err);
							clearInterval(this._spec[$pair]["pong"]);
							this._spec[$pair]["socket"].removeAllListeners("data").removeAllListeners("error");
							resolve(false);

						}

						var response = this._spec[$pair]["created"] ? false : await this.createStripes($pair);
						this._spec[$pair]["created"] = true;
						this._spec[$pair]["events"].emit("finish");

						resolve(response);

					} else {
						console.log("---new try on " + $pair);
						this.createSocket($pair).then((value) => {
							resolve(value);
						});
					}
					
				})

				/**
				 * If an error occurs on our websocket
				 * we just reopen it. But we need to clear 
				 * every thing before.
				 */

				this._spec[$pair]["socket"].on("error", async (err) => {
					console.log("error on : " + $pair + " err message : ", err);
					clearInterval(this._spec[$pair]["pong"]);
					this._spec[$pair]["socket"].removeAllListeners("data").removeAllListeners("error");
					await this.createSocket($pair);

				})

				this._spec[$pair]["socket"].on("data",async (data) => {

					return true;

					if (this._kill || !this._spec[$pair]["created"]) { return false}

					/**
					 * We parse our data and update our orderbooks
					 */

					var $data = await this.parseData(data);

					$data ? console.log($data) : false;

					return true;
					
					$data ? await this.updateStripes($data,$pair):false;

				});

			});
		});

	}

	/**
	 * @param pair <String>
	 * @param ref <Int>
	 * @return Promise
	 * 
	 * this function creates and store the order book for the 
	 * specified pair, the ref variable is used to count if 
	 * too much calls fail the opening on the pair is aborted
	 */

	async createOrderbook(pair,ref = 0){

		this._start == false ? this._callcounter++ : false;

		if (this._kill) { return false}

		return new Promise((resolve,rej) => {
			$https.get("https://engine.coss.io/api/v1/dp?symbol="+pair, (res) => {
				var donnes = "";

				res.on("data",async (chunk) => {
					donnes += chunk;
				});

				res.on("end",async () => {

					try {

						donnes = JSON.parse(donnes);
						this._ob_list[pair] = donnes;
						resolve(donnes);

					} catch(e){

						ref > 3 ? resolve(false): false;
						setTimeout(async() => {

							await this.createOrderbook(pair,ref++);
							resolve(true);

						},750);

					}
					
				});
			});
		});

	}

	/**
	 * @param data <String>
	 *
	 * Get the raw data as input and returns 
	 * a Promise containing the data in JSON
	 */

	async parseData(data){
		if (data.length > 50 && data.indexOf("Server") == -1) {
			data = data.toString("ascii").match(/\{.+?\}/g);

			var $data = data.map(async (value) => {
				return JSON.parse(value.replace("[[","[").replace("]]","]"));
			});
			return Promise.all($data);
		} else {
			return false;
		}
	}

	/**
	 * @params data <array> A Json array containing the formatted 
	 * data to analyse
	 *
	 * @params pair <string> The pair corresponding to those data
	 *
	 * Check the data that are received if a quantity is set to 0 
	 * we check if this quantity were part of our stripes
	 * if it is the case we have to update our stripes
	 */	

	async updateStripes(valuee,pair){

		var $pairs = pair.split("_");
		var final = [];
		var changes = false;

		/**
		 * Once we receive data, we check 
		 * every frame from the websocket 
		 * to check if we received data 
		 * that includes orders that we have 
		 * opened.
		 */

		for(var data of valuee){
			if (data['a']) {

				/**
				 * if the data is about an ask order 
				 * that we receive, we check if this a 0 quantity
				 * update which could mean some orders have been bought.
				 */

				if (data['a'][1] == 0 && this._spec[pair]["orderbook"]["asks"].includes(parseFloat(data['a'][0]))) {

					for (var val of this._spec[pair]["orderbook"]["asks"]){

						/**
						 * if we receive a 0 quantity data update, we have to check 
						 * weather we have an order at such price, if this is the case,
						 * this means an order have been excecuted.
						 */

						if (data['a'][0] == val) {

							/**
							 * if one of our asks order has been excuted we have
							 * to rise our best bid order in order to still cover the
							 * order book. so we calculate our new bid by multiply our highest
							 * bid by the profit we want to take.
							 */

							changes = true;

							console.log("profit: ",this._spec[pair]["profit"])

							var price = this._spec[pair]["orderbook"]["bids"][0] *
							(this._spec[pair]["profit"] / 100 + 1);


							var price_ceil = await this._ceil(price,this._decimal.get(pair)["price_decimal"]);

							price = val / price_ceil >= (this._spec[pair]["profit"] / 100 + 1) ? price_ceil : await this._floor(price,this._decimal.get(pair)["price_decimal"]);

							while (val / price < (this._spec[pair]["profit"] / 100 + 1)) {

								price = (price * 10 ** this._decimal.get(pair)["price_decimal"] - 1) / 10 ** this._decimal.get(pair)["price_decimal"];

							}

							/**
							 * we get the quantity that we should put for this new order.
							 */

							var amount = await this.quantity(this._spec[pair]["amount"],this._spec[pair]["ref"],price,pair);

							if (this._spec[pair]["allow_overflow"]) {

								/**
								 * In the case we allowed overflowding, we keep 
								 * the same number of order opened at each time,
								 * so if one order got excecuted we have to add one 
								 * above our highest ask in this case, see docs for more details.
								 * spec [];
								 */

								/**
								 * what ever happens if we have one order exceuted 
								 * we have to update our wallet.
								 */

								if (this._spec[pair]["orderbook"]["asks"].length <= 1) {

									/** 
									 * if we are over our range limit we just update our wallet
									 * but nothing else.
									 */

									if (!this._spec[pair]["reminder_asks"]) {

										this._wallet[$pairs[1]] += await this.quantity(this._spec[pair]["amount"],this._spec[pair]["ref"],val,pair) * val;

									}

										this._spec[pair]["reminder_asks"] = val

								} else {

									/**
									 * if we are in the range we specified, we get the quantity and 
									 * the price of the order we want to open and we open it.
									 */

									this._wallet[$pairs[1]] += await this.quantity(this._spec[pair]["amount"],this._spec[pair]["ref"],val,pair) * val;

									this._spec[pair]["orderbook"]["asks"].splice(this._spec[pair]["orderbook"]["asks"].indexOf(val),1);

									if(!this._spec[pair]["orderbook"]["bids"].includes(price) && this._spec[pair]["orderbook"]["asks"][0] / price >= (this._spec[pair]["profit"] / 100 * 2 + 1) && await this.openOrder(price,amount,"BUY",pair)) this._spec[pair]["orderbook"]["bids"].unshift(price);


								}

								/**
								 * price_new, give us our new highest ask in order to still cover all the order book.
								 */

								var price_new = await this._ceil(this._spec[pair]["orderbook"]["asks"][this._spec[pair]["orderbook"]["asks"].length - 1] *
									(this._spec[pair]["profit"] / 100 + 1),this._decimal.get(pair)["price_decimal"]); // ceil


								if (this._spec[pair]["orderbook"]["asks"].length <= this._spec[pair]["orderbook"]["asks_length"]) {

									/**
									 * we only want to have the same number of order as the moment
									 * we set up our stripes, so if we have enough opened orders
									 * it is not necessary to open more orders.
									 */

									var amount_new = await this.quantity(this._spec[pair]["amount"],this._spec[pair]["ref"],price_new,pair);

									if(await this.openOrder(price_new,amount_new,"SELL",pair)) this._spec[pair]["orderbook"]["asks"].push(price_new);

								}

								break;

							} else {

								/**
								 * in the case we don't allow overfloating, we dont want to open
								 * more orders, we just want to cover the range we gave to the 
								 * algorythm.
								 */

								if (this._spec[pair]["orderbook"]["asks"].length <= 1) {

									/** 
									 * if we are over our range limit we just update our wallet
									 * but nothing else.
									 */

									if (!this._spec[pair]["reminder_asks"]) {

										this._wallet[$pairs[1]] += await this.quantity(this._spec[pair]["amount"],this._spec[pair]["ref"],val,pair) * val;

									}

									this._spec[pair]["reminder_asks"] = val;
									break;

								} else {

									/**
									 * if we are in the range we specified, we get the quantity and 
									 * the price of the order we want to open and we open it.
									 */

									this._wallet[$pairs[1]] += await this.quantity(this._spec[pair]["amount"],this._spec[pair]["ref"],val,pair) * val;

									this._spec[pair]["orderbook"]["asks"].splice(this._spec[pair]["orderbook"]["asks"].indexOf(val),1);

									if(!this._spec[pair]["orderbook"]["bids"].includes(price) && this._spec[pair]["orderbook"]["asks"][0] / price >= (this._spec[pair]["profit"] / 100 * 2 + 1) && await this.openOrder(price,amount,"BUY",pair)) this._spec[pair]["orderbook"]["bids"].unshift(price);

									break;
								}

							}							

						}

					}

				}

				/**
				 * the below for loop, will most of the time,
				 * remain usefull, however, in really rare occasion,
				 * it will keep your orders on track, especially 
				 * when we receive multiples frames in a really short 
				 * period of time, or if we get the frames in the wrong order
				 * but this should not happen, according to the TCP
				 * protocol.
				 */

				for(var value of this._spec[pair]["orderbook"]["bids"]){

					/**
					 * if the frames specifies an ask that is 
					 * below our highest bid this mean we had 
					 * orders excecuted but we didn't got those frames.
					 * so we have to do a similar work as above.
					 */

					if (data['a'][0] <= value) {

						/** 
						 * if the ask is below one of our 
						 * bids we have to open a new ask order.
						 * so we get the quantity and the price.
						 */


						changes = true;

						var price = await this._floor(this._spec[pair]["orderbook"]["asks"][0] /
							(this._spec[pair]["profit"] / 100 + 1),this._decimal.get(pair)["price_decimal"]); // ceil

						var amount = await this.quantity(this._spec[pair]["amount"],this._spec[pair]["ref"],price,pair);

						if (this._spec[pair]["allow_overflow"]) {

							if (this._spec[pair]["orderbook"]["bids"].length <= 1) {

									if (!this._spec[pair]["reminder_bids"]) {

										this._wallet[$pairs[0]] += await this.quantity(this._spec[pair]["amount"],this._spec[pair]["ref"],value,pair);

									}
								
									this._spec[pair]["reminder_bids"] = value;
									final.push(value);

							} else {

									this._wallet[$pairs[0]] += await this.quantity(this._spec[pair]["amount"],this._spec[pair]["ref"],value,pair);

									if(await this.openOrder(price,amount,"SELL",pair))this._spec[pair]["orderbook"]["asks"].unshift(price);

							}

							var price_new = await this._floor(this._spec[pair]["orderbook"]["bids"][this._spec[pair]["orderbook"]["bids"].length - 1] /
							(this._spec[pair]["profit"] / 100 + 1),this._decimal.get(pair)["price_decimal"]); // floor


							if (this._spec[pair]["orderbook"]["bids"].length <= this._spec[pair]["orderbook"]["bids_length"]) {


								var amount_new = await this.quantity(this._spec[pair]["amount"],this._spec[pair]["ref"],price_new,pair);

								if(await this.openOrder(price_new,amount_new,"BUY",pair))this._spec[pair]["orderbook"]["bids"].push(price_new);

							}


						} else {

							if (this._spec[pair]["orderbook"]["bids"].length <= 1) {

									if (!this._spec[pair]["reminder_bids"]) {

										this._wallet[$pairs[0]] += await this.quantity(this._spec[pair]["amount"],this._spec[pair]["ref"],value,pair);

									}
								
									this._spec[pair]["reminder_bids"] = value;
									final.push(value);

							} else {

									this._wallet[$pairs[0]] += await this.quantity(this._spec[pair]["amount"],this._spec[pair]["ref"],value,pair);

									if(await this.openOrder(price,amount,"SELL",pair))this._spec[pair]["orderbook"]["asks"].unshift(price);

							}

						}

					} else {

						final.push(value);

					}

				}

				this._spec[pair]["orderbook"]["bids"] = final;

				if (changes && this._spec[pair]["force_liquidity"]) {

					while(this._spec[pair]["orderbook"]["asks"][0] / this._spec[pair]["orderbook"]["bids"][0] > (this._spec[pair]["profit"]*2/100 + 1)){

						price = this._spec[pair]["orderbook"]["bids"][0] *
								(this._spec[pair]["profit"] / 100 + 1);


						price_ceil = await this._ceil(price,this._decimal.get(pair)["price_decimal"]);

						var bask = await this._floor(this._spec[pair]["orderbook"]["asks"][0] / (this._spec[pair]["profit"]/100 + 1),this._decimal.get(pair)["price_decimal"]);

						price = this._spec[pair]["orderbook"]["asks"][0] / price_ceil < (this._spec[pair]["profit"]*2/100 + 1) || bask / price_ceil < (this._spec[pair]["profit"]/100 + 1) ? await this._floor(price,this._decimal.get(pair)["price_decimal"]) : price_ceil;

						if (this._spec[pair]["orderbook"]["asks"][0] / price <= (this._spec[pair]["profit"]*2/100 + 1)|| this._spec[pair]["orderbook"]["bids"].includes(price) || bask / price < (this._spec[pair]["profit"]/100 + 1)) {

							break;

						}

						amount = await this.quantity(this._spec[pair]["amount"],this._spec[pair]["ref"],price,pair);

						if(await this.openOrder(price,amount,"BUY",pair)){
							this._spec[pair]["orderbook"]["bids"].unshift(price);

						} else {

							break;

						}

					}

				}

				console.log("pair: ",pair," asks: ",this._spec[pair]["orderbook"]["asks"])
				console.log("pair: ",pair," bids: ",this._spec[pair]["orderbook"]["bids"])
				console.log('wallet :', this._wallet);

				final = [];

			} else if (data['b']) {

				if (data['b'][1] == 0 ) {

					for(var valeur of this._spec[pair]["orderbook"]["bids"]){

						if (data['b'][0] == valeur) {
							changes = true;

							var price = this._spec[pair]["orderbook"]["asks"][0] /
							   (this._spec[pair]["profit"] / 100 + 1);

							var price_floor = await this._floor(price,this._decimal.get(pair)["price_decimal"]);

							price = price_floor / valeur >= (this._spec[pair]["profit"] / 100 + 1) ? price_floor : await this._ceil(price,this._decimal.get(pair)["price_decimal"]);

							while (price / valeur < (this._spec[pair]["profit"] / 100 + 1)) {

								price = (price * 10 ** this._decimal.get(pair)["price_decimal"] + 1) / 10 ** this._decimal.get(pair)["price_decimal"];

							}

							var amount = await this.quantity(this._spec[pair]["amount"],this._spec[pair]["ref"],price,pair);

							if (this._spec[pair]["allow_overflow"]) {

								if (this._spec[pair]["orderbook"]["bids"].length <= 1) {

									if (!this._spec[pair]["reminder_bids"]) {

										this._wallet[$pairs[0]] += await this.quantity(this._spec[pair]["amount"],this._spec[pair]["ref"],valeur,pair);

									}
								
									this._spec[pair]["reminder_bids"] = valeur

								} else {

									this._wallet[$pairs[0]] += await this.quantity(this._spec[pair]["amount"],this._spec[pair]["ref"],valeur,pair);

									this._spec[pair]["orderbook"]["bids"].splice(this._spec[pair]["orderbook"]["bids"].indexOf(valeur),1);

									if(!this._spec[pair]["orderbook"]["asks"].includes(price) && price / this._spec[pair]["orderbook"]["bids"][0] >= (this._spec[pair]["profit"] / 100 * 2 + 1) && await this.openOrder(price,amount,"SELL",pair))this._spec[pair]["orderbook"]["asks"].unshift(price);

								}

								var price_new = await this._round(this._spec[pair]["orderbook"]["bids"][this._spec[pair]["orderbook"]["bids"].length - 1] /
									(this._spec[pair]["profit"] / 100 + 1),this._decimal.get(pair)["price_decimal"]); // floor


								if (this._spec[pair]["orderbook"]["bids"].length <= this._spec[pair]["orderbook"]["bids_length"]) {

									var amount_new = await this.quantity(this._spec[pair]["amount"],this._spec[pair]["ref"],price_new,pair);

									if(await this.openOrder(price_new,amount_new,"BUY",pair))this._spec[pair]["orderbook"]["bids"].push(price_new);

								}

								break;

							} else {

								if (this._spec[pair]["orderbook"]["bids"].length <= 1) {

									if (!this._spec[pair]["reminder_bids"]) {

										this._wallet[$pairs[0]] += await this.quantity(this._spec[pair]["amount"],this._spec[pair]["ref"],valeur,pair);

									}
								
									this._spec[pair]["reminder_bids"] = valeur
									break;

								} else {

									this._wallet[$pairs[0]] += await this.quantity(this._spec[pair]["amount"],this._spec[pair]["ref"],valeur,pair);

									this._spec[pair]["orderbook"]["bids"].splice(this._spec[pair]["orderbook"]["bids"].indexOf(valeur),1);

									if(!this._spec[pair]["orderbook"]["asks"].includes(price) && price / this._spec[pair]["orderbook"]["bids"][0] >= (this._spec[pair]["profit"] / 100 * 2 + 1) && await this.openOrder(price,amount,"SELL",pair))this._spec[pair]["orderbook"]["asks"].unshift(price);

									break;

								}

							}
							
						}

					}

				}

				for(var value of this._spec[pair]["orderbook"]["asks"]){


					if (data['b'][0] >= value) {

						changes = true;

						var price = await this._ceil(this._spec[pair]["orderbook"]["bids"][0] *
							(this._spec[pair]["profit"] / 100 + 1),this._decimal.get(pair)["price_decimal"]);

						var amount = await this.quantity(this._spec[pair]["amount"],this._spec[pair]["ref"],price,pair);

						if (this._spec[pair]["allow_overflow"]) {

							if (this._spec[pair]["orderbook"]["asks"].length <= 1) {

									if (!this._spec[pair]["reminder_asks"]) {

										this._wallet[$pairs[1]] += await this.quantity(this._spec[pair]["amount"],this._spec[pair]["ref"],value,pair) * value;

									}
									final.push(value);
									this._spec[pair]["reminder_asks"] = value

							} else {

									this._wallet[$pairs[1]] += await this.quantity(this._spec[pair]["amount"],this._spec[pair]["ref"],value,pair) * value;

									if(await this.openOrder(price,amount,"BUY",pair))this._spec[pair]["orderbook"]["bids"].unshift(price);

							}

							var price_new = await this._ceil(this._spec[pair]["orderbook"]["asks"][this._spec[pair]["orderbook"]["asks"].length - 1] *
							(this._spec[pair]["profit"] / 100 + 1),this._decimal.get(pair)["price_decimal"]); 

							if (this._spec[pair]["orderbook"]["asks"].length <= this._spec[pair]["orderbook"]["asks_length"]) {

								var amount_new = await this.quantity(this._spec[pair]["amount"],this._spec[pair]["ref"],price_new,pair);

								if(await this.openOrder(price_new,amount_new,"SELL",pair))this._spec[pair]["orderbook"]["asks"].push(price_new);

							}


						} else {

							if (this._spec[pair]["orderbook"]["asks"].length <= 1) {

									if (!this._spec[pair]["reminder_asks"]) {

										this._wallet[$pairs[1]] += await this.quantity(this._spec[pair]["amount"],this._spec[pair]["ref"],value,pair) * value;

									}
									final.push(value);
									this._spec[pair]["reminder_asks"] = value

							} else {

									this._wallet[$pairs[1]] += await this.quantity(this._spec[pair]["amount"],this._spec[pair]["ref"],value,pair) * value;

									if(await this.openOrder(price,amount,"BUY",pair))this._spec[pair]["orderbook"]["bids"].unshift(price);

							}

						}

					} else {

						final.push(value);

					}

				}

				this._spec[pair]["orderbook"]["asks"] = final;

				if (changes && this._spec[pair]["force_liquidity"]) {

					while(this._spec[pair]["orderbook"]["asks"][0] / this._spec[pair]["orderbook"]["bids"][0] > (this._spec[pair]["profit"]*2/100 + 1)){

						price = this._spec[pair]["orderbook"]["asks"][0] /
								(this._spec[pair]["profit"] / 100 + 1);

						price_floor = await this._floor(price,this._decimal.get(pair)["price_decimal"]);

						var bbid = await this._ceil(this._spec[pair]["orderbook"]["bids"][0] * (this._spec[pair]["profit"]/100 + 1),this._decimal.get(pair)["price_decimal"]);

						price = price_floor / this._spec[pair]["orderbook"]["bids"][0] < (this._spec[pair]["profit"]*2/100 + 1) || price_floor / bbid < (this._spec[pair]["profit"]/100 + 1)? await this._ceil(price,this._decimal.get(pair)["price_decimal"]) : price_floor;

						amount = await this.quantity(this._spec[pair]["amount"],this._spec[pair]["ref"],price,pair);

						if (price / this._spec[pair]["orderbook"]["bids"][0] <= (this._spec[pair]["profit"]*2/100 + 1) || this._spec[pair]["orderbook"]["asks"].includes(price) || price / bbid < (this._spec[pair]["profit"]/100 + 1)) {

							break;

						}

						if(await this.openOrder(price,amount,"SELL",pair)){
							this._spec[pair]["orderbook"]["asks"].unshift(price);

						} else {

							break;

						}

					}
				}

				console.log("pair: ",pair," asks: ",this._spec[pair]["orderbook"]["asks"])
				console.log("pair: ",pair," bids: ",this._spec[pair]["orderbook"]["bids"])
				console.log('wallet :', this._wallet);
				

			}
		}
		
		return true;

	}

	/**
	 * @param <pair> the pair on which 
	 * we want to make market making
	 *
	 * this function determines through several
	 * ways the best on to create our lower ask 
	 * and our lowest bid
	 */

	async createStripes($pair){

		var binance = {};

		var now = {"asks": parseFloat(this._ob_list[$pair]['asks'][0][0]), "bids": parseFloat(this._ob_list[$pair]["bids"][0][0])};

		var arb = {};


		return new Promise((resolve,reject) => {

			var twice = $pair.split("_");

			/**
			 * this tries to get the best bid 
			 * and the best ask from binance to compare to 
			 * coss in the case the spread is too wide
			 */

			$https.get("https://www.binance.com/api/v1/depth?limit=5&symbol=" + twice.join(""), async res => {

				let data = "";

				res.on("data", chunk => {data += chunk});

				res.on("end", async () => {

					try{

						data = JSON.parse(data);

					} catch(e){

						binance = false;

					}

					if (data["code"]) {
						console.log("we don't have " + $pair + " on binance")
						binance = false;

					} else {

						/**
						 * Like binance and coss price precision are not the
						 * same we have to ajust to coss precision before doing 
						 * any work, not doing so would make us unable to open
						 * any order due to wrong price precision.
						 */

						binance["asks"] = await this._ceil(data["asks"][0][0],this._decimal.get($pair)["price_decimal"]);
						binance["bids"] = await this._floor(data["bids"][0][0],this._decimal.get($pair)["price_decimal"]);

					}

					/**
					 * Here we try to get some comparison point using 
					 * pseudo arbitrage. We compare to actual order book 
					 * prices.
					 */

					if (!(twice.includes("ETH") && twice.includes("BTC"))) {

						if (twice.includes("ETH")) {

							/**
							 * We use the ordenate function because 
							 * spliting pair to get arbitrage prices 
							 * can lead to differents situations 
							 * (eg: COSS_ETH => COSS_BTC and ETH_BTC
							 * COSS_BTC => COSS_ETH and ETH_BTC)
							 */

							arb = await this.ordenate("BTC",twice)

						} else {

							arb = await this.ordenate("ETH",twice);

						}

					} else {

						arb = false;

					}


					/**
					 * We can now set up our price for stripes.
					 */

					console.log("now : ", now);
					console.log("arb : ", arb);
					console.log("binance : ", binance);

					var response = await this.setStripes(now,arb,binance,$pair)

					resolve(response);

				});

			})

		})

	}

	async _floor($value,$decimals){

		return Math.floor($value * 10 ** $decimals) / 10 ** $decimals;

	}

	async _ceil($value,$decimals){

		return Math.ceil($value * 10 ** $decimals) / 10 ** $decimals;

	}

	async _round($value,$decimals){

		return Math.round($value * 10 ** $decimals) / 10 ** $decimals;

	}

	/**
	 * @params $pair1 <String>
	 *
	 * @params $pair1 <String>
	 *
	 * This function returns one pair 
	 * in the right order 
	 */

	async ordenatePair($pair1,$pair2){

		var order = [

			"USD",
			"EUR",
			"GBP",
			"TUSD",
			"GUSD",
			"USDC",
			"USDT",
			"DAI",
			"BTC",
			"ETH",
			"COSS"

		];

		var one = order.indexOf($pair1);
		var two = order.indexOf($pair2);

		if (one == -1) return [$pair1,order[two]].join("_");
		if (two == -1) return [$pair2,order[one]].join("_");
		if (two < one) return [order[one],order[two]].join("_");
		if (two > one) return [order[two],order[one]].join("_");

	}

	/**
	 * @params $name <String>
	 *
	 * @params $tab <Array>
	 *
	 * This function the price using the 
	 * $tab variable to calculate arbitrages
	 */

	async ordenate($name,$tab){

		var $pair = $tab.join("_");

		var $pair1 = await this.ordenatePair($tab[0],$name);
		var $pair2 = await this.ordenatePair($tab[1],$name);

		if(!await this.createOrderbook($pair1)) return false;
		if(!await this.createOrderbook($pair2)) return false;

		if ($pair2.split("_")[1] == $name) {

			var price_bids = await this._ceil(this._ob_list[$pair1]["bids"][0][0] /
			 this._ob_list[$pair2]["asks"][0][0],this._decimal.get($pair)["price_decimal"]);

			var price_asks = await this._floor(this._ob_list[$pair1]["asks"][0][0] /
			 this._ob_list[$pair2]["bids"][0][0],this._decimal.get($pair)["price_decimal"]);

			return {"asks": price_asks,"bids": price_bids}

		}

		if ($pair2.split("_")[0] == $name) {

			var price_bids = await this._ceil(this._ob_list[$pair1]["bids"][0][0] /
			 this._ob_list[$pair2]["bids"][0][0],this._decimal.get($pair)["price_decimal"]);

			var price_asks = await this._floor(this._ob_list[$pair1]["asks"][0][0] *
			 this._ob_list[$pair2]["asks"][0][0],this._decimal.get($pair)["price_decimal"]);

			return {"asks": price_asks,"bids": price_bids}

		}

	}

	/**
	 * This function is usefull in order to
	 * split a bit our create stripe function
	 * if not the create stripe function be to
	 * big and not understandable.
	 */

	async setStripes(now,arb,binance,$pair){

		/**
		 * the dec variable is the price precision
		 */

		var dec = this._decimal.get($pair)["price_decimal"];

		var spread_int = now["asks"] * 10 ** dec - now["bids"] * 10 ** dec;

		/**
		 * There is a specific treatment if 
		 * the spread is below two price precision units
		 * eg price precision 0.001 price_asks => 10.002 price_bids => 10.000 : spread in units = 2 
		 */

		if (spread_int <= 2) {

			/**
			 * In the case the spread is exactly 
			 * one unit different between best bid and best ask
			 */

			if (spread_int == 1) {

				/**
				 * Now we check if the spread is wide enough
				 * to meet our profit criteria
				 */

				if (now["asks"]/now["bids"] >= this._spec[$pair]["profit"]*2/100 + 1) {

					/**
					 * If we're here this means
					 * that one unit of difference meets out 
					 * profit requirement, so we need to put our 
					 * first bid two units under the best asks because
					 * we always need one empty slot between best ask
					 * and best bid
					 */

					return await this.finalStripes(now["asks"], await this._add(now["asks"],dec,-2),$pair)

				} else {

					/**
					 * If we're here this means we have a one unit spread
					 * but doesn't meet our profit criteria so we open our orders
					 * using the best ask has reference (this is arbitrary).
					 */

					return await this.finalStripes(now["asks"], await this._floor(now["asks"]/ (this._spec[$pair]["profit"] * 2/100 + 1), dec),$pair)

				}	

			} 

			else 

				/**
				 * Reaching this else statement means that spread is 
				 * exactly of two units, conditions are preatty similar to
				 * above ones.
				 */

			{


				if (now["asks"]/now["bids"] >= this._spec[$pair]["profit"] * 2/100 + 1) {

					return await this.finalStripes(now["asks"], now["bids"],$pair)

				} else {

					return await this.finalStripes(now["asks"], await this._floor(now["asks"]/ (this._spec[$pair]["profit"] * 2/100 + 1), dec),$pair)

				}

			}

		}

		/**
		 * If we set the force liquidity option to true
		 */

		if (this._spec[$pair]["force_liquidity"]) {

			/**
			 * Reaching here we're going to determine 
			 * which is the best option to provide liquidity
			 * on this pair, we go from the best option 
			 * to the worst one.
			 */

			if (binance) {

				/**
				 * If we reach here we 
				 * got some data from binance
				 * so we duplicate here the price from
				 * binance and add our profit.
				 */

				return await this.finalStripes(binance["asks"], await this._floor(binance["asks"]/ (this._spec[$pair]["profit"] * 2/100 + 1), dec),$pair)

			} else {

				if (arb) {

					/**
					 * Reaching here means that we were able to determine
					 * our arbitrage price from ETH and BTC
					 * now we choose the most narraow spread from the actual 
					 * price and the arbitrage price
					 */

					if(now["asks"]/now["bids"] > arb["asks"]/arb["bids"]){

						return await this.finalStripes(arb["asks"], await this._floor(arb["asks"]/ (this._spec[$pair]["profit"] * 2/100 + 1), dec),$pair)

					}

					else {

						return await this.finalStripes(now["asks"], await this._floor(now["asks"]/ (this._spec[$pair]["profit"] * 2/100 + 1), dec),$pair)

					}

				} else {

					/**
					 * Be carefull reaching here can lead 
					 * to some lost in particular cases
					 * see doc ________________________
					 */

					return await this.finalStripes(now["asks"], await this._floor(now["asks"]/ (this._spec[$pair]["profit"] * 2/100 + 1), dec),$pair)


				}

			}


		} else {

			/**
			 * Reaching here means we don't want to 
			 * force liquidity on this pair but want to
			 * put orders on the order book
			 */

			if (arb) {

				if(now["asks"]/now["bids"] > arb["asks"]/arb["bids"]){

					if (arb["asks"]/arb["bids"] > this._spec[$pair]["profit"] * 2/100 + 1) {

						/**
						 * You might be aware that in this case you will in fact 
						 * increase your profit, this one will be equal to : arb["asks"]/arb["bids"]
						 */

						return await this.finalStripes(arb["asks"], arb["bids"],$pair);

					} else {

						return await this.finalStripes(arb["asks"], await this._floor(arb["asks"]/ (this._spec[$pair]["profit"] * 2/100 + 1), dec),$pair)

					}

				}

				else {

					if (now["asks"]/now["bids"] > this._spec[$pair]["profit"] * 2/100 + 1) {

						/**
						 * You might be aware that in this case you will in fact 
						 * increase your profit, this one will be equal to : now["asks"]/now["bids"]
						 */

						return await this.finalStripes(now["asks"], now["bids"],$pair);

					} else {

						return await this.finalStripes(now["asks"], await this._floor(now["asks"]/ (this._spec[$pair]["profit"] * 2/100 + 1), dec),$pair)

					}

				}

			} else {

				if (now["asks"]/now["bids"] > this._spec[$pair]["profit"] * 2/100 + 1) {

					/**
					 * You might be aware that in this case you will in fact 
					 * increase your profit, this one will be equal to : now["asks"]/now["bids"]
					 */

					return await this.finalStripes(now["asks"], now["bids"],$pair);

				} else {

					return await this.finalStripes(now["asks"], await this._floor(now["asks"]/ (this._spec[$pair]["profit"] * 2/100 + 1), dec),$pair)

				}


			}
		}

	}


	async finalStripes($asks,$bids,$pair){

		return new Promise(async(resolve,reject) => {

			/**
			 * our prices decimal eg COSS_ETH => 6 
			 */

			var dec = this._decimal.get($pair)["price_decimal"];

			/**
			 * The amount we set in our beginning params
			 */

			var amount_one = this._spec[$pair]["total_amount_one"] ? this._spec[$pair]["total_amount_one"] : false;
			var amount_two = this._spec[$pair]["total_amount_two"] ? this._spec[$pair]["total_amount_two"] : false;

			/**
			 * Our amount precision, means the maximum digits 
			 * allowed on the quantity of the pair
			 */

			var amount_dec = this._decimal.get($pair)["amount_decimal"]

			/**
			 * each crypto name separately
			 */

			var [cryptoo1,cryptoo2] = $pair.split("_");

			/**
			 * this is the amount we have in our wallet 
			 * for each crypto of the pair.
			 */

			var crypto1 = this._wallet[cryptoo1] ? this._wallet[cryptoo1] : 0;
			var crypto2 = this._wallet[cryptoo2] ? this._wallet[cryptoo2] : 0;

			/**
			 * if we don't have crypto in wallet 
			 * we should not go any further and return now
			 */

			if (crypto1 == 0 || crypto2 == 0) { resolve(false)}

			/**
			 * this is the profit we want to take 
			 * between each pair of order.
			 */

			var profit = this._spec[$pair]["profit"]/100 + 1;

			this._spec[$pair]["orderbook"] = {};

			/**
			 * this is our range for initially covering the 
			 * orderbook.
			 */

			var [low_bid,high_ask] = this._spec[$pair]["range"];

			$assert.ok(low_bid < high_ask," The leftmost value of the range has to be the lowest")
			$assert.ok(this._spec[$pair]["ref"] == 1 || this._spec[$pair]["ref"] == 0 || this._spec[$pair]["ref"] == 2,"ref has to be 0 or 1 ONLY see doc");
			$assert.ok(typeof this._spec[$pair]['amount'] == "number" || this._spec[$pair]["amount"] == false,"amount has to be an interger or false");

			/**
			 * those variables are used to create our orders 
			 * properly.
			 */

			var ready = true;

			var ask_start = $asks;

			var bid_start = $bids;

			console.log("asks:", $asks, " bids: ",$bids);

			var orders_asks = [];

			var orders_bids = [];

			var quantity1 = 0;

			var quantity2 = 0;

			if (this._spec[$pair]["amount"]) {

				/**
				 * if we gave to the program the exact 
				 * amount of crypto that we want to trade
				 * for our market making we reach here.
				 */

				while (ready){

					/**
					 * typically this while loop
					 * allows us to determine at which 
					 * price each order will be opened
					 */

					while(ask_start < high_ask){

						/**
						 * first regarding the orders on the asks
						 * side, we take our starting ask price, determined
						 * in our set stripe function, then multiply it by our
						 * profit until reaching our high ask price, given in the range
						 * of the pair _spec variable.
						 */

						var amount = await this.quantity(this._spec[$pair]["amount"],this._spec[$pair]["ref"],ask_start,$pair)

						quantity1 += amount;

						orders_asks.push([parseFloat(ask_start), amount]);

						/** 
						 * We ceil here in order to have at least,
						 * the prodfit we gave to the program 
						 */

						ask_start = await this._ceil(ask_start * profit, dec);

					}

					while(bid_start > low_bid){

						/**
						 * we do the same on the bid side
						 * for both sides we keep a trace 
						 * of the total quantity that would be taken 
						 * from our wallet in order to open all the orders.
						 */

						var amount = await this.quantity(this._spec[$pair]["amount"],this._spec[$pair]["ref"],bid_start,$pair)

						quantity2 += amount * bid_start;

						orders_bids.push([parseFloat(bid_start), amount]);

						bid_start = await this._floor(bid_start / profit, dec);

					}

					console.log("quantity of "  + cryptoo1 + " used : " +  quantity1);
					console.log("quantity of "  + cryptoo2 + " used : " +  quantity2);
					console.log(cryptoo1 + " wallet : " +  crypto1);
					console.log(cryptoo2 +  "wallet : " +  crypto2);

					if (quantity1 > crypto1 || quantity2 > crypto2) {

						/**
						 * if one of the total amount of crypto
						 * that we want to take are superior than 
						 * what we have in our wallet, we rise our profit
						 * in order to open less orders and this should allow to 
						 * use less crypto, in order to meet our wallet criteria.
						 */

						profit *= this._spec[$pair]["profit"]/100 +1 ;

						/**
						 * we need in order to keep a coherent gap between each side
						 * adapt our starting bid price.
						 */

						ask_start = $asks;

						while($asks / $bids < (profit - 1)  * 2 + 1 ){
							$bids = await this._floor(($bids * 10 ** dec - 1) / 10 ** dec, dec);

						}


						bid_start = $bids;
						quantity1 = 0;
						quantity2 = 0;
						orders_asks = [];
						orders_bids = [];

					} else {

						ready = false;

						/**
						 * if we changed our profit we have to change it 
						 * in our pair specification.
						 */

						if (this._spec[$pair]["profit"]/100 + 1 != profit) {

							console.log(" changing profit new profit is : " + (profit - 1) * 100);

							this._spec[$pair]["profit"] = (profit - 1) * 100 ;

						}

					}

				}

				this._spec[$pair]["orderbook"]["bids"] = [];
				this._spec[$pair]["orderbook"]["asks"] = [];

				/**
				 * if the amount of orders we want to open would break the API
				 * request limit call we have to return false in order, to give the 
				 * lead to our function that would wait for one minut 
				 */

				if (orders_asks.length + orders_bids.length + this._callcounter > 700){

				   	console.log("reached API limit request waiting to drain on " + $pair);

					 setTimeout(async() => {

						for(var value of orders_asks){

							if(await this.openOrder(value[0],value[1],"SELL",$pair))this._spec[$pair]["orderbook"]["asks"].push(value[0]);

						}

						for(var value of orders_bids){

							if(await this.openOrder(value[0],value[1],"BUY",$pair))this._spec[$pair]["orderbook"]["bids"].push(value[0]);

						}

						console.log("pair: " + $pair + " order asks",this._spec[$pair]["orderbook"]["asks"]);
						console.log("pair: " + $pair + " order bids",this._spec[$pair]["orderbook"]["bids"]);
						console.log("wallet :");
						console.log(this._wallet);
						this._spec[$pair]["orderbook"]["asks_length"] = this._spec[$pair]["orderbook"]["asks"].length;
						this._spec[$pair]["orderbook"]["bids_length"] = this._spec[$pair]["orderbook"]["bids"].length;



						this._spec[$pair]["created"] = true;
						resolve(true);


					 },65000)

				} else {

					for(var value of orders_asks){

						if(await this.openOrder(value[0],value[1],"SELL",$pair))this._spec[$pair]["orderbook"]["asks"].push(value[0]);

					}

					for(var value of orders_bids){

						if(await this.openOrder(value[0],value[1],"BUY",$pair))this._spec[$pair]["orderbook"]["bids"].push(value[0]);

					}

					console.log("pair: " + $pair + " order asks",this._spec[$pair]["orderbook"]["asks"]);
					console.log("pair: " + $pair + " order bids",this._spec[$pair]["orderbook"]["bids"]);
					console.log("wallet :");
					console.log(this._wallet);
					this._spec[$pair]["orderbook"]["asks_length"] = this._spec[$pair]["orderbook"]["asks"].length;
					this._spec[$pair]["orderbook"]["bids_length"] = this._spec[$pair]["orderbook"]["bids"].length;


					this._spec[$pair]["created"] = true;
					resolve(true);

				}




			} else {

				/**
				 * Here the situation is different this is 
				 * the case where we are using the total amount
				 * instead of the exact amount per order.
				 */

				while(ready){


					while(ask_start < high_ask){

						/**
						 * those while loops are used to
						 * determine the number of orders that would be created on each pair
						 */


						quantity1 += 1

						ask_start = await this._ceil(ask_start * profit, dec);

					}

					while(bid_start > low_bid){

						quantity2 += 1

						bid_start = await this._floor(bid_start / profit, dec);

					}

					/**
					 * Here we get the lowest of our two amounts 
					 * in order to meet our wallet restrictions.
					 */

					var amount1 = await this._floor(amount_one / quantity1,amount_dec);
					var amount2 = await this._floor(amount_two / $bids / quantity2,amount_dec);

					var amount_fin = Math.min(amount1,amount2)
					this._spec[$pair]["amount"] = this._spec[$pair]["ref"] == 0 ? amount_fin : amount_fin * bid_start;
					console.log(" the amount: ",this._spec[$pair]["amount"]);

					/**
					 * If the final amount is below the minimal amount 
					 * for the pair, we loop again and increase our spread
					 * to get a higher amount.
					 */

					if (amount_fin * $asks < this._amount_min.get(cryptoo2) || amount_fin * bid_start < this._amount_min.get(cryptoo2)) {

						profit *= this._spec[$pair]["profit"]/100 +1 ;

						quantity1 = 0;
						quantity2 = 0;
						ask_start = $asks;

						while($asks / $bids < (profit - 1)  * 2 + 1 ){
							$bids = await this._floor(($bids * 10 ** dec - 1) / 10 ** dec, dec);

						}

						bid_start = $bids;

					} else {

						ready = false;

						if (this._spec[$pair]["profit"]/100 + 1 != profit) {

							this._spec[$pair]["profit"] = (profit - 1) * 100;
							ask_start = $asks;
							bid_start = $bids;
						} else {

							bid_start = $bids;
							ask_start = $asks;

						}	

					}

				}

				console.log(" final amount = " +  this._spec[$pair]["amount"]);
				console.log("bid start = " +  bid_start);
				console.log("ask start = " +  ask_start);
				console.log("profit:"  + this._spec[$pair]["profit"]);

				ready = true;
				quantity1 = 0;
				quantity2 = 0;

				/**
				 * this while loop is preatty the same 
				 * as the first nested one of this function.
				 */

				while (ready){

					while(ask_start < high_ask){


						var amount = await this.quantity(this._spec[$pair]["amount"],this._spec[$pair]["ref"],ask_start,$pair,"asks");

						quantity1 += amount

						orders_asks.push([ask_start, amount]);

						ask_start = await this._ceil(ask_start * profit, dec);

					}

					while(bid_start > low_bid){

						var amount = await this.quantity(this._spec[$pair]["amount"],this._spec[$pair]["ref"],bid_start,$pair,"bids");

						quantity2 += amount * bid_start;

						orders_bids.push([bid_start, amount]);

						bid_start = await this._floor(bid_start / profit, dec);

					}

					console.log("quantity of "  + cryptoo1 + " used : " +  quantity1)
					console.log("quantity of "  + cryptoo2 + " used : " +  quantity2)
					console.log(cryptoo1 + " wallet : " +  crypto1)
					console.log(cryptoo2 +  "wallet : " +  crypto2)

					if (quantity1 > crypto1 || quantity2 > crypto2) {

						profit *= this._spec[$pair]["profit"]/100 +1 ;

						ask_start = $asks;
						
						while($asks / $bids < (profit - 1)  * 2 + 1 ){
							$bids = await this._floor(($bids * 10 ** dec - 1) / 10 ** dec, dec);

						}

						quantity1 = 0;
						quantity2 = 0;
						bid_start = $bids;
						orders_asks = [];
						orders_bids = [];

					} else {

						ready = false;

						if (this._spec[$pair]["profit"]/100 + 1 != profit) {

							this._spec[$pair]["profit"] = (profit - 1) * 100;

							console.log("changing profit new profit : " + (profit - 1)*100)

						}

					}

				}

				this._spec[$pair]["orderbook"]["bids"] = [];
				this._spec[$pair]["orderbook"]["asks"] = [];

				/**
				 * if our call would break the api request limit
				 * we have to wait for one minut to reset the limit.
				 */



				if (orders_asks.length + orders_bids.length + this._callcounter > 700){

					 setTimeout(async() => {

					 	for(var value of orders_asks){


					 		if(await this.openOrder(value[0],value[1],"SELL",$pair))this._spec[$pair]["orderbook"]["asks"].push(value[0]);

						}

						for(var value of orders_bids){

							if(await this.openOrder(value[0],value[1],"BUY",$pair))this._spec[$pair]["orderbook"]["bids"].push(value[0]);

						}

						console.log("pair: " + $pair + " order asks",this._spec[$pair]["orderbook"]["asks"]);
						console.log("pair: " + $pair + " order bids",this._spec[$pair]["orderbook"]["bids"]);
						console.log("wallet :");
						console.log(this._wallet);
						this._spec[$pair]["orderbook"]["asks_length"] = this._spec[$pair]["orderbook"]["asks"].length;
						this._spec[$pair]["orderbook"]["bids_length"] = this._spec[$pair]["orderbook"]["bids"].length;


						this._spec[$pair]["created"] = true;
						resolve(true);

					 },65000)

				} else {

					for(var value of orders_asks){

						if(await this.openOrder(value[0],value[1],"SELL",$pair))this._spec[$pair]["orderbook"]["asks"].push(value[0]);

					}

					for(var value of orders_bids){

						if(await this.openOrder(value[0],value[1],"BUY",$pair))this._spec[$pair]["orderbook"]["bids"].push(value[0]);

					}

					this._spec[$pair]["orderbook"]["asks_length"] = this._spec[$pair]["orderbook"]["asks"].length;
					this._spec[$pair]["orderbook"]["bids_length"] = this._spec[$pair]["orderbook"]["bids"].length;

					console.log("pair: " + $pair + " order asks",this._spec[$pair]["orderbook"]["asks"]);
					console.log("pair: " + $pair + " order bids",this._spec[$pair]["orderbook"]["bids"]);
					console.log("wallet :");
					console.log(this._wallet);

					this._spec[$pair]["created"] = true;
					resolve(true);

				}

			}
		})

	}

	async _add(price,dec,amount){

		return Math.round((price * 10 ** dec) + amount)/ 10 ** dec;

	}

	async quantity($amount,$ref,$price,$pair,side = false){

		if ($ref == 0) {

			return $amount;

		} else if ($ref == 1) {

			return await this._ceil($amount/$price,this._decimal.get($pair)["amount_decimal"]);

		} else if ($ref == 2) {

			if (!this._spec[$pair]["alt_amount"]) {

				var amount = await this._ceil($amount/$price,this._decimal.get($pair)["amount_decimal"]);
				this._spec[$pair]["alt_amount"] = amount;

				return amount;

			} else {

				return await this._ceil((($amount/$price) + this._spec[$pair]["alt_amount"]) / 2 ,this._decimal.get($pair)["amount_decimal"]);

			}

		}

	}

	async openOrder(price,quantity,side,$pair){

		this._start == false ? this._callcounter++ : false;
		if (this._kill) { return false}

		var $pairs = $pair.split("_");

		if(price * quantity < this._amount_min.get($pairs[1])){

			quantity = await this._ceil(this._amount_min.get($pairs[1]) / price,this._decimal.get($pair)["amount_decimal"]);

			console.log("Notice order not opened amount too low",price,quantity,price * quantity, " on pair " + $pair);
			return false;
		} 

		if (side == "BUY") {
			//console.log(`We take off ${price*quantity} from our wallet in ${$pairs[1]}`)
			this._wallet[$pairs[1]] -= price*quantity;
			if (this._wallet[$pairs[1]] < 0) {

				console.log("order not opened cause : not enough funds");
				this._wallet[$pairs[1]] += price*quantity;
				return false;

			} 

		} else {

			//console.log(`We take off ${quantity} from our wallet in ${$pairs[0]}`)
			this._wallet[$pairs[0]] -= quantity;
			if (this._wallet[$pairs[0]] < 0) {

				console.log("order not opened cause : not enough funds");
				this._wallet[$pairs[0]] += quantity;
				return false;

			}

		}


		console.log("We " + side + " " + quantity + " " + $pairs[0] + " at " + price + " on " + $pair);

		return true

	}


}

module.exports = MMBot;
