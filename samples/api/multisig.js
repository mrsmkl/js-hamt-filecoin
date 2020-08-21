const fs = require('fs')
const VerifyAPI = require('../../api/api.js')
const MockWallet = require('../mockWallet')
const constants = require("../constants")

async function run () {

    let endpointUrl = constants.lotus_endpoint

    const mnemonic = 'exit mystery juice city argue breeze film learn orange dynamic marine diary antenna road couple surge marine assume loop thought leader liquid rotate believe'
    const path = "m/44'/1'/1/0/"
    const mockWallet = new MockWallet(mnemonic, path)

    const api = new VerifyAPI(VerifyAPI.standAloneProvider(endpointUrl), mockWallet)

    console.log(Buffer.from("") instanceof Buffer)
    
    while (true) {
        
        let info = await api.pendingRootTransactions()
        console.log(info)

        console.log(await api.listVerifiers())

        await new Promise(resolve => { setTimeout(resolve, 1000) })
    }

}

run()


 