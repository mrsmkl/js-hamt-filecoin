
const { hamt, amt, getData: getDta } = require('../module/index')

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
  console.log(JSON.stringify(amt.readRoot(data),null,2))

  await amt.forEachRoot(amt.readRoot(data), load, console.log)
  // console.log(methods.decode(power, data))
  // console.log(JSON.stringify(await methods.decode(schema, data).asStream(load, (a,b) => console.log(a,b)), null, 2))
  // console.log(JSON.stringify(await methods.decode(schema, data).asObject(load), null, 2))
  process.exit(0)
}

main()
