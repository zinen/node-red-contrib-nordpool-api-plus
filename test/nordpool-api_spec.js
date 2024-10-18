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
        let errorHappened = false
        // console.log('debug: should be able to receive data')
        // console.log(msg)
        try {
          msg.should.have.property('payload').which.is.a.Array()
          msg.payload.should.have.length(24)
          msg.payload[0].should.property('price').which.is.a.Number()
          msg.payload[0].should.property('currency').which.is.a.String()
          msg.payload[0].should.property('area').which.is.a.String()
          // Test if date can be parsed
          msg.payload[0].should.property('timestamp')
          const dateParsing = new Date(msg.payload[0].timestamp)
          should.notEqual(dateParsing, 'Invalid Date')
        } catch (error) {
          console.trace(error)
          errorHappened = true
        }
        if (!errorHappened) done()
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
      const yesterdayDate = new Date()
      yesterdayDate.setDate(yesterdayDate.getDate() - 1)
      n1.receive({ payload: '', area: 'SE1', currency: 'SEK', date: yesterdayDate.toISOString() })
    })
  }).timeout(10000)
  it('should throw catchable error', function (done) {
    const flow = [
      { id: 'n1', type: 'nordpool-api-plus', action: 'dayAhead', wires: [['n2']] }
    ]
    helper.load(testNode, flow, function () {
      const n1 = helper.getNode('n1')
      n1.on('call:error', function (msg) {
        // console.log('debug: should throw catchable error')
        // console.log(msg)
        msg.firstArg.should.startWith('204')
        done()
      })
      n1.receive({ area: 'unknown-country' })
    })
  }).timeout(10000)
  it('should return data from yesterday also', function (done) {
    const flow = [
      { id: 'n1', type: 'nordpool-api-plus', action: 'rolling', wires: [['n2']] },
      { id: 'n2', type: 'helper' }
    ]
    helper.load(testNode, flow, function () {
      const n1 = helper.getNode('n1')
      const n2 = helper.getNode('n2')
      n2.on('input', function (msg) {
        let errorHappened = false
        // console.log('debug: should return data from yesterday also')
        // console.log(msg)
        try {
          msg.should.have.property('payload').which.is.a.Array()
          msg.payload.length.should.be.greaterThan(47)
          msg.payload[47].should.property('price').which.is.a.Number()
          msg.payload[47].should.property('currency').which.is.a.String()
          msg.payload[47].should.property('area').which.is.a.String()
          // Test if date can be parsed
          msg.payload[47].should.property('timestamp')
          const dateParsing = new Date(msg.payload[46].timestamp)
          should.notEqual(dateParsing, 'Invalid Date')

          let date = new Date()
          // Date of yesterday
          date = new Date(date.setDate(date.getDate() - 1))
          should.equal(new Date(msg.payload[12].timestamp).getDate(), date.getDate())

          // Date of today
          date = new Date()
          should.equal(new Date(msg.payload[36].timestamp).getDate(), date.getDate())

          if (msg.payload.length > 48) {
            console.log('Testing rolling data for tomorrow now')
            // Date of tomorrow
            date = new Date(date.setDate(date.getDate() + 1))
            should.equal(new Date(msg.payload[60].timestamp).getDate(), date.getDate())
          }
        } catch (error) {
          console.error(String(error))
          console.trace(error)
          errorHappened = true
        }
        if (!errorHappened) done()
      })
      n1.receive({ payload: '' })
    })
  }).timeout(10000)
})
