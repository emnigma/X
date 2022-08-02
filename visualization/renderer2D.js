/*
 *
 *                  xxxxxxx      xxxxxxx
 *                   x:::::x    x:::::x
 *                    x:::::x  x:::::x
 *                     x:::::xx:::::x
 *                      x::::::::::x
 *                       x::::::::x
 *                       x::::::::x
 *                      x::::::::::x
 *                     x:::::xx:::::x
 *                    x:::::x  x:::::x
 *                   x:::::x    x:::::x
 *              THE xxxxxxx      xxxxxxx TOOLKIT
 *
 *                  http://www.goXTK.com
 *
 * Copyright (c) 2012 The X Toolkit Developers <dev@goXTK.com>
 *
 *    The X Toolkit (XTK) is licensed under the MIT License:
 *      http://www.opensource.org/licenses/mit-license.php
 * 
 *
 * 
 *
 */

// provides
goog.provide('X.renderer2D');
// requires
goog.require('X.renderer');
goog.require('goog.math.Vec3');
goog.require('goog.vec.Vec4');


/**
 * Create a 2D renderer inside a given DOM Element.
 *
 * @constructor
 * @extends X.renderer
 */
X.renderer2D = function() {

  //
  // call the standard constructor of X.renderer
  goog.base(this);

  //
  // class attributes

  /**
   * @inheritDoc
   * @const
   */
  this._classname = 'renderer2D';

  /**
   * The orientation of this renderer.
   *
   * @type {?string}
   * @protected
   */
  this._orientation = null;

  /**
   * The orientation index in respect to the
   * attached volume and its scan direction.
   *
   * @type {!number}
   * @protected
   */
  this._orientationIndex = -1;

  /**
   * The array of orientation colors.
   *
   * @type {!Array}
   * @protected
   */
  this._orientationColors = [];

  /**
   * A frame buffer for slice data.
   *
   * @type {?Element}
   * @protected
   */
  this._frameBuffer = null;

  /**
   * The rendering context of the slice frame buffer.
   *
   * @type {?Object}
   * @protected
   */
  this._frameBufferContext = null;

  /**
   * A frame buffer for label data.
   *
   * @type {?Element}
   * @protected
   */
  this._labelFrameBuffer = null;

  /**
   * The rendering context of the label frame buffer.
   *
   * @type {?Object}
   * @protected
   */
  this._labelFrameBufferContext = null;

  /**
   * The current slice width.
   *
   * @type {number}
   * @protected
   */
  this._sliceWidth = 0;

  /**
   * The current slice height.
   *
   * @type {number}
   * @protected
   */
  this._sliceHeight = 0;

  /**
   * The current slice width spacing.
   *
   * @type {number}
   * @protected
   */
  this._sliceWidthSpacing = 0;

  /**
   * The current slice height spacing.
   *
   * @type {number}
   * @protected
   */
  this._sliceHeightSpacing = 0;

  /**
   * The buffer of the current slice index.
   *
   * @type {!number}
   * @protected
   */
  this._currentSlice = -1;

  /**
   * The buffer of the current lower threshold.
   *
   * @type {!number}
   * @protected
   */
  this._lowerThreshold = -1;

  /**
   * The buffer of the current upper threshold.
   *
   * @type {!number}
   * @protected
   */
  this._upperThreshold = -1;

  /**
   * The buffer of the current w/l low value.
   *
   * @type {!number}
   * @protected
   */
  this._windowLow = -1;

  /**
   * The buffer of the current w/l high value.
   *
   * @type {!number}
   * @protected
   */
  this._windowHigh = -1;

  /**
   * The buffer of the showOnly labelmap color.
   *
   * @type {!Float32Array}
   * @protected
   */
  this._labelmapShowOnlyColor = new Float32Array([-255, -255, -255, -255]);

  /**
   * The convention we follow to draw the 2D slices. TRUE for RADIOLOGY, FALSE for NEUROLOGY.
   *
   * @type {!boolean}
   * @protected
   */
  this._radiological = true;

  this._normalizedScale = 1;

  this.canvasTransformer = function(image) { return image };

};
// inherit from X.base
goog.inherits(X.renderer2D, X.renderer);

/**
 * @inheritDoc
 */
X.renderer2D.prototype.remove = function(object) {

  // call the remove_ method of the superclass
  goog.base(this, 'remove', object);

  this._objects.remove(object);

  return true;

};
/**
 * Overload this function to execute code after scrolling has completed and just
 * before the next rendering call.
 *
 * @public
 */
X.renderer2D.prototype.onScroll = function() {

  // do nothing
};


/**
 * Overload this function to execute code after window/level adjustment has
 * completed and just before the next rendering call.
 *
 * @public
 */
X.renderer2D.prototype.onWindowLevel = function() {

  // do nothing
};


/**
 * @inheritDoc
 */
X.renderer2D.prototype.onScroll_ = function(event) {

  goog.base(this, 'onScroll_', event);

  // grab the current volume
  var _volume = this._topLevelObjects[0];

  // .. if there is none, exit right away
  if (!_volume) {

    return;

  }

  // switch between different orientations
  var _orientation = "";

  if (this._orientationIndex == 0) {

    _orientation = "indexX";

  } else if (this._orientationIndex == 1) {

    _orientation = "indexY";

  } else {

    _orientation = "indexZ";

  }

  if (event._up) {

    // yes, scroll up
    _volume[_orientation] = _volume[_orientation] + 1;

  } else {

    // yes, so scroll down
    _volume[_orientation] = _volume[_orientation] - 1;

  }

  // execute the callback
  eval('this.onScroll();');

  // .. and trigger re-rendering
  // this.render_(false, false);
};


/**
 * Performs window/level adjustment for the currently loaded volume.
 *
 * @param {!X.event.WindowLevelEvent} event The window/level event from the
 *          camera.
 */
X.renderer2D.prototype.onWindowLevel_ = function(event) {

  // grab the current volume
  var _volume = this._topLevelObjects[0];

  // .. if there is none, exit right away
  if (!_volume) {
    return;
  }

  // update window level
  var _old_window = _volume._windowHigh - _volume._windowLow;
  var _old_level = _old_window / 2;

  // shrink/expand window
  var _new_window = parseInt(_old_window + (_old_window / 15) * -event._window,
      10);

  // increase/decrease level
  var _new_level = parseInt(_old_level + (_old_level / 15) * event._level, 10);

  // TODO better handling of these cases
  if (_old_window == _new_window) {
    _new_window++;
  }
  if (_old_level == _new_level) {
    _new_level++;
  }

  // re-propagate
  _volume._windowLow -= parseInt(_old_level - _new_level, 10);
  _volume._windowLow -= parseInt(_old_window - _new_window, 10);
  _volume._windowLow = Math.max(_volume._windowLow, _volume._min);
  _volume._windowHigh -= parseInt(_old_level - _new_level, 10);
  _volume._windowHigh += parseInt(_old_window - _new_window, 10);
  _volume._windowHigh = Math.min(_volume._windowHigh, _volume._max);

  // execute the callback
  eval('this.onWindowLevel();');

};


/**
 * Get the orientation of this renderer. Valid orientations are 'x','y','z' or
 * null.
 *
 * @return {?string} The orientation of this renderer.
 */
X.renderer2D.prototype.__defineGetter__('orientation', function() {

  return this._orientation;

});


/**
 * Set the orientation for this renderer. Valid orientations are 'x','y' or 'z' or 'axial',
 * 'sagittal' or 'coronal'.
 *
 * AXIAL == Z
 * SAGITTAL == X
 * CORONAL == Y
 *
 * @param {!string} orientation The orientation for this renderer: 'x','y' or
 *          'z' or 'axial', 'sagittal' or 'coronal'.
 * @throws {Error} An error, if the given orientation was wrong.
 */
X.renderer2D.prototype.__defineSetter__('orientation', function(orientation) {

  orientation = orientation.toUpperCase();

  if (orientation == 'AXIAL') {

    orientation = 'Z';
    this._orientationIndex = 2;

  } else if (orientation == 'SAGITTAL') {

    orientation = 'X';
    this._orientationIndex = 0;

  } else if (orientation == 'CORONAL') {

    orientation = 'Y';
    this._orientationIndex = 1;

  }

  if (orientation != 'X' && orientation != 'Y' && orientation != 'Z') {

    throw new Error('Invalid orientation.');

  }

  this._orientation = orientation;

  var _volume = this._topLevelObjects[0];

});


/**
 * Get the convention of this renderer.
 *
 * @return {!boolean} TRUE if the RADIOLOGY convention is used, FALSE if the
 *                    NEUROLOGY convention is used.
 */
X.renderer2D.prototype.__defineGetter__('radiological', function() {

  return this._radiological;

});

X.renderer2D.prototype.__defineGetter__('normalizedScale', function() {

  return this._normalizedScale;

});

X.renderer2D.prototype.__defineGetter__('canvasWidth', function() {

  return this._canvas.width;

});

X.renderer2D.prototype.__defineGetter__('canvasHeight', function() {

  return this._canvas.height;

});

X.renderer2D.prototype.__defineGetter__('sliceWidth', function() {

  return this._sliceWidth;

});

X.renderer2D.prototype.__defineGetter__('sliceHeight', function() {

  return this._sliceHeight;

});


/**
 * Set the convention for this renderer. There is a difference between radiological and neurological
 * convention in terms of treating the coronal left and right.
 *
 * Default is the radiological convention.
 *
 * @param {!boolean} radiological TRUE if the RADIOLOGY convention is used, FALSE if the
 *                                NEUROLOGY convention is used.
 */
X.renderer2D.prototype.__defineSetter__('radiological', function(radiological) {

  this._radiological = radiological;

});


/**
 * @inheritDoc
 */
X.renderer2D.prototype.init = function() {

  // make sure an orientation is configured
  if (!this._orientation) {

    throw new Error('No 2D orientation set.');

  }

  // call the superclass' init method
  goog.base(this, 'init', '2d');

  // use the background color of the container by setting transparency here
  this._context.fillStyle = "rgba(50,50,50,0)";

  // .. and size
  this._context.fillRect(0, 0, this._canvas.width, this._canvas.height);

  // create an invisible canvas as a framebuffer
  this._frameBuffer = goog.dom.createDom('canvas');
  this._labelFrameBuffer = goog.dom.createDom('canvas');

  //
  //
  // try to apply nearest-neighbor interpolation -> does not work right now
  // so we ignore it
  // this._labelFrameBuffer.style.imageRendering = 'optimizeSpeed';
  // this._labelFrameBuffer.style.imageRendering = '-moz-crisp-edges';
  // this._labelFrameBuffer.style.imageRendering = '-o-crisp-edges';
  // this._labelFrameBuffer.style.imageRendering = '-webkit-optimize-contrast';
  // this._labelFrameBuffer.style.imageRendering = 'optimize-contrast';
  // this._labelFrameBuffer.style.msInterpolationMode = 'nearest-neighbor';
    this._labelFrameBuffer.style.imageRendering = 'pixelated';

  // listen to window/level events of the camera
  goog.events.listen(this._camera, X.event.events.WINDOWLEVEL,
      this.onWindowLevel_.bind(this));

};


/**
 * @inheritDoc
 */
X.renderer2D.prototype.onResize_ = function() {

  // call the super class
  goog.base(this, 'onResize_');

  // in 2D we also want to perform auto scaling
  this.autoScale_();

};


/**
 * @inheritDoc
 */
X.renderer2D.prototype.resetViewAndRender = function() {

  // call the super class
  goog.base(this, 'resetViewAndRender');

  // .. and perform auto scaling
  this.autoScale_();

  // .. and reset the window/level
  var _volume = this._topLevelObjects[0];

  // .. if there is none, exit right away
  if (_volume) {

    _volume._windowHigh = _volume._max;
    _volume._windowLow = _volume._min;

  }
  // .. render
  // this.render_(false, false);
};


/**
 * Convenience method to get the index of the volume container for a given
 * orientation.
 *
 * @param {?string} targetOrientation The orientation required.
 * @return {!number} The index of the volume children.
 * @private
 */
X.renderer2D.prototype.volumeChildrenIndex_ = function(targetOrientation) {

  if (targetOrientation == 'X') {

    return 0;

  } else if (targetOrientation == 'Y') {


    return 1;

  } else {

    return 2;
  }
};


 /**
 * Get the existing X.object with the given id.
 * 
 * @param {!X.object} object The displayable object to setup within this
 *          renderer.
 * @public
 */
 X.renderer2D.prototype.update = function(object) {
    // update volume info
    this.update_(object);
    // force redraw
    this._currentSlice = -1;
 }

/**
 * @inheritDoc
 */
X.renderer2D.prototype.update_ = function(object) {

  // call the update_ method of the superclass
  goog.base(this, 'update_', object);

  // check if object already existed..
  var existed = false;
  if (this.get(object._id)) {

    // this means, we are updating
    existed = true;

  }

  if (!(object instanceof X.volume)) {

    // we only add volumes in the 2d renderer for now
    return;

  }

  // var id = object._id;
  // var texture = object._texture;
  var file = object._file;
  var labelmap = object._labelmap; // here we access directly since we do not
  // want to create one using the labelmap() singleton accessor

  var colortable = object._colortable;

  //
  // LABEL MAP
  //
  if (goog.isDefAndNotNull(labelmap) && goog.isDefAndNotNull(labelmap._file) &&
      labelmap._file._dirty) {

    // a labelmap file is associated to this object and it is dirty..
    // background: we always want to parse label maps first
    // run the update_ function on the labelmap object

    this.update_(labelmap);

    // jump out
    return;

  }

  //
  // COLOR TABLE
  //
  if (goog.isDefAndNotNull(colortable) &&
      goog.isDefAndNotNull(colortable._file) && colortable._file._dirty) {

    // a colortable file is associated to this object and it is dirty..
    // start loading
    this._loader.load(colortable, object);

    return;

  }

  //
  // VOLUME
  //
  // with multiple files
  if (goog.isDefAndNotNull(file) && goog.isArray(file)) {

    // this object holds multiple files, a.k.a it is a DICOM series
    // check if we already loaded all the files
    if (!goog.isDefAndNotNull(object.MRI)) {

      // no files loaded at all, start the loading
      var _k = 0;
      var _len = file.length;

      for (_k = 0; _k < _len; _k++) {

        // start loading of each file..
        this._loader.load(file[_k], object);

      }

      return;

    } else if (object.MRI.loaded_files != file.length) {

      // still loading
      return;

    }

    // just continue

  }

  // with one file
  else if (goog.isDefAndNotNull(file) && file._dirty) {

    // this object is based on an external file and it is dirty..
    // start loading..
    this._loader.load(object, object);

    return;

  }

  //
  // at this point the orientation of this renderer might have changed so we
  // should recalculate all the cached values

  // volume dimensions
  var _dim = object._dimensions;

  // check the orientation and store a pointer to the slices
  this._orientationIndex = this.volumeChildrenIndex_(this._orientation);

  // size
  this._slices = object._children[this._orientationIndex]._children;

  var _currentSlice = null;
  if (this._orientationIndex == 0) {

    _currentSlice = object['indexX'];

  } else if (this._orientationIndex == 1) {

    _currentSlice = object['indexY'];

  } else {

    _currentSlice = object['indexZ'];

  }

  var _width = object._children[this._orientationIndex]._children[_currentSlice]._iWidth;
  var _height = object._children[this._orientationIndex]._children[_currentSlice]._iHeight;
  // spacing
  this._sliceWidthSpacing = object._children[this._orientationIndex]._children[_currentSlice]._widthSpacing;
  this._sliceHeightSpacing = object._children[this._orientationIndex]._children[_currentSlice]._heightSpacing;

  // .. and store the dimensions
  this._sliceWidth = _width;
  this._sliceHeight = _height;

  // update the invisible canvas to store the current slice
  var _frameBuffer = this._frameBuffer;
  _frameBuffer.width = _width;
  _frameBuffer.height = _height;

  var _frameBuffer2 = this._labelFrameBuffer;
  _frameBuffer2.width = _width;
  _frameBuffer2.height = _height;

  // .. and the context
  this._frameBufferContext = _frameBuffer.getContext('2d');
  this._labelFrameBufferContext = _frameBuffer2.getContext('2d');

  // do the following only if the object is brand-new
  if (!existed) {

    this._objects.add(object);
    this.autoScale_();

  }

};


/**
 * Adjust the zoom (scale) to best fit the current slice.
 */
X.renderer2D.prototype.autoScale_ = function() {

  // let's auto scale for best fit
  var _wScale = this._width / (this._sliceWidth * this._sliceWidthSpacing);
  var _hScale = this._height / (this._sliceHeight * this._sliceHeightSpacing);

  var _autoScale = Math.min(_wScale, _hScale);

  // propagate scale (zoom) to the camera
  var _view = this._camera._view;
  _view[14] = _autoScale;

};


/**
 * Callback for slice navigation, f.e. to update sliders.
 *
 * @public
 */
X.renderer2D.prototype.onSliceNavigation = function() {

  // should be overloaded

};


/**
 * Convert viewport (canvas) coordinates to volume (index) coordinates.
 *
 * @param x The x coordinate.
 * @param y The y coordinate.
 * @return {?Array} An array of [i,j,k] coordinates or null if out of frame.
 */
X.renderer2D.prototype.xy2ijk = function(x, y) {

  // un-zoom and un-offset
  // there get coordinates in a normla view

  var _volume = this._topLevelObjects[0];
  var _view = this._camera._view;
  var _currentSlice = null;

  var _sliceWidth = this._sliceWidth;
  var _sliceHeight = this._sliceHeight;
  var _sliceWSpacing = null;
  var _sliceHSpacing = null;

  // get current slice
  // which color?
  if (this._orientation == "Y") {
    _currentSlice = this._slices[parseInt(_volume['indexY'], 10)];
    _sliceWSpacing = _currentSlice._widthSpacing;
    _sliceHSpacing = _currentSlice._heightSpacing;
    this._orientationColors[0] = 'rgba(255,0,0,.3)';
    this._orientationColors[1] = 'rgba(0,0,255,.3)';

  } else if (this._orientation == "Z") {
    _currentSlice = this._slices[parseInt(_volume['indexZ'], 10)];
    _sliceWSpacing = _currentSlice._widthSpacing;
    _sliceHSpacing = _currentSlice._heightSpacing;
    this._orientationColors[0] = 'rgba(255,0,0,.3)';
    this._orientationColors[1] = 'rgba(0,255,0,.3)';

  } else {
    _currentSlice = this._slices[parseInt(_volume['indexX'], 10)];
    _sliceWSpacing = _currentSlice._heightSpacing;
    _sliceHSpacing = _currentSlice._widthSpacing;
    this._orientationColors[0] = 'rgba(0,255,0,.3)';
    this._orientationColors[1] = 'rgba(0,0,255,.3)';

    var _buf = _sliceWidth;
    _sliceWidth = _sliceHeight;
    _sliceHeight = _buf;
  }

  // padding offsets
  var _x = 1 * _view[12];
  var _y = -1 * _view[13]; // we need to flip y here

  // .. and zoom
  var _center = [this._width / 2, this._height / 2];

  // the slice dimensions in canvas coordinates
  var _sliceWidthScaled = _sliceWidth * _sliceWSpacing *
    this._normalizedScale;
  var _sliceHeightScaled = _sliceHeight * _sliceHSpacing *
    this._normalizedScale;

  // the image borders on the left and top in canvas coordinates
  var _image_left2xy = _center[0] - (_sliceWidthScaled / 2);
  var _image_top2xy = _center[1] - (_sliceHeightScaled / 2);

  // incorporate the padding offsets (but they have to be scaled)
  _image_left2xy += _x * this._normalizedScale;
  _image_top2xy += _y * this._normalizedScale;

  if(x>_image_left2xy && x < _image_left2xy + _sliceWidthScaled &&
    y>_image_top2xy && y < _image_top2xy + _sliceHeightScaled){

    var _xNorm = (x - _image_left2xy)/ _sliceWidthScaled;
    var _yNorm = (y - _image_top2xy)/ _sliceHeightScaled;

    _x = _xNorm*_sliceWidth;
    _y = _yNorm*_sliceHeight;
    var _z = _currentSlice._xyBBox[4];

    if (this._orientation == "X") {
      // invert cols
      // then invert x and y to compensate camera +90d rotation
      _x = _sliceWidth - _x;

      var _buf = _x;
      _x = _y;
      _y = _buf;

    }
    else if (this._orientation == "Y") {

      // invert cols
      _x = _sliceWidth - _x;

    }
    else if (this._orientation == "Z") {

      // invert all
      _x = _sliceWidth - _x;
      _y = _sliceHeight - _y;

    }

    // map indices to xy coordinates
    _x = _currentSlice._wmin + _x*_currentSlice._widthSpacing;// - _currentSlice._widthSpacing/2;
    _y = _currentSlice._hmin + _y*_currentSlice._heightSpacing;// - _currentSlice._heightSpacing/2;

    var _xyz = goog.vec.Vec4.createFloat32FromValues(_x, _y, _z, 1);
    var _ijk = goog.vec.Mat4.createFloat32();
    goog.vec.Mat4.multVec4(_currentSlice._XYToIJK, _xyz, _ijk);

    _ijk = [Math.floor(_ijk[0]),Math.floor(_ijk[1]),Math.floor(_ijk[2])];
    // why < 0??
    var _ras = goog.vec.Mat4.createFloat32();
    goog.vec.Mat4.multVec4(_currentSlice._XYToRAS, _xyz, _ras);

    var _dx = _volume._childrenInfo[0]._sliceNormal[0]*_ras[0]
      + _volume._childrenInfo[0]._sliceNormal[1]*_ras[1]
      + _volume._childrenInfo[0]._sliceNormal[2]*_ras[2]
      + _volume._childrenInfo[0]._originD;

    var _ix = Math.round(_dx/_volume._childrenInfo[0]._sliceSpacing);
     if(_ix >= _volume._childrenInfo[0]._nb){
       _ix = _volume._childrenInfo[0]._nb - 1;
     }
     else if(_ix < 0){
       _ix = 0;
      }


    var _dy = _volume._childrenInfo[1]._sliceNormal[0]*_ras[0]
      + _volume._childrenInfo[1]._sliceNormal[1]*_ras[1]
      + _volume._childrenInfo[1]._sliceNormal[2]*_ras[2]
      + _volume._childrenInfo[1]._originD;

    var _iy = Math.round(_dy/_volume._childrenInfo[1]._sliceSpacing);
    if(_iy >= _volume._childrenInfo[1]._nb){
       _iy = _volume._childrenInfo[1]._nb - 1;
    }
    else if(_iy < 0) {
      _iy = 0;
    }

    // get plane distance from the origin
    var _dz = _volume._childrenInfo[2]._sliceNormal[0]*_ras[0]
      + _volume._childrenInfo[2]._sliceNormal[1]*_ras[1]
      + _volume._childrenInfo[2]._sliceNormal[2]*_ras[2]
      + _volume._childrenInfo[2]._originD;

    var _iz = Math.round(_dz/_volume._childrenInfo[2]._sliceSpacing);
    if(_iz >= _volume._childrenInfo[2]._nb){
      _iz = _volume._childrenInfo[2]._nb - 1;
    }
    else if(_iz < 0){
      // translate origin by distance
      _iz = 0;
    }

    return [[_ix, _iy, _iz], [_ijk[0], _ijk[1], _ijk[2]], [_ras[0], _ras[1], _ras[2]]];
    }

  return null;
};


/**
 * @inheritDoc
 */
X.renderer2D.prototype.render_ = function(picking, invoked) {
  // call the render_ method of the superclass
  goog.base(this, 'render_', picking, invoked);

  // only proceed if there are actually objects to render
  var _objects = this._objects.values();

  var _numberOfObjects = _objects.length;
  if (_numberOfObjects == 0) {

    // there is nothing to render
    // get outta here
    return;

  }

  var _volume = this._topLevelObjects[0];
  var _currentSlice = null;
  if (this._orientationIndex == 0) {

    _currentSlice = _volume['indexX'];

  } else if (this._orientationIndex == 1) {

    _currentSlice = _volume['indexY'];

  } else {

    _currentSlice = _volume['indexZ'];

  }
  
  //if slice do not exist yet, we have to set slice dimensions
  var _width2 = this._slices[parseInt(_currentSlice, 10)]._iWidth;
  var _height2 = this._slices[parseInt(_currentSlice, 10)]._iHeight;
  // spacing
  this._sliceWidthSpacing = this._slices[parseInt(_currentSlice, 10)]._widthSpacing;
  this._sliceHeightSpacing = this._slices[parseInt(_currentSlice, 10)]._heightSpacing;

  // .. and store the dimensions
  this._sliceWidth = _width2;
  this._sliceHeight = _height2;
  //
  // grab the camera settings

  //
  // viewport size
  var _width = this._width;
  var _height = this._height;

  // first grab the view matrix which is 4x4 in favor of the 3D renderer
  var _view = this._camera._view;

  // clear the canvas
  this._context.save();
  this._context.clearRect(-_width, -_height, 2 * _width, 2 * _height);
  this._context.restore();

  // transform the canvas according to the view matrix
  // .. this includes zoom
  this._normalizedScale = Math.max(_view[14], 0.0001);

  this._context.setTransform(this._normalizedScale, 0, 0, this._normalizedScale, 0, 0);

  // .. and pan
  // we need to flip y here
  var _x = 1 * _view[12];
  var _y = -1 * _view[13];
  //
  // grab the volume and current slice
  //

  var _labelmap = _volume._labelmap;
  var _labelmapShowOnlyColor = null;

  if (_labelmap) {

    // since there is a labelmap, get the showOnlyColor property
    _labelmapShowOnlyColor = _volume._labelmap._showOnlyColor;

  }

  // .. here is the current slice
  var _slice = this._slices[parseInt(_currentSlice, 10)];
  var _sliceData = _slice._texture._rawData;
  var _currentLabelMap = _slice._labelmap;
  var _labelData = null;
  if (_currentLabelMap) {

    _labelData = _currentLabelMap._rawData;

  }

  var _sliceWidth = this._sliceWidth;
  var _sliceHeight = this._sliceHeight;

  //
  // FRAME BUFFERING
  //
  var _imageFBContext = this._frameBufferContext;
  var _labelFBContext = this._labelFrameBufferContext;

  // grab the current pixels
  var _imageData = _imageFBContext
      .getImageData(0, 0, _sliceWidth, _sliceHeight);
  var _labelmapData = _labelFBContext.getImageData(0, 0, _sliceWidth,
      _sliceHeight);
  var _pixels = _imageData.data;
  var _labelPixels = _labelmapData.data;
  var _pixelsLength = _pixels.length;

  // threshold values
  var _maxScalarRange = _volume._max;
  var _lowerThreshold = _volume._lowerThreshold;
  var _upperThreshold = _volume._upperThreshold;
  var _windowLow = _volume._windowLow;
  var _windowHigh = _volume._windowHigh;

  // caching mechanism
  // we need to redraw the pixels only
  // - if the _currentSlice has changed
  // - if the threshold has changed
  // - if the window/level has changed
  // - the labelmap show only color has changed
  var _redraw_required = (this._currentSlice != _currentSlice ||
      this._lowerThreshold != _lowerThreshold ||
      this._upperThreshold != _upperThreshold ||
      this._windowLow != _windowLow || this._windowHigh != _windowHigh || (_labelmapShowOnlyColor && !X.array
      .compare(_labelmapShowOnlyColor, this._labelmapShowOnlyColor, 0, 0, 4)));

  if (_redraw_required) {
    // update FBs with new size
    // has to be there, not sure why, too slow to be in main loop?
     var _frameBuffer = this._frameBuffer;
    _frameBuffer.width = _width2;
    _frameBuffer.height = _height2;

    var _frameBuffer2 = this._labelFrameBuffer;
    _frameBuffer2.width = _width2;
    _frameBuffer2.height = _height2;

    // loop through the pixels and draw them to the invisible canvas
    // from bottom right up
    // also apply thresholding
    var _index = 0;
    do {

      // default color and label is just transparent
      var _color = [0, 0, 0, 0];
      var _label = [0, 0, 0, 0];
      var _fac1 = _volume._max - _volume._min;

      // grab the pixel intensity
      // slice data is normalized (probably shouldn't ?)
      // de-normalize it (get real value)
      var _intensity = (_sliceData[_index] / 255) * _fac1 + _volume._min;

      // apply window/level
      var _window = _windowHigh - _windowLow;
      var _level = _window/2 + _windowLow;

      var _origIntensity = 0;
      if(_intensity < _level - _window/2 ){
        _origIntensity = 0;
      }
      else if(_intensity > _level + _window/2 ){
        _origIntensity = 255;
      }
      else{
        _origIntensity  = 255 * (_intensity - (_level - _window / 2))/_window;
      }

      // apply thresholding
      if (_intensity >= _lowerThreshold && _intensity <= _upperThreshold) {

        // current intensity is inside the threshold range so use the real
        // intensity

        // map volume scalars to a linear color gradient
        var maxColor = new goog.math.Vec3(_volume._maxColor[0],
            _volume._maxColor[1], _volume._maxColor[2]);
        var minColor = new goog.math.Vec3(_volume._minColor[0],
            _volume._minColor[1], _volume._minColor[2]);
        _color = maxColor.scale(_origIntensity).add(
            minColor.scale(255 - _origIntensity));

        // .. and back to an array
        _color = [Math.floor(_color.x), Math.floor(_color.y),
                  Math.floor(_color.z), 255];

        if (_currentLabelMap) {

          // we have a label map here
          // check if all labels are shown or only one
          if (_labelmapShowOnlyColor[3] == -255) {

            // all labels are shown
            _label = [_labelData[_index], _labelData[_index + 1],
                      _labelData[_index + 2], _labelData[_index + 3]];

          } else {

            // show only the label which matches in color
            if (X.array.compare(_labelmapShowOnlyColor, _labelData, 0, _index,
                4)) {

              // this label matches
              _label = [_labelData[_index], _labelData[_index + 1],
                        _labelData[_index + 2], _labelData[_index + 3]];

            }

          }

        }

      }

      if(this._orientation == "X"){
        // invert nothing
        _pixels[_index] = _color[0]; // r
        _pixels[_index + 1] = _color[1]; // g
        _pixels[_index + 2] = _color[2]; // b
        _pixels[_index + 3] = _color[3]; // a
        _labelPixels[_index] = _label[0]; // r
        _labelPixels[_index + 1] = _label[1]; // g
        _labelPixels[_index + 2] = _label[2]; // b
        _labelPixels[_index + 3] = _label[3]; // a
      }
      else if(this._orientation == "Y"){
        // invert cols
        var row = Math.floor(_index/(_sliceWidth*4));
        var col = _index - row*_sliceWidth*4;
        var invCol = 4*(_sliceWidth-1) - col ;
        var _invertedColsIndex = row*_sliceWidth*4 + invCol;
        _pixels[_invertedColsIndex] = _color[0]; // r
        _pixels[_invertedColsIndex + 1] = _color[1]; // g
        _pixels[_invertedColsIndex + 2] = _color[2]; // b
        _pixels[_invertedColsIndex + 3] = _color[3]; // a
        _labelPixels[_invertedColsIndex] = _label[0]; // r
        _labelPixels[_invertedColsIndex + 1] = _label[1]; // g
        _labelPixels[_invertedColsIndex + 2] = _label[2]; // b
        _labelPixels[_invertedColsIndex + 3] = _label[3]; // a
      }
      else{
        // invert all
        var _invertedIndex = _pixelsLength - 1 - _index;
        _pixels[_invertedIndex - 3] = _color[0]; // r
        _pixels[_invertedIndex - 2] = _color[1]; // g
        _pixels[_invertedIndex - 1] = _color[2]; // b
        _pixels[_invertedIndex] = _color[3]; // a
        _labelPixels[_invertedIndex - 3] = _label[0]; // r
        _labelPixels[_invertedIndex - 2] = _label[1]; // g
        _labelPixels[_invertedIndex - 1] = _label[2]; // b
        _labelPixels[_invertedIndex] = _label[3]; // a
      }

      _index += 4; // increase by 4 units for r,g,b,a

    } while (_index < _pixelsLength);

    // store the generated image data to the frame buffer context
    _imageFBContext.putImageData(_imageData, 0, 0);
    _labelFBContext.putImageData(_labelmapData, 0, 0);

    const putMockLabelData = () => {
      var imgData=_imageFBContext.getImageData(0,0,255,255);
      var data=imgData.data;

      let mockData = {
        "vertexes": [
          {
            "x": 101.10997751953124,
            "y": 62.3829342993005,
            "z": 164.98936043910368,
            "thickness": 2.47953
          },
          {
            "x": 110.32492751953126,
            "y": 63.29145435366489,
            "z": 164.9626704375066,
            "thickness": 2.69795
          },
          {
            "x": 102.11031751953125,
            "y": 65.68883449712025,
            "z": 165.04225044226857,
            "thickness": 1.21645
          },
          {
            "x": 98.58764751953125,
            "y": 66.37317453807005,
            "z": 164.9738604381762,
            "thickness": 1.40918
          },
          {
            "x": 104.27253751953126,
            "y": 68.02294463678963,
            "z": 165.00617044010954,
            "thickness": 1.4428
          },
          {
            "x": 93.35897751953125,
            "y": 67.10364458178022,
            "z": 165.0007004397823,
            "thickness": 1.62728
          },
          {
            "x": 100.41048751953124,
            "y": 68.03074463725638,
            "z": 164.98796043901993,
            "thickness": 1.26886
          },
          {
            "x": 103.88109751953125,
            "y": 68.68484467639666,
            "z": 164.9681504378345,
            "thickness": 1.50182
          },
          {
            "x": 95.09492751953125,
            "y": 68.82665468488234,
            "z": 165.01579044068524,
            "thickness": 1.85812
          },
          {
            "x": 89.06860751953124,
            "y": 69.8058547434761,
            "z": 164.97950043851367,
            "thickness": 1.83802
          },
          {
            "x": 91.91480751953125,
            "y": 73.4962549643037,
            "z": 164.9595304373187,
            "thickness": 1.43107
          },
          {
            "x": 109.23316751953125,
            "y": 75.27138507052463,
            "z": 165.01083044038842,
            "thickness": 1.89339
          },
          {
            "x": 88.21624751953125,
            "y": 77.16357518375024,
            "z": 164.95798043722598,
            "thickness": 2.3549
          },
          {
            "x": 70.90392751953125,
            "y": 77.64479521254566,
            "z": 164.96365043756524,
            "thickness": 2.96943
          },
          {
            "x": 114.01554751953125,
            "y": 77.8804652266478,
            "z": 165.02754044138834,
            "thickness": 1.78076
          },
          {
            "x": 88.99171751953125,
            "y": 78.46284526149647,
            "z": 164.9688704378776,
            "thickness": 2.56803
          },
          {
            "x": 95.27415751953126,
            "y": 83.46725556095231,
            "z": 165.00446044000728,
            "thickness": 1.25815
          },
          {
            "x": 69.78434751953125,
            "y": 84.3621056144987,
            "z": 164.97539043826774,
            "thickness": 1.99299
          },
          {
            "x": 72.19645751953125,
            "y": 84.85405564393619,
            "z": 165.03477044182097,
            "thickness": 2.23649
          },
          {
            "x": 96.43872751953126,
            "y": 86.20214572460374,
            "z": 164.96853043785725,
            "thickness": 1.87959
          },
          {
            "x": 75.93507751953125,
            "y": 86.09947571846013,
            "z": 165.03110044160135,
            "thickness": 2.04089
          },
          {
            "x": 111.98067751953126,
            "y": 87.0284057740458,
            "z": 164.96415043759518,
            "thickness": 3.12772
          },
          {
            "x": 84.88766751953125,
            "y": 86.97375577077564,
            "z": 165.04610044249893,
            "thickness": 2.15592
          },
          {
            "x": 77.10181751953125,
            "y": 87.06005577593967,
            "z": 165.00075043978526,
            "thickness": 2.02497
          },
          {
            "x": 109.30685751953125,
            "y": 86.81116576104651,
            "z": 165.01125044041356,
            "thickness": 2.92848
          },
          {
            "x": 108.03733751953125,
            "y": 88.0976858380298,
            "z": 165.02497044123456,
            "thickness": 2.87967
          },
          {
            "x": 113.49702751953124,
            "y": 88.36816585421488,
            "z": 165.03534044185508,
            "thickness": 3.29552
          },
          {
            "x": 107.74052751953126,
            "y": 88.90609588640376,
            "z": 164.9782404384383,
            "thickness": 2.85849
          },
          {
            "x": 107.17360751953125,
            "y": 89.5369459241528,
            "z": 164.97426043820016,
            "thickness": 2.67427
          },
          {
            "x": 78.52751751953124,
            "y": 90.0430559544376,
            "z": 164.9844804388117,
            "thickness": 2.29621
          },
          {
            "x": 61.25097751953125,
            "y": 88.89454588571262,
            "z": 164.95759043720264,
            "thickness": 2.42518
          },
          {
            "x": 107.05957751953125,
            "y": 90.40964597637377,
            "z": 164.9948404394316,
            "thickness": 2.72875
          },
          {
            "x": 98.27197751953125,
            "y": 91.48583604077125,
            "z": 164.9520104368687,
            "thickness": 1.84491
          },
          {
            "x": 63.48066751953125,
            "y": 91.42807603731498,
            "z": 164.97905043848675,
            "thickness": 2.60971
          },
          {
            "x": 113.99166751953125,
            "y": 92.41822609656396,
            "z": 165.03528044185148,
            "thickness": 3.2181
          },
          {
            "x": 87.12996751953125,
            "y": 92.0473560743717,
            "z": 165.04882044266168,
            "thickness": 1.89275
          },
          {
            "x": 78.16933751953124,
            "y": 92.41247609621989,
            "z": 164.9696904379267,
            "thickness": 2.8173
          },
          {
            "x": 72.78439751953124,
            "y": 93.76417617710345,
            "z": 164.97782043841315,
            "thickness": 3.12923
          },
          {
            "x": 91.79850751953126,
            "y": 94.23651620536752,
            "z": 165.00334043994025,
            "thickness": 2.39255
          },
          {
            "x": 91.04324751953125,
            "y": 94.83453624115205,
            "z": 165.0034804399486,
            "thickness": 2.56276
          },
          {
            "x": 65.03709751953124,
            "y": 94.73700623531604,
            "z": 164.95925043730193,
            "thickness": 2.71809
          },
          {
            "x": 67.72739751953125,
            "y": 99.25323650555997,
            "z": 164.99869043966197,
            "thickness": 2.30017
          },
          {
            "x": 69.04896751953126,
            "y": 100.7870265973395,
            "z": 165.04224044226797,
            "thickness": 2.27324
          },
          {
            "x": 73.78542751953125,
            "y": 102.89231672331667,
            "z": 165.0096604403184,
            "thickness": 2.44962
          },
          {
            "x": 109.95236751953125,
            "y": 103.81065677826865,
            "z": 165.0432504423284,
            "thickness": 2.25472
          },
          {
            "x": 65.95763751953125,
            "y": 105.52534688087293,
            "z": 165.01080044038665,
            "thickness": 2.66289
          },
          {
            "x": 66.49586751953126,
            "y": 107.72095701225473,
            "z": 164.9899404391384,
            "thickness": 3.03398
          },
          {
            "x": 57.14946751953126,
            "y": 109.75394713390557,
            "z": 164.98981043913062,
            "thickness": 3.59766
          },
          {
            "x": 72.67818751953125,
            "y": 114.26815740402864,
            "z": 164.98934043910248,
            "thickness": 2.2393
          },
          {
            "x": 110.12192751953125,
            "y": 116.62817754524845,
            "z": 164.99457043941547,
            "thickness": 1.30607
          },
          {
            "x": 111.47247751953125,
            "y": 118.42391765270264,
            "z": 165.01676044074327,
            "thickness": 1.00048
          },
          {
            "x": 73.83290751953125,
            "y": 118.86758767925113,
            "z": 164.97572043828754,
            "thickness": 2.44294
          },
          {
            "x": 119.45781751953125,
            "y": 122.64480790527391,
            "z": 165.0021904398714,
            "thickness": 0.0
          },
          {
            "x": 82.37783751953125,
            "y": 122.50472789689175,
            "z": 164.95707043717152,
            "thickness": 2.05102
          },
          {
            "x": 77.17613751953125,
            "y": 123.47485795494276,
            "z": 165.0109204403938,
            "thickness": 2.55457
          },
          {
            "x": 81.56341751953124,
            "y": 125.05119804926842,
            "z": 165.0166104407343,
            "thickness": 2.06125
          },
          {
            "x": 62.19330751953125,
            "y": 127.01790816695319,
            "z": 164.9577004372092,
            "thickness": 2.72213
          },
          {
            "x": 119.95587751953126,
            "y": 128.2281582393726,
            "z": 164.9873704389846,
            "thickness": 0.0
          },
          {
            "x": 58.24485751953126,
            "y": 128.61992826281548,
            "z": 164.9607104373893,
            "thickness": 2.36419
          },
          {
            "x": 120.04321751953125,
            "y": 129.08304829052784,
            "z": 165.04471044241575,
            "thickness": 0.0
          },
          {
            "x": 84.21755751953125,
            "y": 130.44801837220547,
            "z": 165.02336044113818,
            "thickness": 2.73325
          },
          {
            "x": 83.24617751953124,
            "y": 130.42453837080043,
            "z": 165.01320044053023,
            "thickness": 2.77331
          },
          {
            "x": 72.84126751953124,
            "y": 130.86567839719757,
            "z": 164.97037043796738,
            "thickness": 2.61985
          },
          {
            "x": 64.61995751953125,
            "y": 130.15844835487806,
            "z": 164.95086043679993,
            "thickness": 2.36275
          },
          {
            "x": 84.64828751953125,
            "y": 131.34904842612164,
            "z": 165.0070704401634,
            "thickness": 2.70973
          },
          {
            "x": 71.35455751953126,
            "y": 131.42626843074237,
            "z": 164.98762043899958,
            "thickness": 2.97173
          },
          {
            "x": 68.98045751953126,
            "y": 131.0956484109586,
            "z": 165.01331044053686,
            "thickness": 2.33413
          },
          {
            "x": 57.73464751953125,
            "y": 131.42008843037254,
            "z": 164.98905043908516,
            "thickness": 2.74818
          },
          {
            "x": 85.01799751953125,
            "y": 132.3015384831171,
            "z": 165.01174044044285,
            "thickness": 2.81139
          },
          {
            "x": 120.76059751953125,
            "y": 133.24304853945554,
            "z": 165.004790440027,
            "thickness": 0.0
          },
          {
            "x": 85.66197751953125,
            "y": 135.26315866033568,
            "z": 165.01402044057932,
            "thickness": 2.26153
          },
          {
            "x": 78.45099751953126,
            "y": 135.54737867734295,
            "z": 164.9651204376532,
            "thickness": 3.30784
          },
          {
            "x": 78.01555751953126,
            "y": 136.3705487266001,
            "z": 164.98705043896547,
            "thickness": 2.99215
          },
          {
            "x": 85.76534751953125,
            "y": 137.5975888000242,
            "z": 165.0021704398702,
            "thickness": 3.05578
          },
          {
            "x": 120.49365751953125,
            "y": 140.89312899722404,
            "z": 165.04154044222605,
            "thickness": 0.0
          },
          {
            "x": 73.40324751953125,
            "y": 140.0536789469927,
            "z": 165.03141044161993,
            "thickness": 1.78228
          },
          {
            "x": 72.65022751953126,
            "y": 140.67809898435698,
            "z": 165.03665044193346,
            "thickness": 1.54434
          },
          {
            "x": 61.68353751953125,
            "y": 141.40008902755972,
            "z": 165.00752044019035,
            "thickness": 2.65395
          },
          {
            "x": 120.20299751953125,
            "y": 142.47354909179384,
            "z": 164.972470438093,
            "thickness": 0.0
          },
          {
            "x": 71.72097751953126,
            "y": 141.8443890541459,
            "z": 165.0387104420567,
            "thickness": 1.62988
          },
          {
            "x": 80.03582751953125,
            "y": 146.9562493600314,
            "z": 164.99772043960394,
            "thickness": 2.42876
          },
          {
            "x": 61.40130751953125,
            "y": 147.9227494178652,
            "z": 165.04758044258747,
            "thickness": 1.93742
          },
          {
            "x": 58.95269751953125,
            "y": 148.17094943271707,
            "z": 164.95856043726067,
            "thickness": 1.82809
          },
          {
            "x": 79.15916751953125,
            "y": 148.96074947997747,
            "z": 165.02186044104843,
            "thickness": 2.06739
          },
          {
            "x": 54.58976751953125,
            "y": 149.52694951385791,
            "z": 164.9836704387632,
            "thickness": 2.66499
          },
          {
            "x": 79.60102751953124,
            "y": 150.5830795770551,
            "z": 164.95875043727204,
            "thickness": 2.43311
          },
          {
            "x": 83.32697751953125,
            "y": 151.00867960252228,
            "z": 164.9813004386214,
            "thickness": 2.70543
          },
          {
            "x": 86.17848751953125,
            "y": 154.03797978379072,
            "z": 165.0364804419233,
            "thickness": 2.40015
          },
          {
            "x": 85.57625751953125,
            "y": 154.5517098145315,
            "z": 165.00462044001682,
            "thickness": 2.47545
          },
          {
            "x": 57.068517519531255,
            "y": 154.78205982831525,
            "z": 164.9955904394765,
            "thickness": 2.02455
          },
          {
            "x": 84.53445751953126,
            "y": 155.5604198748911,
            "z": 165.0072704401754,
            "thickness": 2.2743
          },
          {
            "x": 59.65731751953125,
            "y": 154.80991982998236,
            "z": 165.0379604420118,
            "thickness": 2.75183
          },
          {
            "x": 89.01694751953124,
            "y": 156.39907992507514,
            "z": 164.9932404393359,
            "thickness": 2.45479
          },
          {
            "x": 88.88392751953126,
            "y": 157.89848001479683,
            "z": 165.02175044104183,
            "thickness": 2.42626
          },
          {
            "x": 66.45293751953125,
            "y": 158.28497003792378,
            "z": 164.9502204367616,
            "thickness": 2.8357
          },
          {
            "x": 85.35337751953125,
            "y": 159.14515008939557,
            "z": 165.02681044134465,
            "thickness": 2.35257
          },
          {
            "x": 73.87321751953125,
            "y": 159.86927013272575,
            "z": 164.98215043867228,
            "thickness": 2.5069
          },
          {
            "x": 64.61866751953124,
            "y": 161.37158022262156,
            "z": 165.0307504415804,
            "thickness": 3.34508
          },
          {
            "x": 122.82256751953125,
            "y": 163.66720035998776,
            "z": 165.0060204401006,
            "thickness": 0.0
          },
          {
            "x": 90.42921751953125,
            "y": 163.61350035677444,
            "z": 165.00724044017358,
            "thickness": 2.8654
          },
          {
            "x": 88.38796751953126,
            "y": 163.3180203390934,
            "z": 164.99075043918688,
            "thickness": 2.7658
          },
          {
            "x": 92.61026751953125,
            "y": 167.37813058204384,
            "z": 165.0079304402149,
            "thickness": 2.70755
          },
          {
            "x": 89.37558751953125,
            "y": 168.95064067614035,
            "z": 165.04277044229966,
            "thickness": 2.89107
          },
          {
            "x": 93.08889751953126,
            "y": 168.03567062138998,
            "z": 164.9794404385101,
            "thickness": 3.07531
          },
          {
            "x": 74.00225751953124,
            "y": 170.38386076190187,
            "z": 165.04796044261025,
            "thickness": 1.86854
          },
          {
            "x": 93.23884751953125,
            "y": 171.83927084899128,
            "z": 165.00887044027112,
            "thickness": 1.82825
          },
          {
            "x": 92.39978751953126,
            "y": 171.73262084260952,
            "z": 165.01882044086653,
            "thickness": 1.8325
          },
          {
            "x": 91.17089751953125,
            "y": 171.26482081461714,
            "z": 165.0380604420178,
            "thickness": 2.32561
          },
          {
            "x": 66.88871751953124,
            "y": 171.94020085503078,
            "z": 165.028370441438,
            "thickness": 3.1852
          },
          {
            "x": 93.51241751953125,
            "y": 172.66416089835138,
            "z": 164.95747043719544,
            "thickness": 2.08374
          },
          {
            "x": 91.84098751953125,
            "y": 172.37537088107064,
            "z": 165.0121004404644,
            "thickness": 2.02971
          },
          {
            "x": 121.09553751953125,
            "y": 174.3007609962829,
            "z": 165.002250439875,
            "thickness": 0.0
          },
          {
            "x": 74.33725751953125,
            "y": 176.05888110148598,
            "z": 164.9936204393586,
            "thickness": 2.155
          },
          {
            "x": 72.00427751953126,
            "y": 177.6688111978216,
            "z": 165.00559044007485,
            "thickness": 2.70181
          },
          {
            "x": 83.35287751953125,
            "y": 179.6110713140433,
            "z": 165.024460441204,
            "thickness": 1.89128
          },
          {
            "x": 81.21905751953125,
            "y": 179.19129128892436,
            "z": 165.0443404423936,
            "thickness": 2.03601
          },
          {
            "x": 77.63882751953125,
            "y": 179.12518128496845,
            "z": 164.98606043890624,
            "thickness": 2.3553
          },
          {
            "x": 74.67887751953126,
            "y": 179.2493012923956,
            "z": 164.9873004389804,
            "thickness": 2.45729
          },
          {
            "x": 85.92474751953125,
            "y": 181.05084140019684,
            "z": 164.98681043895112,
            "thickness": 2.09448
          },
          {
            "x": 116.54971751953126,
            "y": 185.07890164122946,
            "z": 165.04173044223742,
            "thickness": 2.13779
          },
          {
            "x": 90.19555751953125,
            "y": 185.3374816567025,
            "z": 165.0110504404016,
            "thickness": 2.22419
          },
          {
            "x": 113.67973751953124,
            "y": 186.04957169931282,
            "z": 165.04258044228828,
            "thickness": 2.36045
          },
          {
            "x": 90.92705751953125,
            "y": 185.97148169464,
            "z": 164.98201043866388,
            "thickness": 2.16965
          },
          {
            "x": 92.31951751953125,
            "y": 186.86838174830905,
            "z": 165.04754044258507,
            "thickness": 2.18181
          },
          {
            "x": 87.95772751953125,
            "y": 193.42109214041272,
            "z": 164.98135043862442,
            "thickness": 1.99417
          },
          {
            "x": 98.31165751953125,
            "y": 194.49311220456065,
            "z": 165.03054044156784,
            "thickness": 1.93262
          },
          {
            "x": 96.55009751953125,
            "y": 194.20476218730622,
            "z": 165.00432043999888,
            "thickness": 1.77771
          },
          {
            "x": 117.59701751953125,
            "y": 197.35690237592524,
            "z": 164.9708704379973,
            "thickness": 2.02429
          },
          {
            "x": 121.41974751953126,
            "y": 198.17550242490898,
            "z": 165.02638044131893,
            "thickness": 3.13836
          },
          {
            "x": 96.12609751953124,
            "y": 200.2687725501669,
            "z": 165.01240044048237,
            "thickness": 2.30671
          },
          {
            "x": 113.16998751953125,
            "y": 202.39299267727677,
            "z": 165.0412004422057,
            "thickness": 2.32925
          },
          {
            "x": 84.59081751953124,
            "y": 202.49597268343894,
            "z": 165.02981044152415,
            "thickness": 2.5425
          },
          {
            "x": 116.16535751953126,
            "y": 212.29364326971574,
            "z": 165.02770044139788,
            "thickness": 1.98371
          },
          {
            "x": 106.17225751953126,
            "y": 213.92676336743904,
            "z": 164.96552043767713,
            "thickness": 2.18504
          },
          {
            "x": 104.73268751953125,
            "y": 215.11975343882563,
            "z": 165.01808044082222,
            "thickness": 2.52471
          },
          {
            "x": 118.92716751953125,
            "y": 215.49703346140146,
            "z": 165.03304044171745,
            "thickness": 2.61822
          },
          {
            "x": 63.12627751953125,
            "y": 142.14750907228412,
            "z": 165.04462044241035,
            "thickness": 2.26613
          },
          {
            "x": 122.91630751953124,
            "y": 165.99040049900435,
            "z": 164.95151043683882,
            "thickness": 0.0
          },
          {
            "x": 55.09002751953125,
            "y": 120.2391377613225,
            "z": 165.04764044259107,
            "thickness": 3.52318
          },
          {
            "x": 112.52372751953125,
            "y": 106.60371694540088,
            "z": 165.00506044004317,
            "thickness": 2.79577
          },
          {
            "x": 119.88381751953125,
            "y": 126.10849811253554,
            "z": 164.99441043940587,
            "thickness": 0.0
          },
          {
            "x": 111.65944751953126,
            "y": 196.79577234234813,
            "z": 164.96100043740668,
            "thickness": 2.58263
          },
          {
            "x": 113.06795751953125,
            "y": 104.81867683858695,
            "z": 165.0319204416504,
            "thickness": 2.46447
          },
          {
            "x": 90.99240751953124,
            "y": 88.42261585747309,
            "z": 165.02229044107415,
            "thickness": 2.07714
          },
          {
            "x": 115.61167751953126,
            "y": 195.81426228361616,
            "z": 164.9540004369878,
            "thickness": 1.84278
          },
          {
            "x": 58.98565751953125,
            "y": 140.3141489625788,
            "z": 164.97270043810678,
            "thickness": 2.74123
          },
          {
            "x": 62.79185751953125,
            "y": 127.57871820051115,
            "z": 165.02568044127705,
            "thickness": 2.34468
          },
          {
            "x": 119.95401751953125,
            "y": 180.1030313434814,
            "z": 165.02698044135482,
            "thickness": 2.3236
          },
          {
            "x": 67.86552751953124,
            "y": 157.3406099814148,
            "z": 164.9819104386579,
            "thickness": 2.67363
          },
          {
            "x": 62.53944751953125,
            "y": 94.61391622795051,
            "z": 164.98488043883563,
            "thickness": 2.77002
          },
          {
            "x": 106.78969751953125,
            "y": 75.65873509370303,
            "z": 164.97110043801106,
            "thickness": 2.50212
          },
          {
            "x": 66.69023751953125,
            "y": 82.73307551702017,
            "z": 165.0492804426892,
            "thickness": 2.529
          },
          {
            "x": 104.12927751953126,
            "y": 101.63409664802681,
            "z": 164.9923804392844,
            "thickness": 2.1897
          },
          {
            "x": 114.07418751953125,
            "y": 112.37014729045477,
            "z": 165.00503044004134,
            "thickness": 3.30267
          },
          {
            "x": 114.06354751953126,
            "y": 93.26241614707892,
            "z": 164.9761904383156,
            "thickness": 3.38232
          },
          {
            "x": 114.69379751953124,
            "y": 185.29882165438912,
            "z": 165.00074043978466,
            "thickness": 2.24982
          },
          {
            "x": 82.31937751953126,
            "y": 147.18324937361473,
            "z": 165.02051044096766,
            "thickness": 2.90331
          },
          {
            "x": 74.80121751953125,
            "y": 144.99637924275592,
            "z": 165.0171604407672,
            "thickness": 2.26216
          },
          {
            "x": 82.78556751953124,
            "y": 179.63476131546085,
            "z": 164.95102043680947,
            "thickness": 1.90377
          },
          {
            "x": 60.32300751953125,
            "y": 125.87787809873562,
            "z": 165.01689044075104,
            "thickness": 3.10788
          },
          {
            "x": 56.46629751953125,
            "y": 125.90846810056607,
            "z": 164.9869404389589,
            "thickness": 2.2568
          },
          {
            "x": 91.69493751953125,
            "y": 171.68292083963556,
            "z": 164.99461043941784,
            "thickness": 1.97758
          },
          {
            "x": 92.85853751953125,
            "y": 188.05033181903505,
            "z": 164.96994043794163,
            "thickness": 2.09966
          },
          {
            "x": 114.69982751953125,
            "y": 77.70569521618982,
            "z": 164.9863604389242,
            "thickness": 1.88263
          },
          {
            "x": 70.74318751953125,
            "y": 80.64104539183644,
            "z": 164.99225043927663,
            "thickness": 2.80534
          },
          {
            "x": 88.46841751953124,
            "y": 193.2089621277192,
            "z": 165.04770044259467,
            "thickness": 1.95999
          },
          {
            "x": 68.50940751953125,
            "y": 161.40267022448194,
            "z": 165.02680044134405,
            "thickness": 2.45127
          },
          {
            "x": 65.68362751953126,
            "y": 108.53276706083213,
            "z": 165.034720441818,
            "thickness": 2.93139
          }
        ],
        "slice_pos": 165.0
      }

      mockData["vertexes"].forEach(v => {
        var p_x = Math.round(v.x)
        var p_y = Math.round(v.y)

        // console.log(p_x, p_y)

        var index = (p_x + p_y * 255) * 4
        data[index] = 255
        data[index + 3] = 255
      });

      this.canvasTransformer(5)

      // manipulate some pixel elements
      for(var i = 0; i < data.length; i += 4) {
        var col = Math.round(i / 4) % 255
          for (v in mockData.vertexes) {
            // if (Math.round(v.x) == col || Math.round(v.y) == line) {
            if (false) {
              data[i]=255
              data[i+3] = 255
            }
          }
          // data[i]=255;   // set every red pixel element to 255
          // data[i+3]=255; // make this pixel opaque
      }

      // put the modified pixels back on the canvas
      _imageFBContext.putImageData(imgData,0,0);
    }
    putMockLabelData()

    // cache the current slice index and other values
    // which might require a redraw
    this._currentSlice = _currentSlice;
    this._lowerThreshold = _lowerThreshold;
    this._upperThreshold = _upperThreshold;
    this._windowLow = _windowLow;
    this._windowHigh = _windowHigh;

    if (_currentLabelMap) {

      // only update the setting if we have a labelmap
      this._labelmapShowOnlyColor = _labelmapShowOnlyColor;

    }

  }

  //
  // the actual drawing (rendering) happens here
  //

  // draw the slice frame buffer (which equals the slice data) to the main
  // context
  this._context.globalAlpha = 1.0; // draw fully opaque}

  // move to the middle
  this._context.translate(_width / 2 /this._normalizedScale, _height / 2 /
      this._normalizedScale);

  // Rotate the Sagittal viewer
  if(this._orientation == "X") {

    this._context.rotate(Math.PI * 0.5);

    var _buf = _x;
    _x = _y;
    _y = -_buf;

  }

  var _offset_x = -_sliceWidth * this._sliceWidthSpacing / 2 + _x;
  var _offset_y = -_sliceHeight * this._sliceHeightSpacing / 2 + _y;

  // draw the slice
  this._context.drawImage(this._frameBuffer, _offset_x, _offset_y, _sliceWidth *
      this._sliceWidthSpacing, _sliceHeight * this._sliceHeightSpacing);

  // draw the labels with a configured opacity
  if (_currentLabelMap && _volume._labelmap._visible) {

    var _labelOpacity = 1;//_volume._labelmap._opacity;
    this._context.globalAlpha = _labelOpacity; // draw transparent depending on
    // opacity
    this._context.drawImage(this._labelFrameBuffer, _offset_x, _offset_y,
        _sliceWidth * this._sliceWidthSpacing, _sliceHeight *
            this._sliceHeightSpacing);

  }

  // if enabled, show slice navigators
  if (this._config['SLICENAVIGATORS']) {
    this._canvas.style.cursor = "none";

    // but only if the shift key is down and the left mouse is not
    if (this._interactor._mouseInside && this._interactor._shiftDown &&
        !this._interactor._leftButtonDown) {

      var _mousePosition = this._interactor._mousePosition;

      // check if we are over the slice
      var ijk = this.xy2ijk(_mousePosition[0], _mousePosition[1]);

      if (ijk) {
        // // we are over the slice
        // update the volume
        _volume._indexX = ijk[0][0];
        _volume._indexY = ijk[0][1];
        _volume._indexZ = ijk[0][2];
        _volume.modified(false);

        this['onSliceNavigation']();

        // draw the navigators
        // see http://diveintohtml5.info/canvas.html#paths

        // in x-direction
        this._context.setTransform(1, 0, 0, 1, 0, 0);
        this._context.beginPath();
        this._context.moveTo(this._interactor._mousePosition[0], 0);
        this._context.lineTo(this._interactor._mousePosition[0],
            this._interactor._mousePosition[1] - 1);
        this._context.moveTo(this._interactor._mousePosition[0],
            this._interactor._mousePosition[1] + 1);
        this._context.lineTo(this._interactor._mousePosition[0],
            this._height);
        this._context.strokeStyle = this._orientationColors[0];
        this._context.stroke();
        this._context.closePath();

        // in y-direction
        this._context.beginPath();
        this._context.moveTo(0, this._interactor._mousePosition[1]);
        this._context.lineTo(this._interactor._mousePosition[0] - 1,
            this._interactor._mousePosition[1]);
        this._context.moveTo(this._interactor._mousePosition[0] + 1, this._interactor._mousePosition[1]);
        this._context.lineTo(this._width,
            this._interactor._mousePosition[1]);
        this._context.strokeStyle = this._orientationColors[1];
        this._context.stroke();
        this._context.closePath();

        // write ijk coordinates
        this._context.font = '10pt Arial';
        // textAlign aligns text horizontally relative to placement
        this._context.textAlign = 'left';
        // textBaseline aligns text vertically relative to font style
        this._context.textBaseline = 'top';
        this._context.fillStyle = 'white';
        this._context.fillText('RAS: ' + ijk[2][0].toFixed(2) + ', ' + ijk[2][1].toFixed(2) + ', ' + ijk[2][2].toFixed(2), 0, 0);

        var _value = 'undefined';
        var _valueLM = 'undefined';
        var _valueCT = 'undefined';
        if(typeof _volume._IJKVolume[ijk[1][2].toFixed(0)] != 'undefined' && typeof _volume._IJKVolume[ijk[1][2].toFixed(0)][ijk[1][1].toFixed(0)] != 'undefined'){
          _value = _volume._IJKVolume[ijk[1][2].toFixed(0)][ijk[1][1].toFixed(0)][ijk[1][0].toFixed(0)];
          if(_volume.hasLabelMap){
            _valueLM = _volume._labelmap._IJKVolume[ijk[1][2].toFixed(0)][ijk[1][1].toFixed(0)][ijk[1][0].toFixed(0)];
            if(_volume._labelmap._colorTable){
              _valueCT = _volume._labelmap._colorTable.get(_valueLM);
              if(typeof _valueCT != 'undefined'){
              _valueCT = _valueCT[0];
              }
            }
          }
        }
        // get pixel value
        this._context.fillText('Background:  ' + _value + ' ('+ ijk[1][0].toFixed(0) + ', ' + ijk[1][1].toFixed(0) + ', ' + ijk[1][2].toFixed(0) + ')', 0, 15);
        // if any label map
        if(_volume.hasLabelMap){
          this._context.fillText('Labelmap:  ' + _valueCT + ' ('+ _valueLM + ')', 0, 30);
        }

      }

    }
else{
    this._canvas.style.cursor = "default";
  }
  }

};

// export symbols (required for advanced compilation)
goog.exportSymbol('X.renderer2D', X.renderer2D);
goog.exportSymbol('X.renderer2D.prototype.init', X.renderer2D.prototype.init);
goog.exportSymbol('X.renderer2D.prototype.add', X.renderer2D.prototype.add);
goog.exportSymbol('X.renderer2D.prototype.onShowtime',
    X.renderer2D.prototype.onShowtime);
goog.exportSymbol('X.renderer2D.prototype.onRender',
    X.renderer2D.prototype.onRender);
goog.exportSymbol('X.renderer2D.prototype.onScroll',
    X.renderer2D.prototype.onScroll);
goog.exportSymbol('X.renderer2D.prototype.onWindowLevel',
    X.renderer2D.prototype.onWindowLevel);
goog.exportSymbol('X.renderer2D.prototype.get', X.renderer2D.prototype.get);
goog.exportSymbol('X.renderer2D.prototype.resetViewAndRender',
    X.renderer2D.prototype.resetViewAndRender);
goog.exportSymbol('X.renderer2D.prototype.xy2ijk',
    X.renderer2D.prototype.xy2ijk);
goog.exportSymbol('X.renderer2D.prototype.render',
    X.renderer2D.prototype.render);
goog.exportSymbol('X.renderer2D.prototype.destroy',
    X.renderer2D.prototype.destroy);
goog.exportSymbol('X.renderer2D.prototype.onSliceNavigation', X.renderer2D.prototype.onSliceNavigation);

goog.exportSymbol('X.renderer2D.prototype.afterRender', X.renderer2D.prototype.afterRender);
goog.exportSymbol('X.renderer2D.prototype.resize', X.renderer2D.prototype.resize);
