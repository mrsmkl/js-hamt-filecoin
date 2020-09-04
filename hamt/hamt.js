const address = require('@openworklabs/filecoin-address')
const sha256 = require('js-sha256')
const BN = require('bn.js')

// Get n next bits
function nextBits(obj, n) {
  // if (obj.left < n) throw new Error("out of bits")
  const res = obj.num.shrn(new BN(obj.left - n)).and(new BN((1 << n) - 1))
  obj.left -= n
  return res
}

function indexForBitPos(bp, bitfield) {
  let acc = bitfield
  let idx = 0
  while (bp > 0) {
    if (acc.and(new BN(1)).eq(new BN(1))) {
      idx++
    }
    bp--
    acc = acc.shrn(new BN(1))
  }
  return idx
}

exports.nextBits = nextBits
exports.indexForBitPos = indexForBitPos

function getBit(b, n) {
  return b.shrn(n).and(new BN(0x1)).toNumber()
}

async function getValue(n, load, hv, key) {
  const idx = nextBits(hv, n.bitWidth)
  if (getBit(n.data.bitfield, idx) === 0) {
    throw new Error('not found in bitfield')
  }

  const cindex = indexForBitPos(idx, n.data.bitfield)

  const c = n.data.pointers[cindex]

  if (c[0]) {
    const child = await load(c[0]['/'])
    return getValue({ bitWidth: n.bitWidth, data: parseNode(child) }, load, hv, key)
  }
  if (c[1]) {
    for (const [k, v] of c[1]) {
      if (k === key.toString('base64')) return Buffer.from(v, 'base64')
    }
  }
  throw new Error('key not found')
}

function makeBuffers(obj) {
  if (typeof obj === 'string') {
    return Buffer.from(obj, 'base64')
  }
  if (obj instanceof Array) {
    return obj.map(makeBuffers)
  }
  return obj
}

exports.makeBuffers = makeBuffers

async function forEach(n, load, cb) {
  for (const c of n.data.pointers) {
    if (c[0]) {
      const child = await load(c[0]['/'])
      await forEach({ bitWidth: n.bitWidth, data: parseNode(child) }, load, cb)
    }
    if (c[1]) {
      for (const [k, v] of c[1]) {
        await cb(Buffer.from(k, 'base64'), makeBuffers(v))
      }
    }
  }
}

function bytesToBig(p) {
  let acc = new BN(0)
  for (let i = 0; i < p.length; i++) {
    acc = acc.mul(new BN(256))
    acc = acc.add(new BN(p[i]))
  }
  return acc
}

exports.bytesToBig = bytesToBig

function parseNode(data) {
  return {
    pointers: data[1],
    bitfield: bytesToBig(Buffer.from(data[0], 'base64')),
  }
}

exports.parseNode = parseNode

function print(k, v) {
  console.log(address.encode('t', new address.Address(k)), bytesToBig(v))
}

exports.find = async function (data, load, key) {
  const hash = bytesToBig(Buffer.from(sha256(key), 'hex'))
  return getValue({ bitWidth: 5, data: parseNode(data) }, load, { num: hash, left: 256 }, key)
}

exports.forEach = async function (data, load, cb) {
  await forEach({ bitWidth: 5, data: parseNode(data) }, async a => {
    return load(a)
  },
  cb)
}

exports.printData = async function (data, load) {
  await forEach({ bitWidth: 5, data: parseNode(data) }, async a => {
    return load(a)
  },
  print)
}

exports.buildArrayData = async function (data, load) {
  var dataArray = []
  await addToArray({ bitWidth: 5, data: parseNode(data) }, async a => {
    return load(a)
  },
  dataArray)

  return dataArray
}

async function addToArray(n, load, dataArray) {
  for (const c of n.data.pointers) {
    if (c[0]) {
      const child = await load(c[0]['/'])
      await addToArray({ bitWidth: n.bitWidth, data: parseNode(child) }, load, dataArray)
    }
    if (c[1]) {
      for (const [k, v] of c[1]) {
        await dataArray.push([address.encode('t', new address.Address(Buffer.from(k, 'base64'))), bytesToBig(makeBuffers(v))])
      }
    }
  }
}

function readVarInt(bytes, offset) {
  let res = new BN(0)
  let acc = new BN(1)
  for (let i = offset; i < bytes.length; i++) {
    res = res.add(new BN(bytes[i] & 0x7f).mul(acc))
    if (bytes[i] < 0x7f) {
      return res
    }
    acc = acc.mul(new BN(128))
  }
  return res
}

exports.readVarInt = function (bytes, offset) {
  return readVarInt(bytes, offset || 0)
}
