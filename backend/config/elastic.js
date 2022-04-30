const { Client } = require('@elastic/elasticsearch')
const esClient = new Client({ node: 'http://downcloud.cse356.compas.cs.stonybrook.edu:9200' })

module.exports = esClient
