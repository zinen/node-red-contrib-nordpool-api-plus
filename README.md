# Node Red Nordpool API
A Node-Red Node for collecting "day ahead" prices from Nord Pool Group.

*This is a fork of the original node-red-contrib-nordpool-api*

## Installation
Go to your Node-RED user folder (e.g. ~/.node-red) and run:
```
sudo npm i node-red-contrib-nordpool-api-plus
```

## Usage


The area and currency can be changed by selecting from the drop down menu in the properties:

![alt text](/png/example.png)

### example:
Use a inject node to trigger a request to nordpool

If the current time has passed 15:00 it returns an array of 48 objects. one pr.hour for this day and the day ahead.

If the current time is before 15:00 it returns an array of 24 objects. one pr.hour for current day. This i because the "day ahead" prices may not be published at this time. 

Objects contains this properties: `Area`, `Valuta`, `Price` and `Timestamp`.


![alt text](/png/example3.png)

### Example with UI chart:

Use a function node to convert `msg` to values readable for UI chart node:
![alt text](/png/example5.png)

the function node in this example contains:

````
var msg1 = {}
for (var i = 0; i<msg.payload.length;i++){
    msg1 = {
        topic:msg.payload[i].Area + " " + msg.payload[i].Valuta, 
        payload:msg.payload[i].Price, 
        timestamp:msg.payload[i].Timestamp,
        }
    node.send(msg1)
    }
return;
````

the result is that the function node pushes a payload for every object in `msg`:

![alt text](/png/example7.png)

result in UI:

![alt text](/png/example6.png)
