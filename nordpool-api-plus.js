module.exports = function (RED) {
  function nordpoolAPIPlus (config) {
    RED.nodes.createNode(this, config)

    const nordpool = require('nordpool')
    const nordpoolPrices = new nordpool.Prices()
    const fetch = require('node-fetch')

    // The nodes config:
    const node = this
    node.area = config.area
    node.currency = config.currency
    node.date = config.date
    node.action = config.action
    node.status({ text: 'Ready' })
    node.on('input', async function (msg, send, done) {
      const opts = {
        area: msg.area || node.area || 'Oslo', // See https://www.nordpoolgroup.com/Market-data1/#/nordic/map
        currency: msg.currency || node.currency || 'EUR' // can also be 'DKK', 'NOK', 'SEK'
      }

      let date = new Date()
      if (node.action === 'dayAhead') {
        date = new Date(date.setDate(date.getDate() + 1))
      } else if (msg.date) {
        try {
          date = new Date(msg.date)
        } catch (error) {
          node.status({ fill: 'red', text: 'Error in date input' })
          done('Invalid time value input in msg.date')
          return
        }
      }
      // Format date to YYYY-MM-DD
      opts.date = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
      msg.payload = []
      try {
        msg.url = 'https://dataportal-api.nordpoolgroup.com/api/DayAheadPrices?market=DayAhead&deliveryArea=' + opts.area + '&currency=' + opts.currency + '&date=' + opts.date
        let returnedData = await fetch(msg.url)
        returnedData = await returnedData.json()
        console.log('returnedData', returnedData)
        const area = Object.keys(returnedData.multiAreaEntries[0].entryPerArea)[0]
        msg.payload = returnedData.multiAreaEntries.map(entry => ({
          price: entry.entryPerArea[area],
          currency: returnedData.currency,
          area,
          timestamp: entry.deliveryStart
        }))
        // msg.payload = await prices(node, nordpoolPrices, opts)
      } catch (error) {
        done(error.message)
        return
      }
      if (node.action === 'rolling') {
        opts.date = new Date(date.setDate(date.getDate() - 1)).toISOString()
        try {
          done('Nordpool data not yet fixed for action=rolling')
          // msg.payload = (await prices(node, nordpoolPrices, opts)).concat(msg.payload)
        } catch (error) {
          done(error.message)
          return
        }
        opts.date = new Date(date.setDate(date.getDate() + 2)).toISOString()
        try {
          msg.payload = msg.payload.concat(
            await prices(node, nordpoolPrices, opts)
          )
        } catch {
          // ignore for tomorrow
        }
      }
      send(msg)
      done()
    })
  }

  RED.nodes.registerType('nordpool-api-plus', nordpoolAPIPlus)
}

async function prices (node, nordpoolPrices, opts) {
  node.status({ fill: 'blue', shape: 'dot', text: 'Getting prices' })
  let results
  try {
    results = await nordpoolPrices.hourly(opts)
  } catch (error) {
    node.status({ fill: 'red', text: 'Error getting data' })
    throw error
  }
  // Check if data is received from API call
  if (!results || results.length === 0) {
    // It seems that all areas support EUR, but not other currencies
    if (opts.currency !== 'EUR') {
      node.status({ fill: 'yellow', text: 'No data for ' + opts.date + '. Some areas only support EUR as currency' })
    } else {
      node.status({ fill: 'yellow', text: 'No data found for ' + opts.date })
    }
    throw new Error('No data found for ' + opts.date)
  }
  const items = []
  for (const item of results) {
    items.push({
      timestamp: item.date,
      price: item.value,
      currency: opts.currency,
      area: opts.area
    })
  }
  node.status({ fill: 'green', text: opts.date + ' OK' })
  return items
}
