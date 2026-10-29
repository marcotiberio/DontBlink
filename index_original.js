let _start;
let _ended = false;
let _initialized = false;

// Called by js/blink.js once a face is found and calibrated: start the clock and the glitch effects.
function startGame() {
  if (_initialized) return;
  _initialized = true;
  _start = new Date();
  sw_init();
  setsize();
}

// Called by js/blink.js when both eyes close.
function blink() {
  if (_ended || !_start) return;
  _ended = true;

  const seconds = Math.round((new Date() - _start) / 1000);
  if (!confirm(`You lasted ${seconds} seconds without blinking! Click OK to watch full video or CANCEL to play again!`)) {
    window.location.reload();
  }
}

// resize the canvas to match the window
function setsize() {
  if (!_initialized) return;
  the_canvas.width = the_canvas_container.clientWidth;
  the_canvas_width = the_canvas_container.clientWidth;
  the_canvas.height = the_canvas_container.clientHeight;
  the_canvas_height = the_canvas_container.clientHeight;
}

// grab a 100-pixel tall horizontal strip and move it left or right by 50px
function effect_tearing() {
  if (!the_canvas_width || !the_canvas_height) return;
  var pos_y = parseInt(Math.random() * (the_canvas_height - 100));

  the_canvas_ctx.drawImage(
    the_canvas,
    0,
    pos_y,
    the_canvas_width,
    100,
    parseInt(Math.random() * 2) * 100 - 50, // either 50 or -50
    pos_y,
    the_canvas_width,
    100
  );
}

// add an image to somewhere inside the canvas
function add_image() {
  var rnd_pic = document.getElementById('pic' + parseInt(Math.random() * 18));

  if (rnd_pic) {
    var img = new Image();
    img.onload = function() {
      the_canvas_ctx.drawImage(
        rnd_pic,
        parseInt(Math.random() * (the_canvas_width - rnd_pic.width)),
        parseInt(Math.random() * (the_canvas_height - rnd_pic.height))
      );
    };
    img.src = rnd_pic.src;
  }
}

// rewind and play one of the audio elements
function do_sound() {
  return; // is there a sound file?
  var rnd_snd = document.getElementById('snd' + parseInt(Math.random() * 7));
  rnd_snd.currentTime = 0;
  rnd_snd.play();
}

// main loop (on interval)
function slowloop() {
  if (document.hidden === true) {
    return;
  } // We musn't be rude
  if (Math.random() < 0.1) {
    effect_tearing();
  }
  if (Math.random() < 0.05) {
    screen_shake();
  }
  add_image();

  if (devmode) if (Math.random() < 0.1) vertline();

  // Chrome is mean and usually doesn't let us autoplay sound anymore :(
  // Fun fact, trying to use HTML5 audio causes this function to die when
  // run in IE from an "N" edition of windows, which is why this is last
  do_sound();
}

// bump the screen side-to-side
function screen_shake() {
  the_canvas_container.style.left = (Math.random() < 0.5 ? '-' : '') + '50px';
  setTimeout(function() {
    the_canvas_container.style.left = '0px';
  }, 50);
}

// draw vertical lines of "dead pixels"
function vertline() {
  var base_x = parseInt(Math.random() * (the_canvas_width - 10));

  for (let i = 0; i < 10; i++) {
    the_canvas_ctx.strokeStyle =
      'rgb(' +
      parseInt(Math.random() * 255) +
      ',' +
      parseInt(Math.random() * 255) +
      ',' +
      parseInt(Math.random() * 255) +
      ')';

    let line_x = base_x + i + Math.random() * 50 - 25;

    the_canvas_ctx.beginPath();
    the_canvas_ctx.moveTo(line_x + 0.5, 0.5);
    the_canvas_ctx.lineTo(line_x + 0.5, 0.5 + the_canvas_height);
    the_canvas_ctx.stroke();
  }
}

function sw_init() {
  the_canvas_container = document.getElementById('canvas_container');
  the_canvas = document.getElementById('the_canvas');
  the_canvas_ctx = the_canvas.getContext('2d');
  setsize();
  window.setInterval(slowloop, 100);
}

var the_canvas;
var the_canvas_container;
var the_canvas_ctx;
var the_canvas_height;
var the_canvas_width;

var devmode = false;
if (document.cookie.indexOf('devmode=enable') !== -1) {
  devmode = true;
}

window.addEventListener('resize', setsize);
//window.addEventListener('load', sw_init);
