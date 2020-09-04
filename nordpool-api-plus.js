module.exports = function (RED) {
  function nordpoolAPIPlus (config) {
    RED.nodes.createNode(this, config)

    // The nodes config:

    this.area = config.area
    this.currency = config.currency
    this.date = config.date
    const node = this
    const nordpool = require('nordpool')

    node.on('input', function (msg, send, done) {
      this.status({ fill: 'yellow', shape: 'dot', text: 'Getting prices' })

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
          done(error)
          return
        }
        for (var i = 0; i < results.length; i++) {
          const values = {
            timestamp: results[i].date.tz('Europe/Oslo'),
            price: results[i].value,
            currency: opts.currency
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
