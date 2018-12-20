const fs = require('fs')
let  data = JSON.parse(fs.readFileSync(__dirname + '/data.json', 'utf8'));

module.exports =  data;