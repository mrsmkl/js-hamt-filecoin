
const hamt = require('./hamt')

function readRoot(lst) {
  return {
    height: lst[0],
    count: lst[1],
    node: readNode(lst[2], lst[0]),
  }
}

function expand(bmap, lst) {
  let num = hamt.bytesToBig(Buffer.from(bmap, 'base64')).toNumber()
  const res = []
  let acc = 0
  for (let i = 0; i < 8; i++) {
    if (num & 1 == 1) {
      res.push(lst[acc])
      acc++
    } else {
      res.push(null)
    }
    num = num >> 1
  }
  return res
}

function readNode(lst, h) {
  if (h == 0) return expand(lst[0], lst[2])
  else return expand(lst[0], lst[1])
}

function nodesForHeight(n) {
  return Math.pow(2, 3*n)
}

async function forEach(node, height, offset, load, cb) {
  if (height == 0) {
    for (let i = 0; i < node.length; i++) {
      await cb(offset+i, node[i])
    }
    return
  }

  const subCount = nodesForHeight(height)

  await Promise.all(node.map(async (elem, i) => {
    if (!elem) return
    let dta = await load(elem['/'])
    // console.log(dta, height)
    let sub = readNode(dta, height-1)
    return forEach(sub, height-1, offset+i*subCount, load, cb)
  }))
}

async function forEachRoot(root, load, cb) {
  return forEach(root.node, root.height, 0, load, cb)
}

module.exports = {
  readRoot,
  forEachRoot,
}

