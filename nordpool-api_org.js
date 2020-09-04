module.exports = function(RED) {
  function nordpool_api(config) {
      RED.nodes.createNode(this,config);
      this.area = config.area;
      this.currency = config.currency;
      var node = this;
      node.on('input', function(msg) {

        const AREA = node.area  || 'Oslo'
        const CURRENCY = node.currency  || 'NOK' // can also be 'DKK', 'EUR', 'SEK'

        const nordpool = require('nordpool')
        const moment = require('moment-timezone')
        const prices = new nordpool.Prices()
        const request = require('request')

        let myTimeZone = moment.tz.guess()

        let date = moment()
        date.set('hours', date.get('hours') + 1) // next hour
        date.set('minutes', 0)
        date.set('seconds', 0)
        date.set('milliseconds', 0)

        let opts = {
          area: AREA,
          currency: CURRENCY,
          date: date
        }

        prices.at(opts, function (error, results) {
          if (error) {
            console.error(error)
            return
          }
          let price = results.value/10 // price per kWh instead of MWh
          let date = results.date.tz(myTimeZone).format('H:mm')
          //console.log('Elspot pris vil klokken ' + date + ' være ' + price + ' Øre/kWh')
          let values = {
            area: AREA,
            valuta: CURRENCY,
            pris: price,
            tidspunkt: date,
            enhet: 'kWh'
          }
          msg.payload = values
          node.send(msg.payload)

        })
        });
      }
       RED.nodes.registerType("nordpool-api",nordpool_api);
     }
     
