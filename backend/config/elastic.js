const { Client } = require('@elastic/elasticsearch')
const esClient = new Client({ node: process.env.ES_URI })

module.exports = esClient
