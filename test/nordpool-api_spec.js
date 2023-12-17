/* global describe, beforeEach, afterEach, it */
const should = require('should')
const helper = require('node-red-node-test-helper')
const testNode = require('../nordpool-api-plus.js')

helper.init(require.resolve('node-red'))

describe('nordpool-api-plus Node', function () {
  beforeEach(function (done) {
    helper.startServer(done)
  })

  afterEach(function (done) {
    helper.unload()
    helper.stopServer(done)
  })

  it('should be loaded', function (done) {
    const flow = [{ id: 'n1', type: 'nordpool-api-plus', name: 'nordpool-api-plus' }]
    helper.load(testNode, flow, function () {
      const n1 = helper.getNode('n1')
      n1.should.have.property('name', 'nordpool-api-plus')
      done()
    })
  })

  it('should be able to receive data', function (done) {
    const flow = [
      { id: 'n1', type: 'nordpool-api-plus', wires: [['n2']] },
      { id: 'n2', type: 'helper' }
    ]
    helper.load(testNode, flow, function () {
      const n1 = helper.getNode('n1')
      const n2 = helper.getNode('n2')
      n2.on('input', function (msg) {
        msg.should.have.property('payload').which.is.a.Array()
        msg.payload.should.have.length(24)
        msg.payload[0].should.property('price').which.is.a.Number()
        msg.payload[0].should.property('currency').which.is.a.String()
        msg.payload[0].should.property('area').which.is.a.String()
        // Test if date can be parsed
        msg.payload[0].should.property('timestamp')
        const dateParsing = new Date(msg.payload[0].timestamp)
        should.notEqual(dateParsing, 'Invalid Date')
        done()
      })
      n1.receive({ payload: '' })
    })
  }).timeout(5000)
  it('should have non-default settings', function (done) {
    const flow = [
      { id: 'n1', type: 'nordpool-api-plus', area: 'DK2', currency: 'DKK', wires: [['n2']] },
      { id: 'n2', type: 'helper' }
    ]
    helper.load(testNode, flow, function () {
      const n1 = helper.getNode('n1')
      const n2 = helper.getNode('n2')
      n2.on('input', function (msg) {
        should.equal(msg.payload[0].area, 'DK2')
        should.equal(msg.payload[0].currency, 'DKK')
        done()
      })
      n1.receive({ payload: '' })
    })
  }).timeout(5000)
  it('should receive settings from other node', function (done) {
    const flow = [
      { id: 'n1', type: 'nordpool-api-plus', wires: [['n2']] },
      { id: 'n2', type: 'helper' }
    ]
    helper.load(testNode, flow, function () {
      const n1 = helper.getNode('n1')
      const n2 = helper.getNode('n2')
      n2.on('input', function (msg) {
        should.equal(msg.payload[0].area, 'SE1')
        should.equal(msg.payload[0].currency, 'SEK')
        done()
      })
      n1.receive({ payload: '', area: 'SE1', currency: 'SEK', date: new Date().toISOString() })
    })
  }).timeout(10000)
})
