
goog.require('X.renderer3D')
goog.require('X.renderer2D')
goog.require('X.mesh')

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
  sliceX.canvasTransformer = function(x) {
    console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAA")
    return x
  }
  
  sliceX.container = 'sliceX';
  sliceX.orientation = 'X';
  sliceX.init();
  var slicex_interactor = sliceX.interactor
  sliceX.interactor.onMouseDown = function ($LEFT, $MIDDLE, $RIGHT) {
    console.log(slicex_interactor.mousePosition)
  }

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

  sliceX.add(volume);

  function tryRender2DPoints() {
    var points2d = new X.object();
    points2d.type = 'POINTS';

    for (let i = -122; i < 132; i++) {
      var test_point = new X.sphere();
      test_point.center = [i, 0, 0];
      test_point.radius = 1;
      test_point.magicmode = true; // it's magic..
      test_point.modified();
      points2d.children.push(test_point)
    }
    threeD.add(points2d)
    sliceX.add(points2d)
  }
  // tryRender2DPoints()

  sliceX.render();

  function tryRenderPoints() {
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
      volumegui.open();
    }
    setupGUI()
  }
};
