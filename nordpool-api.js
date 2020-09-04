module.exports = function (RED) {
  function nordpoolAPI (config) {
    RED.nodes.createNode(this, config)

    // Config instillinger for noden:

    this.area = config.area
    this.currency = config.currency
    this.date = config.date
    var node = this

    // Statuslampe fpr noden:

    this.status({ fill: 'green', shape: 'dot', text: 'Ready' })

    // Nødvendige noder:

    var request = require('request')
    var moment = require('moment')

    // Når det kommer en input på noden:

    node.on('input', function (msg) {
      this.status({ fill: 'yellow', shape: 'dot', text: 'Getting prices' })

      // Variabler:

      const AREA = node.area || 'Oslo'
      const CURRENCY = node.currency || 'NOK' // can also be 'DKK', 'EUR', 'SEK'
      var priser = []
      var date = moment()
      var comparetime = moment('15:00:00', 'hh:mm:ss') // Benyttes for å sjekke at klokken er over 15:00
      var url = String
      var date1 = moment().format('DD-MM-YYYY')

      // funksjon som oppdaterer URL slik at priser blir hentet med riktig valuta (CURRENCY) og riktig dato:

      function updateUrl (date) {
        url = 'https://www.nordpoolgroup.com/api/marketdata/page/10/?currency=,' +
          CURRENCY + ',' +
          CURRENCY + ',' +
          CURRENCY +
          '&endDate=' + date
      }

      updateUrl(date1)

      // Switch som stter riktig "columnindex" som senere benyttes for å hente priser for valgt område i config.

      switch (AREA) {
        case 'SYS':
          var columnindex = 0
          break

        case 'SE1':
          var columnindex = 1
          break

        case 'SE2':
          var columnindex = 2
          break

        case 'SE3':
          var columnindex = 3
          break

        case 'SE4':
          var columnindex = 4
          break

        case 'FI':
          var columnindex = 5
          break

        case 'DK1':
          var columnindex = 6
          break

        case 'DK2':
          var columnindex = 7
          break

        case 'Oslo':
          var columnindex = 8
          break

        case 'Kr.sand':
          var columnindex = 9
          break

        case 'Bergen':
          var columnindex = 10
          break

        case 'Molde':
          var columnindex = 11
          break

        case 'Tr.heim':
          var columnindex = 12
          break

        case 'Tromsø':
          var columnindex = 13
          break

        case 'EE':
          var columnindex = 14
          break

        case 'LV':
          var columnindex = 15
          break

        case 'LT':
          var columnindex = 15
          break
      }

      // Promise funksjon som henter priser fra NordPool

      var promise = new Promise(function (resolve, reject) {
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
          for (var i = 0; i < 24; i++) {
            const values = {
              Area: body.data.Rows[i].Columns[columnindex].Name,
              Timestamp: moment(body.data.Rows[i].StartTime).format('YYYY-MM-DD HH:mm'),
              SortTime: new Date(moment(body.data.Rows[i].StartTime).format('YYYY-MM-DD HH:mm')),
              Price: parseFloat(body.data.Rows[i].Columns[columnindex].Value.replace(',', '.')),
              Valuta: body.data.Units[0]
            }
            priser.push(values)
            resolve(body)
          }
        })
      })

      // Dersom klokken er over 15:00 som er definert i variabel "comparetime" så hentes priser for neste døgn.
      // Dersom klokken er før 15:00 hentes ikke priser for neste døgn da det er risiko for at disse ikke er publisert enda.

      if (date > comparetime) {
        const date2 = moment().add(1, 'day').format('DD-MM-YYYY')
        updateUrl(date2)
        var promise1 = new Promise(function (resolve, reject) {
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
            for (var i = 0; i < 24; i++) {
              const values = {
                Area: body.data.Rows[i].Columns[columnindex].Name,
                Timestamp: moment(body.data.Rows[i].StartTime).format('YYYY-MM-DD HH:mm'),
                SortTime: new Date(moment(body.data.Rows[i].StartTime).format('YYYY-MM-DD HH:mm')),
                Price: parseFloat(body.data.Rows[i].Columns[columnindex].Value.replace(',', '.')),
                Valuta: body.data.Units[0]
              }
              priser.push(values)
              resolve(body)
            }
          })
        })
      }

      // Feilhåndering dersom en av prishentingene feiler

      Promise.all([promise, promise1]).catch(function (reject) {
        function status1 () {
          node.status({ fill: 'green', shape: 'dot', text: 'ready' })
        }
        node.status({ fill: 'blue', shape: 'dot', text: 'error' })
        node.send(reject)
        setTimeout(status1
          , 2000)
      })
      // sortering av priser etter dato i tilfelle prisern for neste døgn kommer inn før dette døgn.
      // Sender dereter priser ut av noden.
      Promise.all([promise, promise1]).then(function () {
        priser.sort((a, b) => a.SortTime - b.SortTime)
        for (var i = 0; i < priser.length; i++) {
          delete priser[i].SortTime
        }
        msg.payload = priser
        node.send(msg)
        node.status({ fill: 'green', shape: 'dot', text: 'Ready' })
      })
    })
  }
  RED.nodes.registerType('nordpool-api', nordpoolAPI)
}
