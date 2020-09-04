module.exports = function (RED) {
  function nordpoolAPI (config) {
    RED.nodes.createNode(this, config)

    // The nodes config:

    this.area = config.area
    this.currency = config.currency
    this.date = config.date
    const node = this

    // change status of the node:

    this.status({ fill: 'green', shape: 'dot', text: 'Ready' })

    const request = require('request')
    const moment = require('moment')

    node.on('input', function (msg) {
      this.status({ fill: 'yellow', shape: 'dot', text: 'Getting prices' })

      // Variables:

      const AREA = node.area || 'Oslo'
      const CURRENCY = node.currency || 'NOK' // can also be 'DKK', 'EUR', 'SEK'
      const prices = []
      const date = moment()
      const compareTime = moment('15:00:00', 'hh:mm:ss') // Used to check if time is past 15:00
      let url = String
      const date1 = moment().format('DD-MM-YYYY')

      // function to update URL based on currency and date:

      function updateUrl (date) {
        url = 'https://www.nordpoolgroup.com/api/marketdata/page/10/?currency=,' +
          CURRENCY + ',' +
          CURRENCY + ',' +
          CURRENCY +
          '&endDate=' + date
      }

      updateUrl(date1)

      // Switch to define right column index to later get the prices
      let columnIndex = Number
      switch (AREA) {
        case 'SYS':
          columnIndex = 0
          break
        case 'SE1':
          columnIndex = 1
          break
        case 'SE2':
          columnIndex = 2
          break
        case 'SE3':
          columnIndex = 3
          break
        case 'SE4':
          columnIndex = 4
          break
        case 'FI':
          columnIndex = 5
          break
        case 'DK1':
          columnIndex = 6
          break
        case 'DK2':
          columnIndex = 7
          break
        case 'Oslo':
          columnIndex = 8
          break
        case 'Kr.sand':
          columnIndex = 9
          break
        case 'Bergen':
          columnIndex = 10
          break
        case 'Molde':
          columnIndex = 11
          break
        case 'Tr.heim':
          columnIndex = 12
          break
        case 'Tromsø':
          columnIndex = 13
          break
        case 'EE':
          columnIndex = 14
          break
        case 'LV':
          columnIndex = 15
          break
        case 'LT':
          columnIndex = 15
          break
      }

      // function to get prices from Nord Pool Group

      const promise = new Promise(function (resolve, reject) {
        request(url, { json: true }, function (error, response, body) {
          if (error !== null) {
            reject(error)
            return
          }
          if (typeof body.data === 'undefined') {
            reject(new Error('Error: Prices not available'))
            return
          }
          // Print the error if one occurred
          // console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
          // if (typeof body === 'defined') {
          for (let i = 0; i < 24; i++) {
            const values = {
              Area: body.data.Rows[i].Columns[columnIndex].Name,
              Timestamp: moment(body.data.Rows[i].StartTime).format('YYYY-MM-DD HH:mm'),
              SortTime: new Date(moment(body.data.Rows[i].StartTime).format('YYYY-MM-DD HH:mm')),
              Price: parseFloat(body.data.Rows[i].Columns[columnIndex].Value.replace(',', '.')),
              Valuta: body.data.Units[0]
            }
            prices.push(values)
            resolve(body)
          }
        })
      })

      // If time is past 15:00 then get prices from today and tomorrow, else only today as prices might not be available yet
      let promise1
      if (date > compareTime) {
        const date2 = moment().add(1, 'day').format('DD-MM-YYYY')
        updateUrl(date2)
        promise1 = new Promise(function (resolve, reject) {
          request(url, { json: true }, function (error, response, body) {
            if (error !== null) {
              reject(error)
              return
            }
            if (typeof body.data === 'undefined') {
              reject(new Error('Error: Prices not available'))
              return
            }
            // Print the error if one occurred
            // console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
            // if (typeof body === 'defined') {
            for (let i = 0; i < 24; i++) {
              const values = {
                Area: body.data.Rows[i].Columns[columnIndex].Name,
                Timestamp: moment(body.data.Rows[i].StartTime).format('YYYY-MM-DD HH:mm'),
                SortTime: new Date(moment(body.data.Rows[i].StartTime).format('YYYY-MM-DD HH:mm')),
                Price: parseFloat(body.data.Rows[i].Columns[columnIndex].Value.replace(',', '.')),
                Valuta: body.data.Units[0]
              }
              prices.push(values)
              resolve(body)
            }
          })
        })
      }

      // Handling if error occurs while getting prices

      Promise.all([promise, promise1]).catch(function (reject) {
        function status1 () {
          node.status({ fill: 'green', shape: 'dot', text: 'ready' })
        }
        node.status({ fill: 'blue', shape: 'dot', text: 'error' })
        node.send(reject)
        setTimeout(status1
          , 2000)
      })
      // sort the prices by date. Used when prices for tomorrow is returned before todays prices.
      Promise.all([promise, promise1]).then(function () {
        prices.sort((a, b) => a.SortTime - b.SortTime)
        for (let i = 0; i < prices.length; i++) {
          delete prices[i].SortTime
        }
        msg.payload = prices
        node.send(msg)
        node.status({ fill: 'green', shape: 'dot', text: 'Ready' })
      })
    })
  }
  RED.nodes.registerType('nordpool-api', nordpoolAPI)
}
