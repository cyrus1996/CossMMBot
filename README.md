# COSSMMBOT (ENG)

This is a free trading bot for the [Coss.io][plateform] exchange, its strategy is
only market making and nothing else, the sections below give more details on how to make it work, and how it handles different situations.
For any questions you have a telegram group : https://t.me/cossmmbot 

## Requirements

* **Node.js** v10.15.*

## Installation

	 $ npm install cossmmbot

## Files

This bot has two main files :
* **index.js**
*  **sandbox.js** 

In a futur update they could be splitted in several smaller files.

## Sandbox.js File 


This file is a tester, it should be used before using the **index.js** file 
its purpose is to show you what orders are going to be opened and at which price, it source code also contains detailed commentary, that are not in the **index.js** file.
**IMPORTANT this files doesn't require your private keys, but thus you have to manually tell the bot how many currency you have, see examples below**
  
Its output is similar to this : 

```
opening socket on COSS_ETH
---Ok on COSS_ETH
we don't have COSS_ETH on binance
now :  { asks: 0.000284, bids: 0.000283 }
arb :  false
binance :  false
asks: 0.000284  bids:  0.000278
the amount:  0.02232
final amount = 0.02232
bid start = 0.000278
ask start = 0.000284
profit:1
quantity of COSS used : 749.54
quantity of ETH used : 0.22320958
COSS wallet : 1000
ETHwallet : 0.4
We SELL 78.6 COSS at 0.000284 on COSS_ETH
We SELL 77.78 COSS at 0.000287 on COSS_ETH
We SELL 76.97 COSS at 0.00029 on COSS_ETH
We SELL 76.18 COSS at 0.000293 on COSS_ETH
We SELL 75.41 COSS at 0.000296 on COSS_ETH
We SELL 74.65 COSS at 0.000299 on COSS_ETH
We SELL 73.91 COSS at 0.000302 on COSS_ETH
We SELL 72.95 COSS at 0.000306 on COSS_ETH
We SELL 72 COSS at 0.00031 on COSS_ETH
We SELL 71.09 COSS at 0.000314 on COSS_ETH
We BUY 80.29 COSS at 0.000278 on COSS_ETH
We BUY 81.17 COSS at 0.000275 on COSS_ETH
We BUY 82.06 COSS at 0.000272 on COSS_ETH
We BUY 82.98 COSS at 0.000269 on COSS_ETH
We BUY 83.91 COSS at 0.000266 on COSS_ETH
We BUY 84.87 COSS at 0.000263 on COSS_ETH
We BUY 85.85 COSS at 0.00026 on COSS_ETH
We BUY 86.85 COSS at 0.000257 on COSS_ETH
We BUY 87.88 COSS at 0.000254 on COSS_ETH
We BUY 88.93 COSS at 0.000251 on COSS_ETH
pair: COSS_ETH order asks [ 0.000284,
0.000287,
0.00029,
0.000293,
0.000296,
0.000299,
0.000302,
0.000306,
0.00031,
0.000314 ]
pair: COSS_ETH order bids [ 0.000278,
0.000275,
0.000272,
0.000269,
0.000266,
0.000263,
0.00026,
0.000257,
0.000254,
0.000251 ]
wallet :
{ COSS: 250.46000000000012,
ETH: 0.17679041999999998,
BTC: 0.03,
DAI: 40,
KIN: 1200000 }
stripes created on COSS_ETH
```
### Important : 

There are several indicators in this file output : 

	pair: COSS_ETH order asks [...]
	pair: COSS_ETH order bids [...]
Those arrays show at which price the orders are going to be opened, **note that if you have an empty array, this is an ERROR this means you gave a wrong opening range to the script, trying to do so on the _index.js_ file will throw an error [see below]**
<br>


	We SELL 78.6 COSS at 0.000284 on COSS_ETH
	We BUY 80.29 COSS at 0.000278 on COSS_ETH
Those lines tell you what amout is going to be used for each order.
<br>



	quantity of COSS used : 749.54 
	quantity of ETH used : 0.22320958
Those lines tell you how many of each crypto is going to be used for each crypto of the pair.
<br>

	profit:2.0100000000000007
If this profit is different from the one you gave to the script this means, your wallet restriction didn't meet, your amount requirement, so the bot rose the profit in order to open less orders and meet your wallet restrictions.
<br>

### Fake updating frames : 

You can emulate frames to see what the bot will do if it receives this frame,
the process of the bot is listening to stin so just send it data. Data sent must respect the following format : 
	
	a or b,price,quantity,pair
	eg : b,0.000298,0,COSS_ETH

### Usage example : 

For using the sandbox you have to create such file : 

```javascript
var coss = require("cossmmbot/sandbox.js");
var bot = new coss({
	"COSS_ETH": {
	
		"range": [0.00015,0.00022],
		"ref": 1,

		"total_amount_one": 900,
		"total_amount_two": 0.3,

		"profit": 1,

		"amount": false,

		"allow_overflow": false,

		"force_liquidity": true,

		"auto_kill": true
	}
},
{
	"COSS": 3000,
	"ETH": 2
})
````
Notice that the first argument is the specification for each pair, and the second argument is the wallet you want to emulate
<br>
## Index.js File

  

This is the main file, the output of this file contains those kinds of output : 
```
LOG: Mon, 29 Apr 2019 20:42:01 GMT ...
```
This is a regular output telling that everything is occurring fine.
<br>
```
NOTICE: Mon, 29 Apr 2019 20:42:01 GMT ...
```
This is a **Notice** telling the user that something **unexpected** happened but this can perfectly be handled by the script.  
eg : when opening an order we received the wrong response code a notice will be emitted and the script will try to open the order again.
<br>
```
WARNING: Mon, 29 Apr 2019 20:42:01 GMT ...
```
This is a **Warning** telling the user that something unexpected happened, this will cause part of the bot to do not run anymore, but the bot can still run.
eg : failed to open a socket on a pair, a warning will be emitted and no stripes will be opened on the pair.
<br>
```
ERROR: Mon, 29 Apr 2019 20:42:01 GMT ...
```
This is an **Error** which could not allow the bot to run properly anymore, the bot will wait for 12 seconds before cancelling every order of the account.
Eg : you got a network error or, the servers are being down for maintenance.
<br>
```
FATAL ERROR: Mon, 29 Apr 2019 20:42:01 GMT ...
```
This is an **Fatal Error** which could not allow the bot to run properly, **no orders will be closed**. Receiving this error should make you go on the exchange and close all the orders manually.
eg : receiving 5 **^C**  tokens.
<br>
#### End of the script<nobr> 
When exiting the bot will wait for 12 seconds and close all of the orders on the pairs on which it opened orders.

The bot allows you to use a "secret" API call to cancel all the orders at once, if you are familiar with programming you can send your session cookie to the process and then send ^C token to the process.

	JSESSIONID=<number>; language=en; country=US; <name>=<hash>; ip=<ip>; JSESSIONID=<hash>

If you don't send this cookie to the process this is not a problem the bot will close each order one at a time.

### Input to the file

You have to give to the bot the specification of the pairs you want to trade on : 
```javascript
var bot = require("cossmmbot");
var coss = new bot({
	"COSS_ETH": {
	
		"range": [0.00025,0.000314],
		"ref": 1,

		"total_amount_one": 900,
		"total_amount_two": 0.3,

		"profit": 1,

		"amount": false,

		"allow_overflow": false,

		"force_liquidity": true,

		"auto_kill": true
	}
},"YOUR PRIVATE","YOUR PUBLIC")
```
And then just run your file : 

	 $ node <your file>.js

Notice that this is almost the same as the sandbox file, you just have to change the required file and the wallet by your private and public.
<br>
To create an instance of the class you should use such declaration in a new file :  

```javascript
var bot = require("cossmmbot");
var coss =  new  bot({
	"COSS_ETH": {/*<your specifications>*/},
	"COSS_BTC": {/*<your specifications>*/}
},"YOUR PRIVATE","YOUR PUBLIC");
```

Now we will see deeper what each argument means: 
<br>
**Range** : 
```javascript
"range":  [0.00025,0.000314]
```
This is the interval in which your orders are going to be opened, no orders will be opened below ```0.00025``` in this case and no one will be opened above ```0.000314 ``` either.

**Be careful** : The lowest value have to be the leftmost one, the lowest value of the range have to be lower than the highest bid on the order book, and the bigger value of the range has to be above the lowest ask on the orderbook. If those conditions are not meet the bot will not do its work the right way.  
<br>
**Ref** : 
```javascript
"ref":  0 | 1 | 2,
```
This is a key variable, it tells the bot on which crypto you want to make profit.
For example if the pair is "COSS_ETH", basically what the bot does is that is splits the pair into an array or list (call it how you prefer) like this :
 `["COSS" , "ETH"]`
 If ref is 0 the bot will create orders for a fixed value of COSS (making you take profit in ETH), on the other hand if ref is 1 the bot will create orders for a fixed amount of ETH (making you take profit in COSS), and if ref is 2 profit are going the be equally splitted between the two crypto. 
 
 So to sum up : 
 * **If ref = 0 => profit in ETH**
 * **if ref = 1 => profit in COSS**

**Be careful** : If ref is a value **different from 0 or 1 the program will throw a warning an no orders will be opened on the pair !**
<br>
**Total_amount_[one | two]** : 
```javascript
"total_amount_one": 900,
"total_amount_two": 0.3,
```
##### **Used only if the amount field is set to false !**
 
As you may read above the pair name is being splited by the bot like like this :
 `["COSS" , "ETH"]` .

* **total_amount_one** : refers to the total amount of COSS that will be used for opening orders on that pair. The bot will strictly not use more currency than this amount.
*  **total_amount_two** : refers to the total amount of ETH that will be used for opening orders on that pair. The bot will strictly not use more currency than this amount.


**Be careful** : This field is not used if the **amount field is not false**
<br>
**Profit** : 
```javascript
"profit": 1,
```
 The profit you want to take between two orders in percent : 1 means 1%.

**Be careful** : keep in mind that if you want to make profit this field must be above : **(maker fee per order) x (2 + profit).**
If you have a maker fee per order = 0.15% and a profit of 1%,
**(maker fee per order) x (2 + profit)** = 0.15% x (2 + 1%)
= 0.3015%
0.3015% < 1% OK ! 
<br>
If you have a maker fee per order = 0.15% and a profit of 0.30%,
**(maker fee per order) x (2 + profit)** = 0.15% x (2 + 0.30%)
= 0.3000045%
0.3000045% > 0.3% ERROR ! 
<br>
**Amount** : 
```javascript
"amount": Float | false,
```
 This is the exact amount that will be used for opening orders, it is linked to the ref field : if ref is 0 then this amount has to be in COSS (if the pair given is COSS_ETH) else if ref is 1 then this amount has to be in ETH. 
 **Not being careful of this can look the bot into an infinite loop.**

**Be careful** : Is this field is given the : 
`total_amount_one and total_amount_two `
fields are ignored.
<br>
**Allow_overflow** : 
```javascript
"allow_overflow": true | false,
```
This field is a bit tricky, if set to false, the bot will never open order outside the range given, but if set to true, if the price goes up or down, the bot will try to keep as many open order on each side as the moment it opened its orders.
Example :  

* This is your order book when you created you stripes it shows at what price you placed your orders  : 


| My | Orders | 
|------|-----|
| asks | 105 |
| asks | 104 |
| asks | 103 |
| asks | 102 |
| bids | 100 |
| bids | 99  |
| bids | 98  |
| bids | 97  |
| bids | 96  |

If the price goes up : 

* With `allow_overflow` set to **false**

| Order | Book | 
|------|-----|
| asks | 105 |
| bids | 102 ![#f03c15](https://placehold.it/15/f03c15/000000?text=+)  |
| bids | 101 ![#f03c15](https://placehold.it/15/f03c15/000000?text=+) |
| bids | 100 |
| bids | 99  |
| bids | 98  |
| bids | 97  |
| bids | 96  |

![#f03c15](https://placehold.it/15/f03c15/000000?text=+)  = new order 

* With `allow_overflow` set to **True**

| Order | Book | 
|------|-----|
| asks | 107 ![#f03c15](https://placehold.it/15/f03c15/000000?text=+)  |
| asks | 106 ![#f03c15](https://placehold.it/15/f03c15/000000?text=+)  |
| asks | 104 |
| bids | 102 |
| bids | 101 ![#f03c15](https://placehold.it/15/f03c15/000000?text=+) 
| bids | 100 ![#f03c15](https://placehold.it/15/f03c15/000000?text=+)  |
| bids | 99  |
| bids | 98  |
| bids | 97  |
| bids | 96  |

![#f03c15](https://placehold.it/15/f03c15/000000?text=+)  = new order 


**Be careful** : Opening too much pairs with `allow_overlfow` can in some conditions bring you to a lack of currency in your wallet to open new orders.
<br>
**Force_liquidity** : 
```javascript
"force_liquidity": true | false
```
If set to `true` the will do its best to make the spread of the pair as close as possible to 2 x profit, this is used if you want to be sure that the bot will do its best to keep the spread as narrow as possible. 

## Donations :

```
BTC : 35Tv25zVtwvDSt3unxpctUpcUwo2cLcwBG
ETH : 0xFa871bf7c97A9E062a7727bc67390471636E4CbF
```
[plateform]: https://coss.io

