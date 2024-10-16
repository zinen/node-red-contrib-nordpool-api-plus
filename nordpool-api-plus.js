module.exports = function (RED) {
  function nordpoolAPIPlus (config) {
    RED.nodes.createNode(this, config)
    const fetch = require('node-fetch')

    // The nodes config:
    const node = this
    node.area = config.area
    node.currency = config.currency
    node.action = config.action
    node.status({ text: 'Ready' })
    node.on('input', async function (msg, send, done) {
      const opts = {
        area: msg.area || node.area || 'NO1', // See https://data.nordpoolgroup.com/map
        currency: msg.currency || node.currency || 'EUR' // can also be 'DKK', 'NOK', 'SEK'
      }

      let date = new Date()
      if (node.action === 'dayAhead') {
        date = new Date(date.setDate(date.getDate() + 1))
      } else if (node.action !== 'rolling' && msg.date) {
        try {
          date = new Date(msg.date)
        } catch (error) {
          node.status({ fill: 'red', text: 'Error in date input' })
          done('Invalid time value input in msg.date')
          return
        }
      }
      try {
        // Format date to YYYY-MM-DD
        opts.date = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
        msg.payload = await prices(node, fetch, opts)
      } catch (error) {
        done(error.message)
        return
      }
      if (node.action === 'rolling') {
        date = new Date()
        date = new Date(date.setDate(date.getDate() - 1))
        try {
          opts.date = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
          // Pre append yesterdays data to array
          msg.payload = (await prices(node, fetch, opts)).concat(msg.payload)
        } catch (error) {
          done(error.message)
          return
        }
        date = new Date()
        date = new Date(date.setDate(date.getDate() + 1))
        try {
          opts.date = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
          msg.payload = msg.payload.concat(
            await prices(node, fetch, opts)
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

async function prices (node, fetch, opts) {
  node.status({ fill: 'blue', shape: 'dot', text: 'Getting prices' })
  let response
  try {
    const url = 'https://dataportal-api.nordpoolgroup.com/api/DayAheadPrices?market=DayAhead&deliveryArea=' + opts.area + '&currency=' + opts.currency + '&date=' + opts.date
    response = await fetch(url)
  } catch (error) {
    node.status({ fill: 'red', text: 'Error getting data' })
  }
  let returnedData = await response.text()
  try {
    returnedData = JSON.parse(returnedData)
  } catch (error) {
    const errorText = returnedData || `${response.status} - Error: ${response.statusText}`
    // console.error(`msg.url, returnedData JSON parse error content: ${msg.url}`)
    if (opts.currency !== 'EUR') {
      node.status({ fill: 'yellow', text: 'No data for ' + opts.date + '. Some areas only support EUR as currency' })
    } else {
      node.status({ fill: 'yellow', text: 'No data found for ' + opts.date })
    }
    throw new Error(errorText)
  }
  const area = Object.keys(returnedData.multiAreaEntries[0].entryPerArea)[0]
  const items = returnedData.multiAreaEntries.map(entry => ({
    price: entry.entryPerArea[area],
    currency: returnedData.currency,
    area,
    timestamp: entry.deliveryStart
  }))
  node.status({ fill: 'green', text: opts.date + ' OK' })
  return items
}
