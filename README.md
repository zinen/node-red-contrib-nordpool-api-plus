# Node Red Nordpool API

[![Platform](https://img.shields.io/badge/platform-Node--RED-red)](https://nodered.org)
[![NPM Total Downloads](https://img.shields.io/npm/dt/node-red-contrib-nordpool-api-plus.svg)](https://www.npmjs.com/package/node-red-contrib-nordpool-api-plus)
[![Dependencies](https://david-dm.org/zinen/node-red-contrib-nordpool-api-plus.svg)](https://david-dm.org/zinen/node-red-contrib-nordpool-api-plus)

A Node-Red Node for collecting "day ahead" prices from Nord Pool Group.

*This is a fork of the original node-red-contrib-nordpool-api, but with source code on github to make pull request possible and issue handling. Later that year: the original code is now [uploaded here](https://github.com/Csstenersen/node-red-contrib-nordpool-api)*

## Installation
Go to your Node-RED user folder (e.g. ~/.node-red) and run:
```
npm i node-red-contrib-nordpool-api-plus
```
This node uses the unofficial nordpool API [found here](https://github.com/samuelmr/nordpool-node).

## Usage


The area and currency can be changed by selecting from the drop down menu in the properties, or by inputting the setting via a `msg`:

![](/img/example.png)

### Examples:
Use a inject node to trigger a request to nordpool, to get prices for today.

Its also possible to inject a `msg.date` to get price from a specific date, or pricing for tomorrow. If you request tomorrows data before 14:42 there's a risk that data is not available yet and you will get the data from the current date. See [API issue#1](https://github.com/samuelmr/nordpool-node/issues/1#issuecomment-316583765)

An 24 object long array is returned on success. The objects contains this properties: `timestamp`, `price`, `currency` and `area`.

![](/img/example3.png)

## Example with dashboard chart:
In Node-RED editor, click menu at top right corner -> Import -> Examples -> node-red-contrib-nordpool-api-plus -> basic-dashboard.

Use a function node to convert `msg` to values readable for dashboard chart node like this:

![](/img/example5.png)

The function node in this example contains:

````
var msg1 = {}
for (var i = 0; i<msg.payload.length;i++){
    msg1 = {
        topic:msg.payload[i].currency, 
        payload:msg.payload[i].price, 
        timestamp:msg.payload[i].timestamp,
    }
    node.send(msg1)
}
````

This could be the displayed result in:

![](/img/example6.png)
