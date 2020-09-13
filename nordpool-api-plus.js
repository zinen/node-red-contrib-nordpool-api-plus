module.exports = function (RED) {
  function nordpoolAPIPlus (config) {
    RED.nodes.createNode(this, config)

    // The nodes config:

    this.area = config.area
    this.currency = config.currency
    this.date = config.date
    const node = this
    const nordpool = require('nordpool')

    this.status({ text: 'Ready' })

    node.on('input', function (msg, send, done) {
      this.status({ fill: 'blue', shape: 'dot', text: 'Getting prices' })

      const AREA = msg.area || node.area || 'Oslo'
      const CURRENCY = msg.currency || node.currency || 'EUR'
      let date
      if (msg.date) {
        try {
          date = new Date(msg.date).toISOString()
        } catch (error) {
          node.status({ fill: 'red', text: 'Error in date input' })
          done(error)
          return
        }
      } else {
        date = new Date().toISOString()
      }
      var opts = {
        area: AREA, // See http://www.nordpoolspot.com/maps/
        currency: CURRENCY, // can also be 'DKK', 'NOK', 'SEK'
        date: date
      }
      const prices = new nordpool.Prices()
      const pricesOut = []
      prices.hourly(opts, function (error, results) {
        if (error) {
          node.status({ fill: 'red', text: 'Error while receiving data' })
          done(error)
          return
        }
        // Check if data is received from API call
        if (results.length === 0) {
          // It seems that all areas support EUR, but not other currencies
          if (opts.currency !== 'EUR') {
            node.status({ fill: 'yellow', text: 'No data. Some areas only support EUR as currency' })
          } else {
            node.status({ fill: 'yellow', text: 'No data found' })
          }
          msg.payload = null
          send(msg)
          done()
          return
        }
        for (var i = 0; i < results.length; i++) {
          const values = {
            timestamp: results[i].date.tz('Europe/Oslo'), // Convert moment object to native js time and date (UTC)
            price: results[i].value,
            currency: opts.currency,
            area: AREA
          }
          pricesOut.push(values)
        }
        msg.payload = pricesOut
        send(msg)
        node.status({ fill: '', text: 'Done' })
        done()
      })
    })
  }
  RED.nodes.registerType('nordpool-api-plus', nordpoolAPIPlus)
}
