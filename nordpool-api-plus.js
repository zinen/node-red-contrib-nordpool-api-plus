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

    // Called by Node-RED when message appears on the node's input 
    node.on('input', async function (msg, send, done) {
      node.status({ fill: 'blue', shape: 'dot', text: 'Getting prices' })
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
      const opts = {
        area: AREA, // See https://www.nordpoolgroup.com/Market-data1/#/nordic/map
        currency: CURRENCY, // can also be 'DKK', 'NOK', 'SEK'
        date: date
      }

      const prices = new nordpool.Prices()
      let resultsHourly, resultsDaily

      // Get hourly prices
      try {
        resultsHourly = await prices.hourly(opts)
      } catch (error) {
        node.status({ fill: 'red', text: 'Error getting hourly data' })
        done(error)
      }

      // Get daily prices
      try {
        resultsDaily = await prices.daily(opts)
      } catch (error) {
        node.status({ fill: 'red', text: 'Error getting daily data' })
        done(error)
      }

      // Check if data is received from API call
      if (!resultsHourly || resultsHourly.length === 0 || !resultsDaily || resultsDaily.length === 0) {
        // It seems that all areas support EUR, but not other currencies
        if (opts.currency !== 'EUR') {
          node.status({ fill: 'yellow', text: 'No data at date. Some areas only support EUR as currency' })
        } else {
          node.status({ fill: 'yellow', text: 'No data found for the requested date' })
        }
        msg.payload = null
        send(msg)
        done()
        return
      }
      // Set up seoarate output messages for hourly and daily prices 
      let msgHourly={}
      let msgDaily={}

      for (let key in msg) {
        msgHourly[key] = msg[key]
      }

      for (let key in msg) {
        msgDaily[key] = msg[key]
      }

      msgHourly.payload = []
      for (var i = 0; i < resultsHourly.length; i++) {
        const values = {
          timestamp: resultsHourly[i].date,
          price: resultsHourly[i].value,
          currency: opts.currency,
          area: AREA
        }
        msgHourly.payload.push(values)
      }

      msgDaily.payload = []
      for (var i = 0; i < resultsDaily.length; i++) {
        const values = {
          timestamp: resultsDaily[i].date,
          price: resultsDaily[i].value,
          currency: opts.currency,
          area: AREA
        }
        msgDaily.payload.push(values)
      }

      node.status({ text: '' })
      send([msgHourly, msgDaily])
      done()
    })
  }
  RED.nodes.registerType('nordpool-api-plus', nordpoolAPIPlus)
}
