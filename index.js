import * as posenet from '@tensorflow-models/posenet';

const tf = require('@tensorflow/tfjs');
require('@tensorflow/tfjs-node');

const jpeg = require('jpeg-js');

const { createCanvas, Image } = require('canvas');

const fs = require('fs')

const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.cloud_name,
  api_key: process.env.api_key,
  api_secret: process.env.api_secret
});

let data = JSON.parse(fs.readFileSync('./backend/data.json', 'utf8'));

const request = require('request');

const imageScaleFactor = 0.5;
const outputStride = 16;
const flipHorizontal = false;

async function estimatePoseOnImage(imageElement) {
  // load the posenet model from a checkpoint
  const net = await posenet.load();

  const pose = await net.estimateSinglePose(imageElement, imageScaleFactor, flipHorizontal, outputStride);
  console.log(pose)

  return pose;
}

const delay = ms => new Promise(res => setTimeout(res, ms));



const imageByteArray = (image, numChannels) => {
  console.time('imageByteArray');
  const pixels = image.data
  const numPixels = image.width * image.height;
  const values = new Int32Array(numPixels * numChannels);

  for (let i = 0; i < numPixels; i++) {
    for (let channel = 0; channel < numChannels; ++channel) {
      values[i * numChannels + channel] = pixels[i * 4 + channel];
    }
  }

  return values
}

const memoryUsage = () => {
  let used = process.memoryUsage();
  const values = []
  for (let key in used) {
    values.push(`${key}=${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
  }

  return `memory used: ${values.join(', ')}`
}

const logTimeAndMemory = label => {
  console.timeEnd(label)
  console.log(memoryUsage())
}

const decodeImage = source => {
  console.time('decodeImage');
  const buf = Buffer.from(source, 'base64')
  const pixels = jpeg.decode(buf, true);
  console.log('Pixels', pixels)
  logTimeAndMemory('decodeImage')
  return pixels
}

const imageToInput = (image, numChannels) => {
  console.time('imageToInput');
  const values = imageByteArray(image, numChannels)

  const outShape = [image.height, image.width, numChannels];
  const input = tf.tensor3d(values, outShape, 'int32');

  logTimeAndMemory('imageToInput')
  return input
}


var download = function (uri, isUpa = true) {
  request.head(uri, function (err, res, body) {

    let name = ''
    let matricula = ''
    let fullname = ''




    if (isUpa) {
      name = res.headers['content-disposition'];

      let isDisponible = name.split("=")[name.split("=").length - 1]
      isDisponible = isDisponible.toLowerCase().replace(';', '')

      if ("nodisponible.jpg" === isDisponible) {
        console.log("No disponible")
        return 0
      }




      matricula = name.split('=')[1].split(' ')[0];
      fullname = res.headers['content-disposition'].split('=')[1]
      fullname = fullname.toLowerCase().replace(';', '')



    } else {

      fullname = uri.split('/')[uri.split('/').length - 1]

    }


    request(uri).pipe(fs.createWriteStream(fullname)).on('close', () => {
      cloudinary.uploader.upload('./' + fullname, (error, result) => {
        if (error) {
          console.log(error)
        } else {
          fs.readFile('./' + fullname, async function (err, squid) {
            if (err) throw err;



            const image = decodeImage(squid)
            const input = imageToInput(image, 3)

            const pose = await estimatePoseOnImage(input);

            console.log(result)
            console.log(pose.score)

            result.score = pose.score
            result.keypoints = pose.keypoints

            data = data.result.concat(result)



            const content = JSON.stringify(data);

            const r = '{ "result" : ' + content + ' }'

            fs.writeFileSync('./backend/data.json', r);


          });


        }
      });
    }

    );

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


  const urlM = 'http://www.dronica360.es/images/category_41/Missguided%20FRILL%20FRONT%20BODY%20-%20Top%20-%20rose%20FG79882_0.jpg';
  

  console.log(urlM)
  //download(urlM, false);
  download(urlM, false);



}

main()

