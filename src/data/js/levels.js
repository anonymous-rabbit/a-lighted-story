// Copyright 2013 LastLeaf, MIT LICENSE
'use strict';

// consts

// graphics
var WIDTH = 960;
var HEIGHT = 540;
var ME_R = 12;
var LIGHT_R_MAX = 50*6;

// game
var ME_HP_MAX = [5000,2000,1000,700];
var LIGHTS_SPEED = [2,2.5,3,3.5];
var P_STATE_CHANGE = [0.02, 0.025, 0.03, 0.035];
var ME_MOVE_SPEED = 3; // no larger than 6
var ME_SLOW_RATE = 0.65;  // slow_speed = slow_rate * normal_speed
var ME_S_R = 12;          // radius of my shadow
var ME_S_DES_PER_FRAME = 0.003;
var ME_S_START_ALPHA = 0.096;   // alpha when the shadow appear
var FOG_R = 100;
var FLASH_ALPHA_MIN = 0.0;
var FLASH_ALPHA_MAX = 0.2;
var ME_ACTION_DAMAGE = 4;
var ME_ACTION_DIF = Math.PI/8;
var ME_DAMAGE_PER_R = 1;
var STORY_FONT_SIZE = 28;
var MAP_TEXT_FONT_SIZE = 28;
var ME_COLOR = '#808080';
var ME_COLOR_LIGHT = '#F0F9FF';
var HER_COLOR = '#AD4653';
var HER_COLOR_LIGHT = '#FFB8C2';
var HER_COLOR_TEXT = '#FFB8C2';
var PAUSE_CTRL_R = 30;
var PAUSE_CTRL_X = WIDTH-PAUSE_CTRL_R-6;
var PAUSE_CTRL_Y = PAUSE_CTRL_R+6;
var TOUCH_CTRL_R = 90;
var TOUCH_CTRL_X = WIDTH-TOUCH_CTRL_R-6;
var TOUCH_CTRL_Y = HEIGHT-TOUCH_CTRL_R-6;
var ACTION_CTRL_R = 42;
var ACTION_CTRL_X = ACTION_CTRL_R+6;
var ACTION_CTRL_Y = HEIGHT-ACTION_CTRL_R-6;

// parse a map

var parseMap = function(level){
	var map = {};
	var a = game.maps[level].split('|');
	map.startX = a[1]*6;
	map.startY = a[2]*6;
	var endX = a[3].split(' ');
	var endY = a[4].split(' ');
	for(var i=0; i<endX.length; i++) {
		endX[i] *= 6;
		endY[i] *= 6;
	}
	map.endX = endX;
	map.endY = endY;
	// parse lights
	map.lights = [];
	var s = a[5].split(' ');
	for(var i=0; i<s.length; i++) {
		var b = s[i].match(/^\(([0-9]+)\,([0-9]+)\)\*([0-9]+)\(([0-9]+)\,([0-9]+)\)(o[0-9]+|)(~[0-9\.]+|)$/);
		if(!b) continue;
		if(b[6])
			b[6] = Number(b[6].slice(1))*6
		else
			b[6] = 0;
		if(b[7])
			b[7] = Number(b[7].slice(1))
		else
			b[7] = 1;
		map.lights.push({
			x: b[1]*6,
			y: b[2]*6,
			r: b[3]*6,
			xori: b[1]*6,
			yori: b[2]*6,
			rori: b[3]*6,
			rmin: b[4]*6,
			rmax: b[5]*6,
			area: b[6],
			speed: b[7],
			moveX: 0,
			moveY: 0,
			sizeState: 0
		});
	}
	// black background
	var mapBackground = new createjs.Shape();
	mapBackground.graphics.f('black').r(0, 0, WIDTH, HEIGHT);
	// draw map
	var blur = Number(a[6]);
	var mapStrs = a[0].split(' ');
	var pictures = [];
	while(mapStrs.length) {
		var s = mapStrs.shift();
		var block = new Array(90*160);
		var picture = new createjs.Shape();
		var g = picture.graphics.f('black').r(0, 0, WIDTH, HEIGHT).f('rgb(128,128,128)');
		for(var i=0; i<2400; i++) {
			var t = s.charCodeAt(i) - 48;
			for(var j=5; j>=0; j--) {
				var p = i*6+j;
				block[p] = !(t%2);
				t = t >> 1;
				if(block[p])
					g.r((p%160)*6, Math.floor(p/160)*6, 6, 6);
			}
		}
		picture.filters = [ new createjs.BlurFilter(6*blur+2,6*blur+2,4) ];
		picture.cache(0,0,WIDTH,HEIGHT);
		picture.block = block;
		pictures.push(picture);
	}
	map.picture = new createjs.Container().set({x:0,y:0});
	map.picture.addChild(pictures.shift());
	// add image above if needed
	if(game.ctrl[level].bgimage) {
		var img = new createjs.Bitmap( game.mainResource.getResult('img' + game.ctrl[level].bgimage) );
		img.cache(0, 0, WIDTH, HEIGHT);
		map.picture.addChild(img);
	}
	map.nextPicture = function(){
		if(!pictures.length) return;
		var picture = pictures.shift();
		picture.alpha = 0;
		map.picture.addChildAt(picture, 1);
		var fadeInNext = function(){
			picture.alpha += 0.04;
			if(picture.alpha >= 1) {
				map.picture.removeChildAt(0);
				calWall();
				createjs.Ticker.removeEventListener('tick', fadeInNext);
			}
		}
		createjs.Ticker.addEventListener('tick', fadeInNext);
	};
	// calculate wall
	var calWall = function(block){
		var block = map.picture.getChildAt(0).block;
		var wall = new Array(90*160);
		for(var i=0; i<90; i++)
			for(var j=0; j<160; j++) {
				if(!block[i*160+j])
					wall[i*160+j] = 0; // center can reach
				else {
					wall[i*160+j] = 2; // nothing can reach
					if(blur === 1) {
						for(var di=-1; di<=1; di++)
							for(var dj=-1; dj<=1; dj++) {
								if(i+di<0 || i+di>=90 || j+dj<0 || j+dj>=160) continue;
								if(block[(i+di)*160+(j+dj)]) continue;
								wall[i*160+j] = 1; // border can reach
								break;
							}
					} else if(blur === 2) {
						for(var di=-2; di<=2; di++)
							for(var dj=-2; dj<=2; dj++) {
								if(i+di<0 || i+di>=90 || j+dj<0 || j+dj>=160) continue;
								if(block[(i+di)*160+(j+dj)]) continue;
								wall[i*160+j] = 1; // border can reach
								break;
							}
					}
				}
			}
		map.blur = blur;
		map.wall = wall;
	};
	calWall();
	return map;
};

// basic shape generater

var generateRound = function(color, r1, r2){
	var container = new createjs.Container();
	for(var i=r1; i<r2; i++) {
		var round = new createjs.Shape();
		round.graphics.f(color).arc(0,0,i,0,2*Math.PI);
		round.alpha = (r2-i)/(r2-r1);
		container.addChild(round);
	}
	container.cache(-r2,-r2,r2*2,r2*2);
	return container;
};

var lightCache = new Array(LIGHT_R_MAX+1);
var generateLight = function(r, x, y){
	var R_INNER = 5;
	var R_OUTER = 5;
	if(lightCache[r]) return lightCache[r].clone().set({
		x: x-R_OUTER-1-r,
		y: y-R_OUTER-1-r
	});
	var g = new createjs.Graphics();
	for(var i=r+R_OUTER; i>=r-R_INNER; i--)
		g.f('rgba(255,255,255,'+(r+R_OUTER-i)*0.025+')').arc(0, 0, i, 0, 2*Math.PI);
	var s = new createjs.Shape(g);
	s.cache(-(r+R_OUTER+1), -(r+R_OUTER+1), 2*(r+R_OUTER+1), 2*(r+R_OUTER+1));
	lightCache[r] = new createjs.Bitmap(s.cacheCanvas);
	return lightCache[r].clone().set({
		x: x-R_OUTER-1-r,
		y: y-R_OUTER-1-r
	});
};

var generatePerson = function(color){
	var ss = new createjs.SpriteSheetBuilder();
	var rmax = ME_R*0.75;
	var rmin = ME_R*0.25;
	var rout = ME_R*1.25;
	var rspeed = (rmax-rmin)/40;
	var frameCount = 41;
	var rect = new createjs.Rectangle(1-rout, 1-rout, (rout-1)*2, (rout-1)*2);
	for(var i=rmax; i>rmin-(1e-6); i-=rspeed)
		ss.addFrame(generateRound(color,i,rout), rect);
	var frames = [];
	for(var i=0; i<frameCount/2; i++)
		frames.push(i);
	for(var i=Math.floor(frameCount/2)-2; i>0; i--)
		frames.push(i);
	ss.addAnimation('normal', frames, 'normal');
	var frames = [];
	for(var i=0; i<frameCount; i+=8)
		frames.push(i);
	for(var i=frameCount-4; i>0; i-=8)
		frames.push(i);
	ss.addAnimation('fast', frames, 'fast');
	return new createjs.BitmapAnimation(ss.build());
};

// user operations

var userCtrlReset = function(){
	userCtrl.animating = false;
	userCtrl.paused = false;
	userCtrl.skip = false;
	userCtrl.reset = false;
	userCtrl.action = false;
	userCtrl.up = 0;
	userCtrl.down = 0;
	userCtrl.left = 0;
	userCtrl.right = 0;
	userCtrl.relX = 0;
	userCtrl.relY = 0;
};
var userCtrl = {
	animating: false,
	paused: false,
	reset: false,
	skip: false,
	action: false,
	up: false,
	down: false,
	left: false,
	right: false
};

// pause and unpause

var pause = function(){
	if(location.hash === '#game') history.go(-1);
	userCtrl.paused = true;
	if(MOBILE) fullScreenOff();
};
var unpause = function(){
	if(location.hash !== '#game') history.go(1);
	userCtrl.paused = false;
	if(MOBILE) fullScreenOn();
};
var startAnimate = function(){
	userCtrl.animating = true;
};
var endAnimate = function(){
	userCtrl.animating = false;
}

// handling a level

var startLevel = function(level){
	if(!game.maps[level]) {
		game.curMusic = -1;
		var curVol = 1;
		var gameEnd = function(){
			curVol -= 0.04;
			if(game.settings.musicOn)
				createjs.Sound.setVolume(curVol*game.settings.volume/100);
			if(curVol <= 0) {
				if(level >= 0) {
					game.settings.curLevel = 0;
					game.saveSettings();
				}
				game.started = false;
				createjs.Sound.stop();
				createjs.Ticker.removeAllEventListeners('tick');
				game.stage.removeTouchAreas();
				window.removeEventListener('keydown', game.keyDownFunc);
				window.removeEventListener('keyup', game.keyUpFunc);
				var wrapper = document.getElementById('wrapper');
				wrapper.ontouchstart = wrapper.ontouchmove = wrapper.ontouchend = null;
				game.showCover();
			}
		}
		createjs.Ticker.addEventListener('tick', gameEnd);
		return;
	}

	// switch music
	if(game.curMusic !== game.ctrl[level].bgm) {
		var curVol = 1;
		var volDown = function(){
			curVol -= 0.04;
			if(curVol <= 0) {
				curVol = 0;
				// switch music
				createjs.Sound.stop();
				game.curMusic = game.ctrl[level].bgm || 0;
				createjs.Sound.play('bgm' + game.curMusic, createjs.Sound.INTERRUPT_ANY, 0, 0, -1);
				createjs.Ticker.removeEventListener('tick', volDown);
				createjs.Ticker.addEventListener('tick', volUp);
				storyLoopStart();
			}
			if(game.settings.musicOn)
				createjs.Sound.setVolume(curVol*game.settings.volume/100);
			else
				createjs.Sound.setVolume(0);
		};
		var volUp = function(){
			curVol += 0.02;
			if(curVol >= 1) {
				curVol = 1;
				createjs.Ticker.removeEventListener('tick', volUp);
			}
			if(game.settings.musicOn)
				createjs.Sound.setVolume(curVol*game.settings.volume/100);
			else
				createjs.Sound.setVolume(0);
		};
		createjs.Ticker.addEventListener('tick', volDown);
	} else {
		setTimeout(function(){
			storyLoopStart();
		}, 1000);
	}

	var controlConfig = game.ctrl[level];

	// story loop
	var storyLoopStart = function(){
		// show level words
		var story = game.words[level].story;
		if(story.constructor !== Array) story = [story];
		var storyText = new createjs.Text();
		storyText.textAlign = 'center';
		storyText.textBaseline = 'middle';
		storyText.x = WIDTH/2;
		storyText.y = HEIGHT/2;
		storyText.filters = [ new createjs.BlurFilter(2,2,1) ];
		storyText.cache(-480, -20, 960, 40);
		var storyContainer = new createjs.Container();
		game.stage.addChild(storyContainer);
		var i = 0;
		var isFadeIn = true;
		var FADE_ALPHA_MIN = -1;
		var FADE_ALPHA_STEP = 0.04;
		var FADE_ALPHA_MAX_STD = 1.5;
		var FADE_ALPHA_MAX_PER_CHAR = 0.04;
		storyContainer.alpha = -1;
		var fadeAlphaMax = 1;
		userCtrl.skip = false;
		var storyTime = function(str){
			// calc the time showing a sentence
			var c = 0;
			for(var i=0; i<str.length; i++)
				if(str.charCodeAt(i) < 128) c++;
				else c+=3;
			return c*FADE_ALPHA_MAX_PER_CHAR + FADE_ALPHA_MAX_STD;
		};
		var storyLoopFocused = true;
		var isLongText = false;
		var storyLoop = function(){
			if(userCtrl.paused) unpause();
			if(!game.focused) {
				if(storyLoopFocused && game.settings.musicOn)
					createjs.Sound.setVolume(MOBILE ? 0 : game.settings.volume*0.003); // TODO pause music
				storyLoopFocused = false;
				if(storyContainer.alpha >= 1) return;
			} else if(!storyLoopFocused) {
				storyLoopFocused = true;
				if(game.settings.musicOn)
					createjs.Sound.setVolume(game.settings.volume/100);
			}
			if(i >= story.length || userCtrl.skip) {
				userCtrl.skip = false;
				if(i >= story.length || game.settings.levelReached >= level) {
					// end loop
					createjs.Ticker.removeEventListener('tick', storyLoop);
					game.stage.removeChild(storyContainer);
					storyLoopEnd();
					return;
				}
			}
			if(isFadeIn) {
				// init text
				if(storyContainer.alpha <= FADE_ALPHA_MIN) {
					isLongText = false;
					storyContainer.removeAllChildren();
					if(story[i].charAt(0) === '!') {
						if(story[i].slice(0,5) === '!img:') {
							fadeAlphaMax = 2.5;
							var img = game.mainResource.getResult(story[i].slice(5));
							storyContainer.addChild( new createjs.Bitmap(img).set({
								x: (WIDTH-img.width)/2,
								y: (HEIGHT-img.height)/2
							}) );
						} else if(story[i].slice(0,8) === '!author:') {
							storyText.font = '24px'+game.lang.font;
							storyText.lineHeight = 36;
							storyText.color = '#a0a0a0';
							storyText.text = story[i].slice(8);
							storyText.cache(-480, -60, 960, 240);
							fadeAlphaMax = storyTime(story[i])*0.3;
							storyContainer.addChild(storyText);
							isLongText = true;
						} else if(story[i].slice(0,6) === '!long:') {
							storyText.font = STORY_FONT_SIZE+'px'+game.lang.font;
							storyText.lineHeight = STORY_FONT_SIZE*1.5;
							storyText.color = (controlConfig.player === 2 ? HER_COLOR_TEXT : '#c0c0c0');
							storyText.text = story[i].slice(6);
							storyText.cache(-480, -30, 960, 60);
							fadeAlphaMax = storyTime(story[i])*2;
							storyContainer.addChild(storyText);
						}
					} else {
						storyText.font = STORY_FONT_SIZE+'px'+game.lang.font;
						storyText.lineHeight = STORY_FONT_SIZE*1.5;
						storyText.color = (controlConfig.player === 2 ? HER_COLOR_TEXT : '#c0c0c0');
						storyText.text = story[i];
						storyText.cache(-480, -30, 960, 60);
						fadeAlphaMax = storyTime(story[i]);
						storyContainer.addChild(storyText);
					}
				}
				// fade in
				storyContainer.alpha += FADE_ALPHA_STEP;
				if(storyContainer.alpha >= fadeAlphaMax)
					isFadeIn = false;
			} else {
				// fade out
				storyContainer.alpha -= FADE_ALPHA_STEP;
				if(storyContainer.alpha <= FADE_ALPHA_MIN) {
					isFadeIn = true;
					i++;
				}
			}
			if(isLongText) game.stage.dirtyRect(0, 210, 960, 240);
			else game.stage.dirtyRect(0, 240, 960, 60);
			game.stage.update();
		};
		createjs.Ticker.addEventListener('tick', storyLoop);
		// skip by touch
		if(MOBILE) {
			game.stage.removeTouchAreas();
			game.stage.addTouchArea(0, 0, WIDTH, HEIGHT, function(){
				userCtrl.skip = true;
			});
		}
	};

	// generate clouds
	var cloudsStart = function(){
		var R1_MIN = 20;
		var R1_MAX = 100;
		var R2_MIN = 10;
		var R2_MAX = 20;
		var ALPHA_MIN = 0.04;
		var ALPHA_MAX = 0.08;
		var GEN_P = 0.3;
		var SPEED = 0.001;
		var container = new createjs.Container();
		game.stage.addChild(container);
		var rounds = [];
		createjs.Ticker.addEventListener('tick', function(){
			if(userCtrl.paused || userCtrl.animating) return;
			if(Math.random() < GEN_P) {
				var r1 = R1_MIN + Math.random()*(R1_MAX-R1_MIN);
				var r2 = R2_MIN + Math.random()*(R2_MAX-R2_MIN);
				var a = ALPHA_MIN + Math.random()*(ALPHA_MAX-ALPHA_MIN);
				var s = generateRound('black', r1, r1+r2).set({
					x: Math.random()*WIDTH,
					y: Math.random()*HEIGHT,
					alpha: 0
				});
				container.addChild(s);
				rounds.push({
					s: s,
					isAdd: true,
					a: a
				});
			}
			for(var i=0; i<rounds.length; i++) {
				var r = rounds[i];
				if(r.isAdd) {
					r.s.alpha += SPEED;
					if(r.s.alpha >= r.a)
						r.isAdd = false;
				} else {
					r.s.alpha -= SPEED;
				}
				if(r.s.alpha < 0) {
					container.removeChild(r.s);
					rounds.splice(i, 1);
					i--;
				}
			}
		});
		return container;
	};

	// show map
	var storyLoopEnd = function(){
		if(MOBILE) game.stage.removeTouchAreas();

		// save progress
		if(game.settings.levelReached < level)
			game.settings.levelReached = level;
		game.saveSettings();

		// init
		var meHpMax = ME_HP_MAX[game.settings.difficulty];
		var meHp = game.ctrl[level].hp || meHpMax;
		var map = parseMap(level);
		var mePicture = null;
		var herPicture = null;
		var herColor = (game.ctrl[level].herColorLight ? HER_COLOR_LIGHT : HER_COLOR);
		var meColor = (game.ctrl[level].meColorLight ? ME_COLOR_LIGHT : ME_COLOR);
		mePicture = generatePerson(game.ctrl[level].player == 2 ? herColor : meColor);
		if (game.ctrl[level].p2) {
			// two role
			herPicture = generatePerson(game.ctrl[level].player == 1 ? herColor : meColor)
		}
		var lights = map.lights;
		userCtrlReset();

		// auto pause
		createjs.Ticker.addEventListener('tick', function(){
			if(!game.focused && !userCtrl.paused) {
				pause();
				userCtrl.up = 0;
				userCtrl.down = 0;
				userCtrl.left = 0;
				userCtrl.right = 0;
				userCtrl.relX = 0;
				userCtrl.relY = 0;
			}
		});

		// end level
		var levelEnd = function(endFunc){
			createjs.Ticker.removeAllEventListeners('tick');
			var fadingRect = (new createjs.Shape()).set({alpha: 0});
			fadingRect.graphics.f('black').r(0,0,WIDTH,HEIGHT);
			game.stage.addChild(fadingRect);
			var fadingAni = function(){
				if(fadingRect.alpha >= 1) {
					createjs.Ticker.removeEventListener('tick', fadingAni);
					game.stage.removeAllChildren();
					game.stage.removeTouchAreas();
					endFunc();
					return;
				}
				fadingRect.alpha += 0.02;
				game.stage.update();
			};
			createjs.Ticker.addEventListener('tick', fadingAni);
		};
		var resetLevel = function(){
			levelEnd(storyLoopEnd);
		};
		var doneLevel = function(){
			game.settings.curLevel++;
			if(controlConfig.bgFadeout) {
				var fadeFrame = controlConfig.bgFadeout;
				var fadeStep = controlConfig.bgFadeoutStep;
				createjs.Ticker.addEventListener('tick', function(){
					if(userCtrl.paused) return;
					game.stage.dirtyRect(0, 0, WIDTH, HEIGHT);
					map.picture.alpha -= fadeStep;
					lightsLayer.alpha -= fadeStep;
					if(!MOBILE) cloudsLayer.alpha -= fadeStep;
					fadeFrame--;
					if(!fadeFrame) levelEnd(function(){
						startLevel(game.settings.curLevel);
					});
				});
				return;
			}
			levelEnd(function(){
				startLevel(game.settings.curLevel);
			});
		};
		var skipLevel = function(t){
			if(t < 0) {
				// return cover
				levelEnd(function(){
					startLevel(-1);
				});
			} else {
				// to level
				game.settings.curLevel = t;
				game.saveSettings();
				levelEnd(function(){
					startLevel(game.settings.curLevel);
				});
			}
		};

		// pause
		var pauseLayer = new createjs.Container();
		pauseLayer.addChild( new createjs.Shape(
			(new createjs.Graphics()).f('rgba(0,0,0,0.7)').r(0,0,WIDTH,HEIGHT)
		) );
		var pauseLayerFrame = new createjs.Container();
		pauseLayer.addChild(pauseLayerFrame);
		if(MOBILE) {
			pauseLayerFrame.x = WIDTH/2 - 350;
			pauseLayerFrame.y = HEIGHT/2 - 210;
			pauseLayerFrame.scaleX = 1.4;
			pauseLayerFrame.scaleY = 1.4;
			var pauseLayerTouchArea = function(x, y, w, h, cb){
				game.stage.addTouchArea(x * 1.4 + WIDTH/2 - 350, y * 1.4 + HEIGHT/2 - 210, w * 1.4, h * 1.4, cb);
			};
		} else {
			pauseLayerFrame.x = WIDTH/2 - 250;
			pauseLayerFrame.y = HEIGHT/2 - 150;
		}
		var pauseLayerBackground = (new createjs.Shape(
			(new createjs.Graphics()).f('rgba(255,255,255,0.7)').r(0,0,500,300)
		)).set({filters: [ new createjs.BlurFilter(10,10,4) ]});
		pauseLayerBackground.cache(-10,-10,520,320);
		pauseLayerFrame.addChild(pauseLayerBackground);
		pauseLayerFrame.addChild(new createjs.Shape(
			(new createjs.Graphics()).f('rgba(64,64,64,0.7)').r(30,80,440,3)
		));
		if(MOBILE) {
			var pauseLayerContinue = (new createjs.Text('CONTINUE', '20px'+game.lang.font, 'black')).set({
				textAlign: 'left',
				textBaseline: 'top',
				x: 50,
				y: 50
			});
			pauseLayerFrame.addChild( pauseLayerContinue );
			var pauseLayerCover = (new createjs.Text('COVER', '20px'+game.lang.font, 'rgb(64,64,64)')).set({
				textAlign: 'right',
				textBaseline: 'top',
				x: 450,
				y: 50
			});
			pauseLayerFrame.addChild( pauseLayerCover );
		} else {
			pauseLayerFrame.addChild( (new createjs.Text(game.str[23], '20px'+game.lang.font, 'black')).set({
				textAlign: 'center',
				textBaseline: 'top',
				x: 250,
				y: 40
			}) );
			pauseLayerFrame.addChild( (new createjs.Text(game.str[24], '16px'+game.lang.font, 'rgb(64,64,64)')).set({
				textAlign: 'center',
				textBaseline: 'bottom',
				x: 250,
				y: 270
			}) );
		}
		var levelLinkFrame = new createjs.Container();
		pauseLayerFrame.addChild(levelLinkFrame);
		var levelLinkSelected = 0;
		var levelLink = function(centerX, centerY, text, selected, specialColor){
			if(selected)
				levelLinkFrame.addChild( (new createjs.Shape(
					(new createjs.Graphics()).ss(2).s('rgb(128,128,128)').f(specialColor || 'rgb(128,128,128)')
					.r(-20+centerX,-20+centerY,40,40)
				)) );
			else
				levelLinkFrame.addChild( (new createjs.Shape(
					(new createjs.Graphics()).ss(2).s('rgb(128,128,128)')
					.r(-20+centerX,-20+centerY,40,40)
				)) );
			levelLinkFrame.addChild( new createjs.Text(text, '16px'+game.lang.font, (specialColor ? HER_COLOR : 'black')).set({
				textAlign: 'center',
				textBaseline: 'middle',
				x: centerX,
				y: centerY
			}) );
		};
		var levelLinksUpdate = function(){
			levelLinkFrame.removeAllChildren();
			for(var i=0; i<=game.settings.levelReached; i++) {
				var r = Math.floor(i/7) + 1;
				var c = i%7 + 1;
				if(i === 21) {
					r = 3;
					c = 8;
				}
				levelLink(c*50+25, r*50+70, i+1, (i === levelLinkSelected), (game.ctrl[i].player === 2 ? HER_COLOR_LIGHT : (game.ctrl[i].meColorLight ? ME_COLOR_LIGHT : null)));
			}
		};
		var pauseLayerShown = false;
		var pauseArrowKey = false;
		createjs.Ticker.addEventListener('tick', function(){
			// show or hide frame
			if(userCtrl.paused && !pauseLayerShown) {
				game.stage.addChild(pauseLayer);
				if(MOBILE) game.stage.alterTouchAreas();
				pauseLayerShown = true;
				if(game.settings.musicOn)
					createjs.Sound.setVolume(game.settings.volume*0.003);
				levelLinkSelected = game.settings.curLevel;
				levelLinksUpdate();
				game.stage.update();
			} else if(!userCtrl.paused && pauseLayerShown) {
				game.stage.removeChild(pauseLayer);
				if(MOBILE) game.stage.alterTouchAreas();
				pauseLayerShown = false;
				if(game.settings.musicOn)
					createjs.Sound.setVolume(game.settings.volume/100);
			}
			if(!userCtrl.paused) {
				userCtrl.skip = false;
				return;
			}
			// update level link
			if(!pauseArrowKey) {
				if(userCtrl.up && levelLinkSelected>=7 && levelLinkSelected<=20)
					levelLinkSelected -= 7;
				if(userCtrl.down && levelLinkSelected<=13 && levelLinkSelected<=game.settings.levelReached-7)
					levelLinkSelected += 7;
				if(userCtrl.left && levelLinkSelected>=1) levelLinkSelected--;
				if(userCtrl.right && levelLinkSelected<game.settings.levelReached) levelLinkSelected++;
				if(userCtrl.up || userCtrl.down || userCtrl.left || userCtrl.right) {
					pauseArrowKey = true;
					levelLinksUpdate();
					game.stage.update();
				}
			} else {
				if(!(userCtrl.up || userCtrl.down || userCtrl.left || userCtrl.right)) pauseArrowKey = false;
			}
			// action or reset
			if(userCtrl.skip) {
				userCtrl.skip = false;
				if(levelLinkSelected === game.settings.curLevel) {
					setTimeout(function(){
						unpause();
						if(game.settings.musicOn)
							createjs.Sound.setVolume(game.settings.volume/100);
					}, 0);
				} else {
					setTimeout(function(){
						unpause();
						if(game.settings.musicOn)
							createjs.Sound.setVolume(game.settings.volume/100);
						skipLevel(levelLinkSelected);
					}, 0);
				}
			} else if(userCtrl.reset) {
				userCtrl.reset = false;
				setTimeout(function(){
					unpause();
					if(game.settings.musicOn)
						createjs.Sound.setVolume(game.settings.volume/100);
					skipLevel(-1);
				}, 0);
			}
		});
		if(MOBILE) {
			// pause layer touch areas
			game.stage.alterTouchAreas();
			// continue
			var rect = pauseLayerContinue.getBounds();
			pauseLayerTouchArea(pauseLayerContinue.x, pauseLayerContinue.y, rect.width, rect.height, function(){
				if(!userCtrl.paused) return;
				unpause();
			});
			// cover
			rect = pauseLayerCover.getBounds();
			pauseLayerTouchArea(pauseLayerCover.x-rect.width, pauseLayerCover.y, rect.width, rect.height, function(){
				if(!userCtrl.paused) return;
				userCtrl.reset = true;
				pauseLayerCover.color = '#000';
			});
			// level links
			for(var i=0; i<=game.settings.levelReached; i++) {
				var r = Math.floor(i/7) + 1;
				var c = i%7 + 1;
				if(i === 21) {
					r = 3;
					c = 8;
				}
				(function(c,r,i){
					pauseLayerTouchArea(c*50+25-20, r*50+70-20, 40, 40, function(){
						if(!userCtrl.paused) return;
						levelLinkSelected = i;
						levelLinksUpdate();
						userCtrl.skip = true;
					});
				})(c,r,i);
			}
			game.stage.alterTouchAreas();
		}

		// reset
		createjs.Ticker.addEventListener('tick', function(){
			if(userCtrl.paused || userCtrl.animating || !userCtrl.reset) return;
			resetLevel();
			userCtrl.reset = false;
		});

		// reach an end point
		var levelEndIndex = 0;
		var levelEndpoint = function(){
			// check end point and animate
			var ani = game.ctrl[level].ani;
			if (ani && ani[levelEndIndex]) {
				var aniInfo = ani[levelEndIndex];
				var speed = aniInfo.speed;

				var d1x = aniInfo.end1[0] - mePicture.x;
				var d1y = aniInfo.end1[1] - mePicture.y;
				var angle1 = (Math.abs(d1x) > 0.01) ? Math.atan(Math.abs(d1y/d1x)) : Math.PI/2;
				var xspeed1 = speed * Math.cos(angle1);
				var yspeed1 = speed * Math.sin(angle1);
				var ox1 = mePicture.x;
				var oy1 = mePicture.y;
				if (d1x < 0) xspeed1 = -xspeed1;
				if (d1y < 0) yspeed1 = -yspeed1;

				if (herPicture) {
					var d2x = aniInfo.end2[0] - herPicture.x;
					var d2y = aniInfo.end2[1] - herPicture.y;
					var angle2 = (Math.abs(d2x) > 0.01) ? Math.atan(Math.abs(d2y/d2x)) : Math.PI/2;
					var xspeed2 = speed * Math.cos(angle2);
					var yspeed2 = speed * Math.sin(angle2);
					var ox2 = herPicture.x;
					var oy2 = herPicture.y;
					if (d2x < 0) xspeed2 = -xspeed2;
					if (d2y < 0) yspeed2 = -yspeed2;
				}

				startAnimate();
				var totalFrame = Math.floor(Math.abs(d1x) > Math.abs(d1y) ? d1x / xspeed1 : d1y / yspeed1);
				if(herPicture) var totalFrame2 = Math.floor(Math.abs(d2x) > Math.abs(d2y) ? d2x / xspeed2 : d2y / yspeed2);
				else var totalFrame2 = 0;
				var curFrame = 0;
				var tickFn = function() {
					if (userCtrl.paused) return;
					if (curFrame < totalFrame || curFrame < totalFrame2) {
						if(curFrame < totalFrame) {
							mePicture.x = ox1 + curFrame * xspeed1;
							mePicture.y = oy1 + curFrame * yspeed1;
						}
						if(curFrame < totalFrame2) {
							herPicture.x = ox2 + curFrame * xspeed2;
							herPicture.y = oy2 + curFrame * yspeed2;
						}
						++curFrame;
					} else {
						createjs.Ticker.removeEventListener('tick', tickFn);
						endAnimate();
						if (aniInfo.doneLevel) {
							doneLevel();
						}
					}
				}
				createjs.Ticker.addEventListener('tick', tickFn);
			}
			// show text
			var textInfo = game.words[level].ends[levelEndIndex++];
			map.nextPicture();
			if(textInfo) {
				// show text in map
				var text = new createjs.Text();
				text.font = MAP_TEXT_FONT_SIZE+'px'+game.lang.font;
				text.lineHeight = 36;
				text.color = textInfo[4] || (controlConfig.player === 2 ? HER_COLOR_LIGHT : '#fff');
				text.text = (MOBILE && textInfo[5]) || textInfo[0];
				text.textAlign = textInfo[3] || 'center';
				text.textBaseline = 'middle';
				text.x = textInfo[1] || 480;
				text.y = textInfo[2] || 270;
				text.filters = [ new createjs.BlurFilter(2,2,1) ];
				if(text.textAlign === 'left')
					text.cache(0, -20, 960, 40);
				else if(text.textAlign === 'center')
					text.cache(-480, -20, 960, 40);
				else if(text.textAlign === 'right')
					text.cache(-960, -20, 960, 40);
				mapTextLayer.removeAllChildren();
				mapTextLayer.addChild(text);
				text.alpha = 0;
				var fadeInStep = function(){
					text.alpha += 0.03;
					if(text.alpha >= 1) createjs.Ticker.removeEventListener('tick', fadeInStep);
				};
				createjs.Ticker.addEventListener('tick', fadeInStep);
				if(!map.endX.length) {
					// end level in several seconds
					startAnimate();
					var waitTicks = 128;
					createjs.Ticker.addEventListener('tick', function(){
						if (userCtrl.paused) return ;
						waitTicks--;
						if(!waitTicks) {
							endAnimate();
							doneLevel();
						}
					});
				}
			} else if(!map.endX.length) {
				doneLevel();
			}
		};

		// calc hp
		var lightHurt = game.ctrl[level].lightHurt;
		if(typeof(lightHurt) === 'undefined') lightHurt = 1;
		createjs.Ticker.addEventListener('tick', function(){
			if(userCtrl.paused || userCtrl.animating) return;
			if(running && level > 1) meHp -= ME_ACTION_DAMAGE;
			for(var i=0; !controlConfig.noRun && i<lights.length; i++) {
				var a = lights[i];
				var dx = a.x - mePicture.x;
				var dy = a.y - mePicture.y;
				var d = Math.sqrt(dx*dx + dy*dy) - ME_R;
				if(d <= a.r) {
					if(a.r-d > ME_R*2)
						meHp -= ME_R*2*ME_DAMAGE_PER_R*lightHurt;
					else
						meHp -= (a.r-d)*ME_DAMAGE_PER_R*lightHurt;
				}
				if(follower) {
					dx = a.x - follower.x;
					dy = a.y - follower.y;
					var d2 = Math.sqrt(dx*dx + dy*dy) - ME_R;
					if(d2 <= a.r) {
						if(a.r-d2 > ME_R*2)
							meHp -= ME_R*2*ME_DAMAGE_PER_R*lightHurt * 0.5;
						else
							meHp -= (a.r-d2)*ME_DAMAGE_PER_R*lightHurt * 0.5;
					}
				}
			}
			if(meHp <= 0) {
				if(game.ctrl[level].diePass) doneLevel();
				else resetLevel();
			}
			// check end
			var dx = map.endX[0] - mePicture.x;
			var dy = map.endY[0] - mePicture.y;
			if( dx*dx + dy*dy <= 4*ME_R*ME_R ) {
				map.endX.shift();
				map.endY.shift();
				levelEndpoint();
			}
		});

		// handling moves
		var actionAni = false;
		var shadowList = [];
		var running = false;
		var prevCtrlX = 0;
		var prevCtrlY = 0;
		createjs.Ticker.addEventListener('tick', function(){
			running = false;
			if(userCtrl.paused || userCtrl.animating) return;
			// move
			var x = 0;
			var y = 0;
			if(userCtrl.relX || userCtrl.relY) {
				x = userCtrl.relX;
				y = userCtrl.relY;
			} else {
				if(userCtrl.up) y--;
				if(userCtrl.down) y++;
				if(userCtrl.left) x--;
				if(userCtrl.right) x++;
			}
			if (controlConfig.onlyRight) {
				if(x < 0) x = 0;
				y = 0;
			}
			if (controlConfig.noStop && !x && !y) {
				x = prevCtrlX;
				y = prevCtrlY;
			} else if(controlConfig.noStop) {
				prevCtrlX = x;
				prevCtrlY = y;
			}
			if(controlConfig.mustRun || (userCtrl.action && !controlConfig.noRun)) {
				// allow run when `ctrl.noRun` is false
				if(!actionAni) {
					actionAni = true;
					mePicture.gotoAndPlay('fast');
				}
				if(x !== 0 || y !== 0) {
					var xyr = Math.sqrt(x*x + y*y);
					var p = Math.acos(x/xyr);
					if(y < 0) p = 2*Math.PI - p;
					p += Math.random()*ME_ACTION_DIF*2 - ME_ACTION_DIF;
					x = ME_MOVE_SPEED * Math.cos(p);
					y = ME_MOVE_SPEED * Math.sin(p);
					running = true;
				}
			} else {
				// standard move
				if(actionAni) {
					actionAni = false;
					mePicture.gotoAndPlay('normal');
				}
				if(x || y) {
					var xyr = Math.sqrt(x*x + y*y);
					if(xyr < ME_MOVE_SPEED && (userCtrl.relX || userCtrl.relY)) {
						x = 0;
						y = 0;
					}
					x /= xyr;
					y /= xyr;
				}
				x *= ME_MOVE_SPEED;
				y *= ME_MOVE_SPEED;
			}
			if (controlConfig.slow) {
				x *= ME_SLOW_RATE;
				y *= ME_SLOW_RATE;
			}
			// check walls
			if(x || y) {
				var bx = mePicture.x;
				var by = mePicture.y;
				for(var mul = (running?2:1); mul; mul--) {
					var px = bx + x;
					var py = by + y;
					var checkWall = function(x, y){
						// map borders
						if(x < ME_R || y < ME_R || x >= WIDTH-ME_R || y >= HEIGHT-ME_R) return true;
						// center cannot run into blurred wall
						var cx = Math.floor(x/6);
						var cy = Math.floor(y/6);
						if( map.wall[ cx + cy*160 ] ) return true;
						// border cannot run into wall
						for(var px=cx-1; px<=cx+2; px++) {
							for(var py=cy-1; py<=cy+2; py++) {
								var dx = px*6 - x;
								var dy = py*6 - y;
								if(dx*dx + dy*dy > 143) continue;
								if( map.wall[ (px-1) + (py-1)*160 ] > 1 ) return true;
								if( map.wall[ (px-1) + py*160 ] > 1 ) return true;
								if( map.wall[ px + (py-1)*160 ] > 1 ) return true;
								if( map.wall[ px + py*160 ] > 1 ) return true;
							}
						}
						return false;
					};
					if(checkWall(px, py)) {
						var candidatePoints = [];
						if(y <= 0) candidatePoints.push([px, (Math.floor(py/6))*6 + 6]);
						if(y >= 0) candidatePoints.push([px, (Math.floor(py/6))*6 - 1e-3]);
						if(x <= 0) candidatePoints.push([(Math.floor(px/6))*6 + 6, py]);
						if(x >= 0) candidatePoints.push([(Math.floor(px/6))*6 - 1e-3, py]);
						for(var i=0; i<candidatePoints.length; i++) {
							px = candidatePoints[i][0];
							py = candidatePoints[i][1];
							if(!checkWall(px, py)) break;
						}
						if(i === candidatePoints.length) {
							px = bx;
							py = by;
							break;
						}
					}
					bx = px;
					by = py;
				}
				if (px - mePicture.x || py - mePicture.y) {
					mePicture.x = px;
					mePicture.y = py;
					// add person's shadow
					if (controlConfig.shadow) {
						var shadow = new createjs.Shape();
						shadow.graphics.f('#808080').dc(mePicture.x, mePicture.y, ME_S_R);
						shadow.alpha = ME_S_START_ALPHA;
						shadowList.push(shadow);
						meShadow.addChild(shadow);
					}
					if (controlConfig.fog) {
						fog.x = px;
						fog.y = py;
					}
				}
			}
			// check the shadow
			if (controlConfig.shadow) {
				for (var si = 0, sl = shadowList.length; si < sl; si++) {
					shadowList[si].alpha -= ME_S_DES_PER_FRAME;
				}
			}
			var oldestShadow = shadowList[0];
			if (oldestShadow && oldestShadow.alpha <= 0) {
				meShadow.removeChild(oldestShadow);
				shadowList.shift();
			}
		});

		// show map
		game.stage.addChild(map.picture);

		// add her following me if needed
		var follower = null;
		if(controlConfig.follow) {
			var follower = generatePerson(HER_COLOR);
			follower.x = map.startX - 24;
			follower.y = map.startY;
			follower.gotoAndPlay('normal');
			game.stage.addChild(follower);
			var FOLLOW_LATENCY = 10;
			var followPos = [];
			createjs.Ticker.addEventListener('tick', function(){
				if(userCtrl.paused) return;
				followPos.push([mePicture.x, mePicture.y]);
				while(followPos.length > FOLLOW_LATENCY) {
					var pos = followPos[0];
					var dx = pos[0] - mePicture.x;
					var dy = pos[1] - mePicture.y;
					if(dx*dx + dy*dy < 24*24) break;
					follower.x = pos[0];
					follower.y = pos[1];
					followPos.shift();
				}
			});
		}

		// show me
		game.stage.addChild(mePicture);
		mePicture.x = map.startX;
		mePicture.y = map.startY;
		mePicture.gotoAndPlay('normal');
		if (herPicture) {
			game.stage.addChild(herPicture);
			herPicture.x = game.ctrl[level].p2[0];
			herPicture.y = game.ctrl[level].p2[1];
			herPicture.gotoAndPlay('normal');
		}
		if (controlConfig.shadow) {
			var meShadow = new createjs.Container();
			game.stage.addChild(meShadow);
		}

		// add a fog layer
		if (controlConfig.fog) {
			var fog = new createjs.Shape();
			fog.graphics.f('white').dc(0, 0, FOG_R-8);
			fog.filters = [ new createjs.BlurFilter(8,8,1) ];
			fog.cache(-FOG_R, -FOG_R, 2*FOG_R, 2*FOG_R);
			fog.compositeOperation = 'destination-in';
			fog.x = mePicture.x;
			fog.y = mePicture.y;
			var fogBackground = new createjs.Shape();
			fogBackground.graphics.f('rgb(128,128,128)').r(8, 8, WIDTH-16, HEIGHT-16);
			fogBackground.filters = [ new createjs.BlurFilter(8,8,1) ];
			fogBackground.cache(0, 0, WIDTH, HEIGHT);
			fogBackground.compositeOperation = 'destination-over';
			game.stage.addChild(fog);
			game.stage.addChild(fogBackground);
		}

		// add flash layer
		var lightsLayer = new createjs.Container().set({x:0,y:0});
		game.stage.addChild(lightsLayer);
		if(!MOBILE && controlConfig.flash) {
			var flash = new createjs.Shape().set({alpha: FLASH_ALPHA_MAX});;
			flash.graphics.f('black').dr(0, 0, WIDTH, HEIGHT);
			game.stage.addChild(flash);
			var sp = -0.005;
			createjs.Ticker.addEventListener('tick', function() {
				if(userCtrl.paused) return;
				flash.alpha += sp;
				if (flash.alpha >= FLASH_ALPHA_MAX) {
					sp = -0.005 * (0.5 + Math.random());
				}
				if (flash.alpha <= FLASH_ALPHA_MIN) {
					sp  = 0.005 * (0.5 + Math.random());
				}
			});
		}

		// update lights
		var lightsSpeed = LIGHTS_SPEED[game.settings.difficulty];
		var lightsPos = [];
		createjs.Ticker.addEventListener('tick', function(){
			if(userCtrl.paused) return;
			// mark dirty
			for(var i=0; i<lightsPos.length; i++) {
				var r = lightsPos[i][0] + 6;
				var x = lightsPos[i][1];
				var y = lightsPos[i][2];
			}
			lightsPos = [];
			// redraw lights
			lightsLayer.removeAllChildren();
			for(var i=0; i<lights.length; i++) {
				var a = lights[i];
				// random size
				var P_CHANGE = 0.5;
				if(a.rmax > a.rmin) {
					if(Math.random() < P_STATE_CHANGE[game.settings.difficulty]*2) {
						var p = Math.random();
						if(p < P_CHANGE) {
							var p1 = (a.r-a.rmin)/(a.rori-a.rmin);
							if(a.rori === a.rmin)
								p1 = (a.r-a.rmin)*1e6;
							var p2 = (a.r-a.rmax)/(a.rori-a.rmax);
							if(a.rori === a.rmax)
								p2 = (a.r-a.rmax)*1e6;
							if(p/P_CHANGE < p1/(p1+p2))
								a.sizeState = -Math.random()*lightsSpeed*a.speed;
							else
								a.sizeState = Math.random()*lightsSpeed*a.speed;
						} else {
							a.sizeState = 0;
						}
					}
				}
				a.r += a.sizeState;
				if(a.r >= a.rmax) a.r = a.rmax;
				if(a.r <= a.rmin) a.r = a.rmin;
				// random moving
				if(a.area) {
					if(Math.random() < P_STATE_CHANGE[game.settings.difficulty]) {
						var p = Math.random()*Math.PI*2;
						var q = Math.random()*a.area;
						var dx = Math.cos(p)*q + a.xori;
						var dy = Math.sin(p)*q + a.yori;
						var d = Math.sqrt( (dx-a.x)*(dx-a.x) + (dy-a.y)*(dy-a.y) );
						a.moveX = (dx-a.x)*lightsSpeed*a.speed/d;
						a.moveY = (dy-a.y)*lightsSpeed*a.speed/d;
					}
					a.x += a.moveX;
					a.y += a.moveY;
					if( (a.x-a.xori)*(a.x-a.xori) + (a.y-a.yori)*(a.y-a.yori) > a.area*a.area ) {
						a.x -= a.moveX;
						a.y -= a.moveY;
						a.moveX = 0;
						a.moveY = 0;
					}
				}
				// draw
				lightsLayer.addChild(generateLight(Math.round(a.r), a.x, a.y));
				lightsPos.push([Math.round(a.r), a.x, a.y]);
			}
		});

		// add a layer for texts above map
		var mapTextLayer = new createjs.Container().set({x:0,y:0});
		game.stage.addChild(mapTextLayer);

		// show clouds
		if(!MOBILE) var cloudsLayer = cloudsStart();

		// show hp from level 1
		if(level > 0) {
			var hpBackground = new createjs.Shape();
			hpBackground.graphics.f('black').r(0,0,8,100);
			hpBackground.filters = [ new createjs.BlurFilter(3,3,1) ];
			hpBackground.cache(-7,-7,22,114);
			var hpOutline = new createjs.Shape();
			hpOutline.graphics.ss(1).s('#fff').f('black').r(0,0,8,100);
			hpOutline.cache(0,0,8,100);
			var hpShape = new createjs.Shape();
			var h = 100*meHp/meHpMax;
			hpShape.graphics.f('#fff').r(0,100-h,8,h);
			var hpPicture = new createjs.Container().set({x:50, y:50, alpha:0.3});
			if(MOBILE) {
				hpPicture.scaleX = hpPicture.scaleY = 1.5;
				hpPicture.x = hpPicture.y = 35;
			}
			if(map.white) whiteMap.alpha = 1.3 - hpPicture.alpha;
			hpPicture.addChild(hpBackground);
			hpPicture.addChild(hpOutline);
			hpPicture.addChild(hpShape);
			game.stage.addChild(hpPicture);
			if(controlConfig.noRun) hpPicture.alpha = 0;
			var meHpOri = meHp;
			var hpShapeAni = 0;
			var HP_SHAPE_ANI_SPEED = 0.03;
			createjs.Ticker.addEventListener('tick', function(){
				if(userCtrl.paused || userCtrl.animating) return;
				if(hpPicture.alpha <= 0.3)
					hpShapeAni = 0;
				if(meHp < meHpOri) {
					meHpOri = meHp;
					var h = 100*meHp/meHpMax;
					if(h > 0)
						hpShape.graphics.c().f('#fff').r(0,100-h,8,h);
					else
						hpShape.graphics.c();
					if(hpShapeAni <= 0) hpShapeAni = 1;
				}
				if(hpPicture.alpha >= 0.8)
					hpShapeAni = -1;
				if(hpShapeAni === 1) {
					hpPicture.alpha += HP_SHAPE_ANI_SPEED;
					if(map.white) whiteMap.alpha = 1.3 - hpPicture.alpha;
				} else if(hpShapeAni === -1) {
					hpPicture.alpha -= HP_SHAPE_ANI_SPEED;
					if(map.white) whiteMap.alpha = 1.3 - hpPicture.alpha;
				}
			});
		}

		// show circles for touch control
		if(MOBILE) {
			// show direction control
			var touchCtrlBackground = new createjs.Shape();
			touchCtrlBackground.graphics.setStrokeStyle(12).s('rgba(255,255,255,1)').f('rgba(255,255,255,0.25)');
			if(controlConfig.ctrlColorDark) touchCtrlBackground.graphics.s('rgba(64,64,64,1)').f('rgba(64,64,64,0.25)');
			touchCtrlBackground.graphics.dc(0, 0, TOUCH_CTRL_R-6);
			touchCtrlBackground.filters = [ new createjs.BlurFilter(2,2,1) ];
			touchCtrlBackground.cache(-TOUCH_CTRL_R-10, -TOUCH_CTRL_R-10, TOUCH_CTRL_R*2+20, TOUCH_CTRL_R*2+20);
			var touchCtrlCur = new createjs.Shape();
			touchCtrlCur.graphics.f( controlConfig.ctrlColorDark ? 'rgba(64,64,64,0.75)' : 'rgba(255,255,255,0.75)').dc(0, 0, 30);
			touchCtrlCur.filters = [ new createjs.BlurFilter(6,6,2) ];
			touchCtrlCur.cache(-38, -38, 76, 76);
			var touchCtrl = new createjs.Container();
			touchCtrl.x = TOUCH_CTRL_X;
			touchCtrl.y = TOUCH_CTRL_Y;
			touchCtrl.alpha = 0.4;
			touchCtrl.addChild(touchCtrlCur);
			touchCtrl.addChild(touchCtrlBackground);
			game.stage.addChild(touchCtrl);
			createjs.Ticker.addEventListener('tick', function(){
				game.stage.dirtyRect(TOUCH_CTRL_X-TOUCH_CTRL_R-10, TOUCH_CTRL_Y-TOUCH_CTRL_R-10, TOUCH_CTRL_R*2+20, TOUCH_CTRL_R*2+20);
				var x = userCtrl.relX;
				var y = userCtrl.relY;
				if(!x && !y) {
					touchCtrlCur.x = 0;
					touchCtrlCur.y = 0;
				}
				touchCtrlCur.x = x;
				touchCtrlCur.y = y;
			});
			// direction events
			game.stage.addTouchArea(TOUCH_CTRL_X-TOUCH_CTRL_R, TOUCH_CTRL_Y-TOUCH_CTRL_R, TOUCH_CTRL_R*2, TOUCH_CTRL_R*2, function(type, stageX, stageY){
				if(type === 'end') {
					userCtrl.relX = x;
					userCtrl.relY = y;
					return;
				}
				var x = stageX - TOUCH_CTRL_X;
				var y = stageY - TOUCH_CTRL_Y;
				var r = Math.sqrt(x*x+y*y);
				if(r > TOUCH_CTRL_R || r < TOUCH_CTRL_R*0.25) {
					userCtrl.relX = 0;
					userCtrl.relY = 0;
				} else {
					userCtrl.relX = x;
					userCtrl.relY = y;
				}
			});
			// show pause control
			var pauseCtrlCur = new createjs.Shape();
			pauseCtrlCur.graphics.setStrokeStyle(6).s('rgba(255,255,255,1)').f('rgba(255,255,255,0.25)');
			if(controlConfig.ctrlColorDark) pauseCtrlCur.graphics.s('rgba(64,64,64,1)').f('rgba(64,64,64,0.25)');
			pauseCtrlCur.graphics.dc(0, 0, PAUSE_CTRL_R-3);
			pauseCtrlCur.graphics.setStrokeStyle(0).f('rgba(255,255,255,1)');
			if(controlConfig.ctrlColorDark) pauseCtrlCur.graphics.f('rgba(64,64,64,1)');
			pauseCtrlCur.graphics.r(-6, -6, 12, 12);
			pauseCtrlCur.filters = [ new createjs.BlurFilter(2,2,1) ];
			pauseCtrlCur.cache(-PAUSE_CTRL_R-4, -PAUSE_CTRL_R-4, PAUSE_CTRL_R*2+8, PAUSE_CTRL_R*2+8);
			var pauseCtrl = new createjs.Container();
			pauseCtrl.x = PAUSE_CTRL_X;
			pauseCtrl.y = PAUSE_CTRL_Y;
			pauseCtrl.alpha = 0.4;
			pauseCtrl.addChild(pauseCtrlCur);
			game.stage.addChild(pauseCtrl);
			// pause events
			game.stage.addTouchArea(PAUSE_CTRL_X-PAUSE_CTRL_R, PAUSE_CTRL_Y-PAUSE_CTRL_R, PAUSE_CTRL_R*2, PAUSE_CTRL_R*2, function(type, stageX, stageY){
				if(type === 'end') {
					pause();
					return;
				}
			});
		}
		if(MOBILE && level > 1 && !controlConfig.noRun && !controlConfig.mustRun) {
			// show action control
			var actionCtrlCur = new createjs.Shape();
			actionCtrlCur.graphics.setStrokeStyle(6).s('rgba(255,255,255,1)').f('rgba(255,255,255,0.25)').dc(0, 0, ACTION_CTRL_R-3);
			actionCtrlCur.filters = [ new createjs.BlurFilter(2,2,1) ];
			actionCtrlCur.cache(-ACTION_CTRL_R-4, -ACTION_CTRL_R-4, ACTION_CTRL_R*2+8, ACTION_CTRL_R*2+8);
			var actionCtrl = new createjs.Container();
			actionCtrl.x = ACTION_CTRL_X;
			actionCtrl.y = ACTION_CTRL_Y;
			actionCtrl.alpha = 0.4;
			actionCtrl.addChild(actionCtrlCur);
			game.stage.addChild(actionCtrl);
			// action events
			game.stage.addTouchArea(ACTION_CTRL_X-ACTION_CTRL_R, ACTION_CTRL_Y-ACTION_CTRL_R, ACTION_CTRL_R*2, ACTION_CTRL_R*2, function(type, stageX, stageY){
				if(type === 'end') {
					userCtrl.action = false;
					return;
				}
				userCtrl.action = true;
			});
			createjs.Ticker.addEventListener('tick', function(){
				if(userCtrl.action) actionCtrl.alpha = 0.6;
				else actionCtrl.alpha = 0.4;
				if(userCtrl.relX || userCtrl.relY) touchCtrl.alpha = 0.6;
				else touchCtrl.alpha = 0.4;
			});
		}

		// fade in
		var fadingRect = new createjs.Shape().set({alpha: 1});
		fadingRect.graphics.f('black').r(0,0,WIDTH,HEIGHT);
		game.stage.addChild(fadingRect);
		var fadingAni = function(){
			if(userCtrl.paused) return;
			if(fadingRect.alpha <= 0) {
				createjs.Ticker.removeEventListener('tick', fadingAni);
				game.stage.removeChild(fadingRect);
				return;
			}
			fadingRect.alpha -= 0.04;
		};
		createjs.Ticker.addEventListener('tick', fadingAni);

		// update every tick
		createjs.Ticker.addEventListener('tick', function(){
			if(userCtrl.paused) return;
			game.stage.update();
		});

		// DEBUG
		if(DEBUG.SHOW_FPS) {
			var t = new createjs.Text('FPS: ...', '12px monospace', 'red');
			t.x = 0;
			t.y = 0;
			game.stage.addChild(t);
			createjs.Ticker.addEventListener('tick', function(){
				t.text = 'FPS: '+Math.round(createjs.Ticker.getMeasuredFPS());
			});
		}
	};

};

// init game ctrls

game.started = false;

game.start = function(){
	if(game.started) return;
	game.started = true;

	// set location hash
	if(location.href !== '#game') location.href = '#game';
	window.onhashchange = function(e){
		e.preventDefault();
		if(location.hash !== '#game') pause();
	};

	// update volume
	var updateVolume = function(){
		if(game.settings.musicOn) {
			createjs.Sound.setVolume(game.settings.volume/100);
			hint.show(game.str[25]+game.settings.volume, 1000);
		} else {
			createjs.Sound.setVolume(0);
			hint.show(game.str[26], 1000);
		}
		game.saveSettings();
	};

	// keyboard event handlers

	var keyPause = function(){
		if(userCtrl.paused) unpause();
		else pause();
	};
	var keyReset = function(){
		userCtrl.reset = true;
	};
	var keyMusicOn = function(){
		game.settings.musicOn = !game.settings.musicOn;
		updateVolume();
	};
	var keyVolumeUp = function(){
		if(game.settings.volume < 100) game.settings.volume += 10;
		updateVolume();
	};
	var keyVolumeDown = function(){
		if(game.settings.volume > 0) game.settings.volume -= 10;
		updateVolume();
	};
	var keySkip = function(){
		userCtrl.skip = true;
	};
	var keyStartAction = function(){
		userCtrl.action = true;
	};
	var keyStartUp = function(){
		userCtrl.up = 1;
	};
	var keyStartDown = function(){
		userCtrl.down = 1;
	};
	var keyStartLeft = function(){
		userCtrl.left = 1;
	};
	var keyStartRight = function(){
		userCtrl.right = 1;
	};
	var keyEndAction = function(){
		userCtrl.action = false;
	};
	var keyEndUp = function(){
		userCtrl.up = 0;
	};
	var keyEndDown = function(){
		userCtrl.down = 0;
	};
	var keyEndLeft = function(){
		userCtrl.left = 0;
	};
	var keyEndRight = function(){
		userCtrl.right = 0;
	};

	var keyDownFunc = {
		32: keyStartAction,
		38: keyStartUp,
		87: keyStartUp,
		40: keyStartDown,
		83: keyStartDown,
		37: keyStartLeft,
		65: keyStartLeft,
		39: keyStartRight,
		68: keyStartRight
	};

	var keyUpFunc = {
		19: keyPause,
		27: keyPause,
		80: keyPause,
		77: keyMusicOn,
		188: keyVolumeDown,
		190: keyVolumeUp,
		13: keySkip,
		82: keyReset,
		32: keyEndAction,
		38: keyEndUp,
		87: keyEndUp,
		40: keyEndDown,
		83: keyEndDown,
		37: keyEndLeft,
		65: keyEndLeft,
		39: keyEndRight,
		68: keyEndRight
	};

	// basic listeners
	game.keyDownFunc = function(e){
		if(keyDownFunc[e.keyCode]) {
			keyDownFunc[e.keyCode]();
			e.preventDefault();
		}
	};
	window.addEventListener('keydown', game.keyDownFunc, false);
	game.keyUpFunc = function(e){
		if(keyUpFunc[e.keyCode]) {
			keyUpFunc[e.keyCode]();
			e.preventDefault();
		}
	};
	window.addEventListener('keyup', game.keyUpFunc, false);
	game.blurFunc = function(e){
		pause();
	};

	// enter level
	game.stage.enableMouseOver(0);
	startLevel(game.settings.curLevel);

};
