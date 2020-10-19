
const { hamt, methods, getData: getDta } = require('../module/index')

const schema = {
  type: 'hamt',
  key: 'bigint',
  value: {
    info: {
      seal_proof: 'int',
      sector_number: 'int',
      sealed_cid: 'cid',
      seal_rand_epoch: 'int',
      deal_ids: ['list', 'int'],
      expiration: 'int',
      replace_capacity: 'bool',
      replace_sector_deadline: 'int',
      replace_sector_partition: 'int',
      replace_sector_number: 'int',
    },
    precommit_deposit: 'bigint',
    precommit_epoch: 'int',
    deal_weight: 'bigint',
    verified_deal_weight: 'bigint',
  },
}

const power = {
  TotalRawBytePower: 'bigint',
  TotalBytesCommitted: 'bigint',
  TotalQualityAdjPower: 'bigint',
  TotalQABytesCommitted: 'bigint',
  TotalPledgeCollateral: 'bigint',
  ThisEpochRawBytePower: 'bigint',
  ThisEpochQualityAdjPower: 'bigint',
  ThisEpochPledgeCollateral: 'bigint',
  ThisEpochQAPowerSmoothed: {
    a: 'bigint',
    b: 'bigint',
  },
  miner_count: 'int',
  MinerAboveMinPowerCount: 'int',
  cronevent: 'cid',
  first: 'int',
//  last: 'int',
  Claims: 'cid',
  Proof: 'bool',
}

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

  for (let i = 0; i < node.length; i++) {
    if (!node[i]) continue
    let dta = await load(node[i]['/'])
    console.log(dta, height)
    let sub = readNode(dta, height-1)
    await forEach(sub, height-1, offset+i*subCount, load, cb)
  }
}

async function forEachRoot(root, load, cb) {
  return forEach(root.node, root.height, 0, load, cb)
}

async function main() {
  if (process.argv.length < 3) {
    console.log('Usage: node samples/methods/precommit.js miner-address')
    process.exit(0)
  }
  // const obj = methods.decode(schema, testdata)
  // console.log(await obj.asObject())
  const { getData, load } = getDta.make('wss://lotus.jimpick.com/spacerace_api/0/node/rpc/v0')
  const data = await getData(`1/@Ha:${process.argv[2]}/1/9`)
  // const data = await getData('1/@Ha:t01014/1')
  console.log(JSON.stringify(data,null,2))
  console.log(JSON.stringify(readRoot(data),null,2))

  await forEachRoot(readRoot(data), load, console.log)
  // console.log(methods.decode(power, data))
  // console.log(JSON.stringify(await methods.decode(schema, data).asStream(load, (a,b) => console.log(a,b)), null, 2))
  // console.log(JSON.stringify(await methods.decode(schema, data).asObject(load), null, 2))
  process.exit(0)
}

main()
