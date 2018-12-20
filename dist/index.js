'use strict';

var _posenet = require('@tensorflow-models/posenet');

var posenet = _interopRequireWildcard(_posenet);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var tf = require('@tensorflow/tfjs');
require('@tensorflow/tfjs-node');

var jpeg = require('jpeg-js');

var _require = require('canvas'),
    createCanvas = _require.createCanvas,
    Image = _require.Image;

var fs = require('fs');

var cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.cloud_name,
  api_key: process.env.api_key,
  api_secret: process.env.api_secret
});

var data = JSON.parse(fs.readFileSync('./backend/data.json', 'utf8'));

var request = require('request');

var imageScaleFactor = 0.5;
var outputStride = 16;
var flipHorizontal = false;

async function estimatePoseOnImage(imageElement) {
  // load the posenet model from a checkpoint
  var net = await posenet.load();

  var pose = await net.estimateSinglePose(imageElement, imageScaleFactor, flipHorizontal, outputStride);
  console.log(pose);

  return pose;
}

var delay = function delay(ms) {
  return new Promise(function (res) {
    return setTimeout(res, ms);
  });
};

var imageByteArray = function imageByteArray(image, numChannels) {
  console.time('imageByteArray');
  var pixels = image.data;
  var numPixels = image.width * image.height;
  var values = new Int32Array(numPixels * numChannels);

  for (var i = 0; i < numPixels; i++) {
    for (var channel = 0; channel < numChannels; ++channel) {
      values[i * numChannels + channel] = pixels[i * 4 + channel];
    }
  }

  return values;
};

var memoryUsage = function memoryUsage() {
  var used = process.memoryUsage();
  var values = [];
  for (var key in used) {
    values.push(key + '=' + Math.round(used[key] / 1024 / 1024 * 100) / 100 + ' MB');
  }

  return 'memory used: ' + values.join(', ');
};

var logTimeAndMemory = function logTimeAndMemory(label) {
  console.timeEnd(label);
  console.log(memoryUsage());
};

var decodeImage = function decodeImage(source) {
  console.time('decodeImage');
  var buf = Buffer.from(source, 'base64');
  var pixels = jpeg.decode(buf, true);
  console.log('Pixels', pixels);
  logTimeAndMemory('decodeImage');
  return pixels;
};

var imageToInput = function imageToInput(image, numChannels) {
  console.time('imageToInput');
  var values = imageByteArray(image, numChannels);

  var outShape = [image.height, image.width, numChannels];
  var input = tf.tensor3d(values, outShape, 'int32');

  logTimeAndMemory('imageToInput');
  return input;
};

var download = function download(uri) {
  var isUpa = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

  request.head(uri, function (err, res, body) {

    var name = '';
    var matricula = '';
    var fullname = '';

    if (isUpa) {
      name = res.headers['content-disposition'];

      var isDisponible = name.split("=")[name.split("=").length - 1];
      isDisponible = isDisponible.toLowerCase().replace(';', '');

      if ("nodisponible.jpg" === isDisponible) {
        console.log("No disponible");
        return 0;
      }

      matricula = name.split('=')[1].split(' ')[0];
      fullname = res.headers['content-disposition'].split('=')[1];
      fullname = fullname.toLowerCase().replace(';', '');
    } else {

      fullname = uri.split('/')[uri.split('/').length - 1];
    }

    request(uri).pipe(fs.createWriteStream(fullname)).on('close', function () {
      cloudinary.uploader.upload('./' + fullname, function (error, result) {
        if (error) {
          console.log(error);
        } else {
          fs.readFile('./' + fullname, async function (err, squid) {
            if (err) throw err;

            var image = decodeImage(squid);
            var input = imageToInput(image, 3);

            var pose = await estimatePoseOnImage(input);

            console.log(result);
            console.log(pose.score);

            result.score = pose.score;
            result.keypoints = pose.keypoints;

            data = data.result.concat(result);

            var content = JSON.stringify(data);

            var r = '{ "result" : ' + content + ' }';

            fs.writeFileSync('./backend/data.json', r);
          });
        }
      });
    });
  });
};

function lpad(value, padding) {
  var zeroes = new Array(padding + 1).join("0");
  return (zeroes + value).slice(-padding);
}

async function main() {
  /*
    for (let index = 0; index < 999; index++) {
  
      const matricula = lpad(index, 3);
  
      const urlM = 'https://sii.upa.edu.mx/upa.php/fotos/by_matricula/UP150' + matricula;
      console.log(urlM)
      download(urlM, true);
      await delay(60000);
  
    }*/

  var urlM = 'http://www.dronica360.es/images/category_41/Missguided%20FRILL%20FRONT%20BODY%20-%20Top%20-%20rose%20FG79882_0.jpg';

  console.log(urlM);
  //download(urlM, false);
  download(urlM, false);
}

main();