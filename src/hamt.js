const address = require('@openworklabs/filecoin-address')
const sha256 = require('js-sha256')
const BN = require('bn.js')

// Get n next bits
function nextBits(obj, n) {
  // if (obj.left < n) throw new Error("out of bits")
  const res = obj.num.shrn(obj.left - n).and(new BN(1).shln(n).sub(new BN(1)))
  obj.left -= n
  return res.toNumber()
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


async function forEachIter(n, load, cb) {
  for (const c of n.data.pointers) {
    if (c[0]) {
      const child = await load(c[0]['/'])
      await forEachIter({ bitWidth: n.bitWidth, data: parseNode(child) }, load, cb)
    }
    if (c[1]) {
      for (const [k, v] of c[1]) {
        await cb(Buffer.from(k, 'base64'), makeBuffers(v))
      }
    }
  }
}

async function forEachIterParallel(n, load, cb) {
  await Promise.all(n.data.pointers.map(async c => {
    if (c[0]) {
      const child = await load(c[0]['/'])
      await forEachIterParallel({ bitWidth: n.bitWidth, data: parseNode(child) }, load, cb)
    }
    if (c[1]) {
      for (const [k, v] of c[1]) {
        await cb(Buffer.from(k, 'base64'), makeBuffers(v))
      }
    }
  }))
}

function bytesToBig(p) {
  let acc = new BN(0)
  for (let i = 0; i < p.length; i++) {
    acc = acc.mul(new BN(256))
    acc = acc.add(new BN(p[i]))
  }
  return acc
}

function parseNode(data) {
  return {
    pointers: data[1],
    bitfield: bytesToBig(Buffer.from(data[0], 'base64')),
  }
}

function print(k, v) {
  console.log(address.encode('t', new address.Address(k)), bytesToBig(v))
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

function readVarIntE(bytes, offset) {
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

function readVarInt(bytes, offset) {
  return readVarIntE(bytes, offset || 0)
}

async function buildArrayData(data, load) {
  var dataArray = []
  await addToArray({ bitWidth: 5, data: parseNode(data) }, async a => {
    return load(a)
  },
  dataArray)

  return dataArray
}

async function find(data, load, key) {
  const hash = bytesToBig(Buffer.from(sha256(key), 'hex'))
  return getValue({ bitWidth: 5, data: parseNode(data) }, load, { num: hash, left: 256 }, key)
}

async function forEach(data, load, cb) {
  await forEachIter({ bitWidth: 5, data: parseNode(data) }, async a => {
    return load(a)
  },
    cb)
}

async function forEachParallel(data, load, cb) {
  await forEachIterParallel({ bitWidth: 5, data: parseNode(data) }, async a => {
    return load(a)
  },
    cb)
}

async function printData(data, load) {
  await forEachIter({ bitWidth: 5, data: parseNode(data) }, async a => {
    return load(a)
  },
    print)
}

module.exports = {
  readVarInt,
  buildArrayData,
  nextBits,
  indexForBitPos,
  parseNode,
  find,
  forEach,
  forEachParallel,
  printData,
  bytesToBig,
  makeBuffers,
}

