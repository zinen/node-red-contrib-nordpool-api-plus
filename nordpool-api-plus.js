module.exports = function (RED) {
  function nordpoolAPIPlus (config) {
    RED.nodes.createNode(this, config)
    // The nodes config:
    const node = this
    node.area = config.area
    node.currency = config.currency
    node.date = config.date
    node.action = config.action
    const nordpool = require('nordpool')
    node.status({ text: 'Ready' })
    node.on('input', async function (msg, send, done) {
      const AREA = msg.area || node.area || 'Oslo'
      const CURRENCY = msg.currency || node.currency || 'EUR'
      let date = new Date()
      if (node.action == "dayAhead") {
        date = new Date(date.setDate(date.getDate() + 1)).toISOString()
      } else {
        if (msg.date) {
          try {
            date = new Date(msg.date).toISOString()
          } catch (error) {
            node.status({ fill: 'red', text: 'Error in date input' })
            done('Invalid time value input in msg.date')
            return
          }
        } else {
          date = date.toISOString()
        }
      }
      const opts = {
        area: AREA, // See https://www.nordpoolgroup.com/Market-data1/#/nordic/map
        currency: CURRENCY, // can also be 'DKK', 'NOK', 'SEK'
        date: date
      }
      node.status({ fill: 'blue', shape: 'dot', text: 'Getting prices' })
      const prices = new nordpool.Prices()
      let results
      try {
        results = await prices.hourly(opts)
      } catch (error) {
        node.status({ fill: 'red', text: 'Error getting data' })
        done(error.message)
      }
      // Check if data is received from API call
      if (!results || results.length === 0) {
        // It seems that all areas support EUR, but not other currencies
        if (opts.currency !== 'EUR') {
          node.status({ fill: 'yellow', text: 'No data at date. Some areas only support EUR as currency' })
        } else {
          node.status({ fill: 'yellow', text: 'No data found for the requested date' })
        }
        msg.payload = null
        send(msg.message)
        done()
        return
      }
      msg.payload = []
      for (let item of results) {
        const values = {
          timestamp: item.date,
          price: item.value,
          currency: opts.currency,
          area: AREA
        }
        msg.payload.push(values)
      }
      node.status({ text: '' })
      send(msg)
      done()
    })
  }
  RED.nodes.registerType('nordpool-api-plus', nordpoolAPIPlus)
}
