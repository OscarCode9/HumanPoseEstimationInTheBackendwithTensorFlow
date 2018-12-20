var express = require('express');
var router = express.Router();


const data = require('../getData')

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});
router.get('/getInf', function(req,res, next){
  res.send({
    data: data.result
  })
})


module.exports = router;
