
goog.require('X.renderer3D')
goog.require('X.renderer2D')
goog.require('X.mesh')

async function readJSON(file, slice) {
  var loaded_data
  await $.getJSON(file, function (json) {
    loaded_data = json.slices[slice]
  })

  return loaded_data
}

function hex(c) {
  var s = "0123456789abcdef";
  var i = parseInt(c);
  if (i == 0 || isNaN(c))
    return "00";
  i = Math.round(Math.min(Math.max(0, i), 255));
  return s.charAt((i - i % 16) / 16) + s.charAt(i % 16);
}

/* Convert an RGB triplet to a hex string */
function convertToHex(rgb) {
  return hex(rgb[0]) + hex(rgb[1]) + hex(rgb[2]);
}

/* Remove '#' in color hex string */
function trim(s) { return (s.charAt(0) == '#') ? s.substring(1, 7) : s }

/* Convert a hex string to an RGB triplet */
function convertToRGB(hex) {
  var color = [];
  color[0] = parseInt((trim(hex)).substring(0, 2), 16);
  color[1] = parseInt((trim(hex)).substring(2, 4), 16);
  color[2] = parseInt((trim(hex)).substring(4, 6), 16);
  return color;
}

function generateColor(colorStart, colorEnd, colorCount) {

  // The beginning of your gradient
  var start = convertToRGB(colorStart);

  // The end of your gradient
  var end = convertToRGB(colorEnd);

  // The number of colors to compute
  var len = colorCount;

  //Alpha blending amount
  var alpha = 0.0;

  var saida = [];

  for (i = 0; i < len; i++) {
    var c = [];
    alpha += (1.0 / len);

    c[0] = start[0] * alpha + (1 - alpha) * end[0];
    c[1] = start[1] * alpha + (1 - alpha) * end[1];
    c[2] = start[2] * alpha + (1 - alpha) * end[2];

    saida.push(c);

  }

  return saida;

}

var tmp = generateColor('#000000', '#ff0ff0', 10);

function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

async function readTextFile(file, _callback) {
  var rawFile = new XMLHttpRequest();
  rawFile.open("GET", file, false);
  rawFile.onreadystatechange = function () {
    if (rawFile.readyState === 4) {
      if (rawFile.status === 200 || rawFile.status == 0) {
        var allText = rawFile.responseText;
        let strings = allText.split("\n")

        // strings -  массив строк-координат вида "003 -13.56107 -100.80030 -4.76664 2.75910"
        _callback(strings)
      }
    }
  }
  rawFile.send(null);
}

window.onload = function () {
  //
  // try to create the 3D renderer
  //
  _webGLFriendly = true;
  try {
    // try to create and initialize a 3D renderer
    threeD = new X.renderer3D();
    threeD.container = '3d';
    threeD.init()

  } catch (Exception) {

    // no webgl on this machine
    _webGLFriendly = false;

  }

  sliceX = new X.renderer2D();

  sliceX.container = 'sliceX';
  sliceX.orientation = 'X';
  sliceX.init();
  var slicex_interactor = sliceX.interactor
  // sliceX.interactor.onMouseDown = function ($LEFT, $MIDDLE, $RIGHT) {
  //   console.log(slicex_interactor.mousePosition)
  // }

  // .. for Y
  var sliceY = new X.renderer2D();
  sliceY.container = 'sliceY';
  sliceY.orientation = 'Y';
  sliceY.init();
  // .. and for Z
  var sliceZ = new X.renderer2D();
  sliceZ.container = 'sliceZ';
  sliceZ.orientation = 'Z';
  sliceZ.init();

  // readJSON("static/data/slicesZ.json", 127)
  // .then((loaded_data) => {
  //   loaded_data.vertexes.forEach(v => {
  //     console.log(sliceZ.xy2ijk(v.x, v.y))
  //   });
  // })
  var radius = 1
  var radiusArray = [-1, 0, 1]
  console.log(radiusArray)

  function xy2buff(x, y) {
    return (x + y * 255) * 4
  }

  // blue to red
  let colors = generateColor("#0000ff", "#ff0000", 60)
  // green to red
  // let colors = generateColor("#00ff00", "#ff0000", 6)

  console.log(colors)

  function updateThicknessZ(slice) {

    readJSON("static/data/slicesZ.json", slice)
      .then((loaded_data) => {
        sliceZ.canvasTransformer = function (data) {
          loaded_data.vertexes.forEach(v => {

            var p_x = Math.round(v.x)
            var p_y = Math.round(v.y)

            radiusArray.forEach(c_y => {
              radiusArray.forEach(c_x => {
                if (c_x * c_x + c_y * c_y <= radius * radius) {
                  p_index = xy2buff(p_x + c_x, p_y + c_y)
                  // opacity
                  data[p_index] = 255
                  // red
                  data[p_index + 1] = colors[Math.round(v.thickness * 10)][0]
                  // green
                  data[p_index + 2] = colors[Math.round(v.thickness * 10)][1]
                  // blue
                  data[p_index + 3] = colors[Math.round(v.thickness * 10)][2]
                }
              });
            });

            // for(var c_y = radius * -1; c_y <= radius; c_y++) {
            //   for(var c_x = radius * -1; c_y <= radius; c_x++) {
            //     if(c_x*c_x+c_y*c_y <= radius*radius) {
            //       p_index = xy2buff(p_x + c_x, p_y + c_y)
            //       // red channel
            //       data[p_index] = 255
            //       data[p_index + 3] = 255
            //     }
            //   } 
            // }
            // console.log(v)

            // var index = xy2buff(p_x, p_y)
            // data[index] = 255
            // data[index + 3] = 255
          })
        }
      })
  }

  function updateThicknessY(slice) {

    readJSON("static/data/slicesY.json", slice)
      .then((loaded_data) => {
        sliceZ.canvasTransformer = function (data) {
          loaded_data.vertexes.forEach(v => {

            var p_x = Math.round(v.x)
            var p_y = Math.round(v.z)

            radiusArray.forEach(c_y => {
              radiusArray.forEach(c_x => {
                if (c_x * c_x + c_y * c_y <= radius * radius) {
                  p_index = xy2buff(p_x + c_x, p_y + c_y)
                  // opacity
                  data[p_index] = 255
                  // red
                  data[p_index + 1] = colors[Math.round(v.thickness * 10)][0]
                  // green
                  data[p_index + 2] = colors[Math.round(v.thickness * 10)][1]
                  // blue
                  data[p_index + 3] = colors[Math.round(v.thickness * 10)][2]
                }
              });
            });
          })
        }
      })
  }

  function updateThicknessX(slice) {

    readJSON("static/data/slicesX.json", slice)
      .then((loaded_data) => {
        sliceZ.canvasTransformer = function (data) {
          loaded_data.vertexes.forEach(v => {

            var p_x = Math.round(v.y)
            var p_y = Math.round(v.z)

            radiusArray.forEach(c_y => {
              radiusArray.forEach(c_x => {
                if (c_x * c_x + c_y * c_y <= radius * radius) {
                  p_index = xy2buff(p_x + c_x, p_y + c_y)
                  // opacity
                  data[p_index] = 255
                  // red
                  data[p_index + 1] = colors[Math.round(v.thickness * 10)][0]
                  // green
                  data[p_index + 2] = colors[Math.round(v.thickness * 10)][1]
                  // blue
                  data[p_index + 3] = colors[Math.round(v.thickness * 10)][2]
                }
              });
            });
          })
        }
      })
  }

  updateThicknessX(127)
  updateThicknessY(127)
  updateThicknessZ(127)

  //
  // THE VOLUME DATA
  //
  volume = new X.volume();
  // .. and attach the single-file dicom in .NRRD format
  // this works with gzip/gz/raw encoded NRRD files but XTK also supports other
  // formats like MGH/MGZ
  // volume.file = 'static/data/orig.mgz';
  // volume.file = 'static/data/wm.mgz';
  volume.file = 'static/data/brain.mgz';
  // volume.file = 'static/data/referenceT1.nii';

  sliceX.add(volume);
  sliceX.render();

  function tryRenderPoints3D() {
    text = readTextFile("static/data/lh.thickness.asc", function (text) {
      points = new X.object();
      for (let i = 0; i < text.length; i += 200) {
        let px = text[i].split(" ")[1]
        let py = text[i].split(" ")[2]
        let pz = text[i].split(" ")[3]

        var newSphere = new X.sphere();
        newSphere.center = [px, py, pz];
        newSphere.radius = 0.7;
        newSphere.magicmode = true; // it's magic..
        newSphere.modified(); // since we don't directly add the sphere, we have to
        // call the CSG creator manually

        // .. add the newSphere to our container
        points.children.push(newSphere);
      }
      threeD.add(points)
    })
  }
  // tryRenderPoints()


  //
  // THE GUI
  //
  sliceX.onShowtime = function () {
    sliceY.add(volume);
    sliceY.render();
    sliceZ.add(volume);
    sliceZ.render();

    if (_webGLFriendly) {
      threeD.add(volume);

      var p = new X.mesh();

      function testRenderLhPial() {
        p.file = 'static/data/lh.pial';

        threeD.add(p);
      }
      // testRenderLhPial()

      threeD.render();
    }

    function setupGUI() {
      // now the real GUI
      var gui = new dat.GUI();

      // the following configures the gui for interacting with the X.volume
      var volumegui = gui.addFolder('Volume');
      // now we can configure controllers which..
      // .. switch between slicing and volume rendering
      var vrController = volumegui.add(volume, 'volumeRendering');
      // .. configure the volume rendering opacity
      var opacityController = volumegui.add(volume, 'opacity', 0, 1);
      // .. and the threshold in the min..max range
      var lowerThresholdController = volumegui.add(volume, 'lowerThreshold',
        volume.min, volume.max);
      var upperThresholdController = volumegui.add(volume, 'upperThreshold',
        volume.min, volume.max);
      var lowerWindowController = volumegui.add(volume, 'windowLow', volume.min,
        volume.max);
      var upperWindowController = volumegui.add(volume, 'windowHigh', volume.min,
        volume.max);
      // the indexX,Y,Z are the currently displayed slice indices in the range
      // 0..dimensions-1
      var sliceXController = volumegui.add(volume, 'indexX', 0,
        volume.range[0] - 1);
      var sliceYController = volumegui.add(volume, 'indexY', 0,
        volume.range[1] - 1);
      var sliceZController = volumegui.add(volume, 'indexZ', 0,
        volume.range[2] - 1);

      sliceXController.onChange(function (value) {
        updateThicknessX(Math.round(value))
      })
      sliceYController.onChange(function (value) {
        updateThicknessY(Math.round(value))
      })
      sliceZController.onChange(function (value) {
        updateThicknessZ(Math.round(value))
      })

      volumegui.open();
    }
    setupGUI()
    console.log("(127, 127) to ijk")
    console.log(sliceZ.xy2ijk(127, 127))
  }
};
