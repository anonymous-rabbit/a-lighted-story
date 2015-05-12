// Copyright 2013 LastLeaf, MIT LICENSE
'use strict';

// consts

var FPS = 30;
var WIDTH = 960;
var HEIGHT = 540;
var USE_ADVANCED_LOADING = false;
var STORAGE_ID = 'a-lighted-story';
var STORAGE_VERSION = VERSION;
var DEFAULT_SETTINGS = {
	version: STORAGE_VERSION,
	musicOn: true,
	volume: 100,
	curLevel: 0,
	levelReached: 0,
	difficulty: 1,
	langs: ''
};

// global vars

window.game = {};
game.settings = null;
game.stage = null;
game.curMusic = -1;
game.focused = true;
var initResource = null;

// global funcs

game.saveSettings = function(){
	localStorage[STORAGE_ID] = JSON.stringify(game.settings);
};

game.createTextButton = function(text, fontSize, background, centerX, centerY, clickFunc){
	var button = new createjs.Container();
	var t1 = new createjs.Text(text, fontSize+'px'+game.lang.titleFont, MOBILE ? '#ccc' : '#888');
	var t2 = new createjs.Text(text, fontSize+'px'+game.lang.titleFont, '#00d2ff');
	var bg = new createjs.Shape();
	var width = t1.getMeasuredWidth() + 5;
	var height = t1.getMeasuredHeight() + 5;
	bg.graphics.s(background).f(background).r(-width/2, -height/2, width, height);
	button.addChild(bg, t1, t2);
	t1.lineHeight = height;
	t2.lineHeight = height;
	t1.textAlign = 'center';
	t2.textAlign = 'center';
	t1.textBaseline = 'middle';
	t2.textBaseline = 'middle';
	t2.visible = false;
	button.x = centerX;
	button.y = centerY;
	if(MOBILE) {
		// provide highlight methods in mobile mode
		button.highLight = function(h){
			if(h) {
				t2.visible = true;
				t1.visible = false;
			} else {
				t1.visible = true;
				t2.visible = false;
			}
		};
		button.applyMobileEvents = function(func){
			game.stage.addTouchArea(button.x-width/2, button.y-height/2, width, height, function(type){
				if(type === 'start') {
					button.highLight(true);
					(func || clickFunc)();
				} else if(type === 'end') {
					button.highLight(false);
				}
			});
		};
	} else {
		button.addEventListener('mouseover', function(){
			t2.visible = true;
			t1.visible = false;
		});
		button.addEventListener('mouseout', function(){
			t1.visible = true;
			t2.visible = false;
		});
		button.addEventListener('click', clickFunc);
	}
	return button;
};

// show cover

game.showCover = function(){
	var res = initResource;

	//init
	createjs.Ticker.setFPS(FPS);
	if(MOBILE) {
		game.stage.enableMouseOver(0);
	} else {
		game.stage.enableMouseOver(FPS);
	}

	// create author logo
	var lastleafLink = new createjs.Container();
	var bg = new createjs.Shape();
	bg.graphics.s('black').f('black').r(-5,-5,154,58);
	lastleafLink.addChild(bg,
		new createjs.Bitmap(res.getResult('lastleaf_grey')),
		new createjs.Bitmap(res.getResult('lastleaf'))
	);
	lastleafLink.getChildAt(1).alpha = 0.8;
	lastleafLink.getChildAt(2).visible = false;
	lastleafLink.x = 280;
	lastleafLink.y = -16;
	if(!MOBILE) {
		lastleafLink.scaleX = 0.6;
		lastleafLink.scaleY = 0.6;
	} else {
		lastleafLink.scaleX = 0.8;
		lastleafLink.scaleY = 0.8;
	}
	lastleafLink.addEventListener('mouseover', function(){
		lastleafLink.getChildAt(2).visible = true;
		lastleafLink.getChildAt(1).visible = false;
	});
	lastleafLink.addEventListener('mouseout', function(){
		lastleafLink.getChildAt(1).visible = true;
		lastleafLink.getChildAt(2).visible = false;
	});
	if(!MOBILE) {
		lastleafLink.addEventListener('click', function(){
			if(location.protocol !== 'resource:')
				window.open('http://lastleaf.me/');
		});
	}

	// create license link
	var licenseLink = game.createTextButton(game.str[3], MOBILE ? 24 : 16, '#000', -320, 0, function(){
		if(location.protocol !== 'resource:')
			window.open('license_'+game.settings.lang+'.html');
		else
			location.href = 'license_'+game.settings.lang+'.html?showback';
	});

	// create about link
	var aboutLink = game.createTextButton('CREDIT', MOBILE ? 24 : 16, '#000', -200, 0, function(){
		if(location.protocol !== 'resource:')
			window.open('credit.html');
		else
			location.href = 'credit.html?showback';
	});

	// create github link
	var githubLink = game.createTextButton('GitHub', MOBILE ? 24 : 16, '#000', -80, 0, function(){
		window.open('https://github.com/MistyMiracle/a-lighted-story');
	});

	// show subtitle
	var subtitle = game.createTextButton(game.str[4], MOBILE ? 24 : 16, '#000', 160, 0, function(){
		if(location.protocol !== 'resource:')
			window.open('http://github.com/LastLeaf/Tomorrow');
	});

	if(MOBILE) {
		lastleafLink.x = 770;
		lastleafLink.y = HEIGHT-62;
		game.stage.addChild(lastleafLink);
		subtitle.x = 600;
		subtitle.y = HEIGHT-40;
		game.stage.addChild(subtitle);
		licenseLink.x = 120;
		licenseLink.y = HEIGHT-40;
		game.stage.addChild(licenseLink);
		aboutLink.x = 240;
		aboutLink.y = HEIGHT-40;
		game.stage.addChild(aboutLink);
		githubLink.x = 360;
		githubLink.y = HEIGHT-40;
		game.stage.addChild(githubLink);
		game.stage.addTouchArea(lastleafLink.x, lastleafLink.y, 154*0.8, 58*0.8, function(type){
			if(type === 'start') window.open('http://lastleaf.me/');
		});
		subtitle.applyMobileEvents();
		licenseLink.applyMobileEvents();
		aboutLink.applyMobileEvents();
		githubLink.applyMobileEvents();
	} else {
		var bottomBar = new createjs.Container();
		bottomBar.x = WIDTH/2;
		bottomBar.y = HEIGHT-30;
		game.stage.addChild(bottomBar);
		bottomBar.addChild(lastleafLink);
		bottomBar.addChild(licenseLink);
		bottomBar.addChild(aboutLink);
		if(location.protocol !== 'resource:') {
			bottomBar.addChild(githubLink);
		}
		bottomBar.addChild(subtitle);
	}

	// show title
	document.title = 'A Lighted Story';
	var titleImg = new createjs.Bitmap(res.getResult('title'));
	game.stage.addChild(titleImg);
	titleImg.x = titleImg.cx = (WIDTH - titleImg.image.width) / 2;
	titleImg.y = titleImg.cy = 240 - titleImg.image.height;
	titleImg.alpha = 0.8;

	// show progress bar
	var progressBar = new createjs.Container();
	var p = new createjs.Shape();
	p.graphics.f('#222').r(0, 0, 800, 3);
	var progressShape = new createjs.Shape();
	var progress = progressShape.graphics;
	progress.f('#888').r(0, 0, 0, 3);
	var progressText = new createjs.Text(game.str[5], (MOBILE ? '32px' : '20px')+game.lang.titleFont, '#888');
	progressText.textAlign = 'center';
	progressText.textBaseline = 'middle';
	progressText.x = 400;
	progressText.y = 53;
	progressBar.addChild(
		p,
		progressShape,
		progressText
	);
	game.stage.addChild(progressBar);
	progressBar.textAlign = 'center';
	progressBar.x = (WIDTH-800) / 2;
	progressBar.y = 277;
	progressBar.isAlphaUp = false;
	createjs.Ticker.addEventListener('tick', function(){
		game.stage.dirtyRect(0, 310, 960, 350);
	});

	// animation
	var centeredMoving = function(cur, center, radius, acc){
		var dest = (Math.random()-0.5)*radius*2 + center;
		return (dest-cur)*acc + cur;
	};
	var titleAniCanPause = false;
	var titleAni = function(){
		titleImg.x = centeredMoving(titleImg.x, titleImg.cx, 8, 0.06);
		titleImg.y = centeredMoving(titleImg.y, titleImg.cy, 8, 0.06);
		titleImg.alpha = centeredMoving(titleImg.alpha, 0.75, 0.25, 0.25);
		if(progressBar.isAlphaUp) {
			progressBar.alpha += 0.02;
			if(progressBar.alpha >= 1) progressBar.isAlphaUp = false;
		} else {
			progressBar.alpha -= 0.02;
			if(progressBar.alpha <= 0.5) progressBar.isAlphaUp = true;
		}
		if(game.focused || !titleAniCanPause) {
			game.stage.update();
			if(game.mainResource) titleAniCanPause = true;
			else titleAniCanPause = false;
		}
	};
	createjs.Ticker.addEventListener('tick', titleAni);

	// loaded
	var resourceLoaded = function(e){
		var q = game.mainResource = e.target;
		progress.c().f('#888').r(0, 0, 800, 3);
		titleImg.image = q.getResult('tomorrow');
		// get results
		if(location.protocol !== 'file:' && location.protocol !== 'resource:') {
			game.maps = q.getResult('maps').split('\n');
			game.words = q.getResult('words');
			game.ctrl = q.getResult('ctrl');
		}
		// show language link
		var switchLang = function(newLang){
			game.settings.lang = newLang;
			game.saveSettings();
			game.lang = game.langs[newLang];
			game.str = game.lang.str;
			createjs.Ticker.removeAllEventListeners('tick');
			window.removeEventListener('keyup', coverKeyFunc);
			game.stage.removeAllChildren();
			game.stage.removeTouchAreas();
			game.mainResource = null;
			game.showCover();
		};
		if(MOBILE) {
			if(game.settings.lang === 'zh-CN')
				var langLink = game.createTextButton('English', 30, '#000', WIDTH/3, 410, function(){
					switchLang('en');
				});
			else
				var langLink = game.createTextButton('简体中文', 30, '#000', WIDTH/3, 410, function(){
					switchLang('zh-CN');
				});
			langLink.applyMobileEvents();
		} else {
			if(game.settings.lang === 'zh-CN')
				var langLink = game.createTextButton('English', 20, '#000', WIDTH/2, 450, function(){
					switchLang('en');
				});
			else
				var langLink = game.createTextButton('简体中文', 20, '#000', WIDTH/2, 450, function(){
					switchLang('zh-CN');
				});
		}
		// show difficulty button
		var fontSize = MOBILE ? 32 : 20;
		var fontX = MOBILE ? WIDTH*2/3 : WIDTH/2;
		var fontY = 410;
		var difficultyButton = [
			game.createTextButton(game.str[6], fontSize, '#000', fontX, 410, function(){
				difficultyButton[0].visible = false;
				difficultyButton[1].visible = true;
				game.settings.difficulty = 1;
				difficultyButton[1].dispatchEvent('mouseover');
			}),
			game.createTextButton(game.str[7], fontSize, '#000', fontX, 410, function(){
				difficultyButton[1].visible = false;
				difficultyButton[2].visible = true;
				game.settings.difficulty = 2;
				difficultyButton[2].dispatchEvent('mouseover');
			}),
			game.createTextButton(game.str[8], fontSize, '#000', fontX, 410, function(){
				difficultyButton[2].visible = false;
				difficultyButton[3].visible = true;
				game.settings.difficulty = 3;
				difficultyButton[3].dispatchEvent('mouseover');
			}),
			game.createTextButton(game.str[9], fontSize, '#000', fontX, 410, function(){
				difficultyButton[3].visible = false;
				difficultyButton[0].visible = true;
				game.settings.difficulty = 0;
				difficultyButton[0].dispatchEvent('mouseover');
			})
		];
		difficultyButton[0].addEventListener('mouseover', function(){
			hint.show(game.str[10], 3000);
		});
		difficultyButton[1].addEventListener('mouseover', function(){
			hint.show(game.str[11], 3000);
		});
		difficultyButton[2].addEventListener('mouseover', function(){
			hint.show(game.str[12], 3000);
		});
		difficultyButton[3].addEventListener('mouseover', function(){
			hint.show(game.str[13], 3000);
		});
		difficultyButton[0].set({visible: false}).addEventListener('mouseout', hint.hide);
		difficultyButton[1].set({visible: false}).addEventListener('mouseout', hint.hide);
		difficultyButton[2].set({visible: false}).addEventListener('mouseout', hint.hide);
		difficultyButton[3].set({visible: false}).addEventListener('mouseout', hint.hide);
		difficultyButton[game.settings.difficulty].visible = true;
		if(MOBILE) {
			difficultyButton[0].applyMobileEvents(function(){
				if(game.settings.difficulty !== 0) return;
				setTimeout(function(){
					game.settings.difficulty = 1;
					difficultyButton[0].visible = false;
					difficultyButton[1].visible = true;
				}, 250);
			});
			difficultyButton[1].applyMobileEvents(function(){
				if(game.settings.difficulty !== 1) return;
				setTimeout(function(){
					game.settings.difficulty = 2;
					difficultyButton[1].visible = false;
					difficultyButton[2].visible = true;
				}, 250);
			});
			difficultyButton[2].applyMobileEvents(function(){
				if(game.settings.difficulty !== 2) return;
				setTimeout(function(){
					game.settings.difficulty = 3;
					difficultyButton[2].visible = false;
					difficultyButton[3].visible = true;
				}, 250);
			});
			difficultyButton[3].applyMobileEvents(function(){
				if(game.settings.difficulty !== 3) return;
				setTimeout(function(){
					game.settings.difficulty = 0;
					difficultyButton[3].visible = false;
					difficultyButton[0].visible = true;
				}, 250);
			});
		}
		// show music button
		fontY = MOBILE ? 350 : 370;
		var musicButtonOn = game.createTextButton(game.str[14], fontSize, '#000', fontX, fontY, function(){
			musicButtonOn.visible = false;
			musicButtonOff.visible = true;
			game.settings.musicOn = false;
			musicButtonOff.dispatchEvent('mouseover');
		});
		var musicButtonOff = game.createTextButton(game.str[15], fontSize, '#000', fontX, fontY, function(){
			musicButtonOff.visible = false;
			musicButtonOn.visible = true;
			game.settings.musicOn = true;
			musicButtonOn.dispatchEvent('mouseover');
		});
		var musicHint = function(){
			hint.show(game.str[16], 3000);
		};
		musicButtonOn.addEventListener('mouseover', musicHint);
		musicButtonOff.addEventListener('mouseover', musicHint);
		musicButtonOn.addEventListener('mouseout', hint.hide);
		musicButtonOff.addEventListener('mouseout', hint.hide);
		if(game.settings.musicOn) {
			musicButtonOff.visible = false;
			musicButtonOn.visible = true;
		} else {
			musicButtonOn.visible = false;
			musicButtonOff.visible = true;
		}
		if(MOBILE) {
			musicButtonOn.applyMobileEvents(function(){
				if(!game.settings.musicOn) return;
				setTimeout(function(){
					game.settings.musicOn = false;
					musicButtonOn.visible = false;
					musicButtonOff.visible = true;
				}, 250);
			});
			musicButtonOff.applyMobileEvents(function(){
				if(game.settings.musicOn) return;
				setTimeout(function(){
					game.settings.musicOn = true;
					musicButtonOff.visible = false;
					musicButtonOn.visible = true;
				}, 250);
			});
		}
		// show start button
		fontSize = MOBILE ? 36 : 20;
		fontX = MOBILE ? WIDTH/3 : WIDTH/2;
		if(game.settings.curLevel)
			var t = game.str[17];
		else
			var t = game.str[18];
		var startButton = game.createTextButton(t, fontSize, '#000', fontX, fontY, function(){
			// save settings
			game.saveSettings();
			// remove key bindings
			fullScreenOn(); // TODO
			window.removeEventListener('keyup', coverKeyFunc);
			// fade-out everything
			var b = new createjs.Shape();
			b.graphics.f('black').r(0,0,WIDTH,HEIGHT);
			b.alpha = 0.005;
			game.stage.addChild(b);
			createjs.Ticker.addEventListener('tick', function(){
				if(b.alpha >= 1) {
					createjs.Ticker.removeAllEventListeners('tick');
					game.stage.removeAllChildren();
					game.stage.removeTouchAreas();
					game.stage.update();
					hint.hide();
					game.start();
				}
				b.alpha += 0.1;
			});
		});
		startButton.addEventListener('mouseover', function(){
			if(game.settings.curLevel)
				hint.show(game.str[19].replace('%1', game.settings.curLevel+1), 3000);
			else
				hint.show(game.str[20], 3000);
		});
		startButton.addEventListener('mouseout', function(){
			hint.hide();
		});
		startButton.applyMobileEvents();
		// button animation
		langLink.alpha = 0;
		difficultyButton[0].alpha = 0;
		difficultyButton[1].alpha = 0;
		difficultyButton[2].alpha = 0;
		difficultyButton[3].alpha = 0;
		musicButtonOn.alpha = 0;
		musicButtonOff.alpha = 0;
		startButton.alpha = 0;
		progressBar.removeChild(progressText);
		game.stage.addChild(
			langLink,
			difficultyButton[0],
			difficultyButton[1],
			difficultyButton[2],
			difficultyButton[3],
			musicButtonOn,
			musicButtonOff,
			startButton
		);
		createjs.Ticker.addEventListener('tick', function(){
			if(musicButtonOn.alpha >= 1) return;
			langLink.alpha += 0.1;
			difficultyButton[0].alpha += 0.1;
			difficultyButton[1].alpha += 0.1;
			difficultyButton[2].alpha += 0.1;
			difficultyButton[3].alpha += 0.1;
			musicButtonOn.alpha += 0.1;
			musicButtonOff.alpha += 0.1;
			startButton.alpha += 0.1;
		});
		// keyboard control
		var coverKeyFunc = function(e){
			if(e.keyCode === 32) {
				startButton.dispatchEvent('mouseover');
				startButton.dispatchEvent('click');
			} else if(e.keyCode === 77) {
				if(musicButtonOn.visible) {
					musicButtonOn.dispatchEvent('click');
				} else {
					musicButtonOff.dispatchEvent('click');
				}
			} else if(e.keyCode === 188) {
				if(game.settings.volume > 0)
					game.settings.volume -= 10;
				hint.show(game.str[22]+game.settings.volume, 1000);
			} else if(e.keyCode === 190) {
				if(game.settings.volume < 100)
					game.settings.volume += 10;
				hint.show(game.str[22]+game.settings.volume, 1000);
			} else if(e.keyCode === 82) {
				if(confirm(game.str[21])) {
					delete localStorage[STORAGE_ID];
					game.settings = DEFAULT_SETTINGS;
					game.stage.removeAllChildren();
					game.stage.removeTouchAreas();
					createjs.Ticker.removeAllEventListeners('tick');
					window.removeEventListener('keyup', coverKeyFunc);
					game.showCover();
				}
			} else
				return;
			e.preventDefault();
		};
		window.addEventListener('keyup', coverKeyFunc);
	};

	// start load main resource if needed
	if(game.mainResource) {
		resourceLoaded({target: game.mainResource});
	} else {
		var q =  new createjs.LoadQueue(USE_ADVANCED_LOADING, 'data/');
		q.installPlugin(createjs.Sound);
		q.addEventListener('progress', function(e){
			progress.c().f('#888').r(0, 0, e.progress*800, 3);
		});
		q.addEventListener('complete', resourceLoaded);
		if(location.protocol !== 'file:' && location.protocol !== 'resource:') {
			// advanced loading
			q.loadManifest([
				{id:'maps', type:'text', src:'maps.data?v='+VERSION},
				{id:'ctrl', src:'ctrl.json?v='+VERSION},
				{id:'words', src:'words_'+game.settings.lang+'.json?v='+VERSION},
				{id:'bgm1', src:'audio/the_start_of_night.ogg'},
				{id:'bgm2', src:'audio/lighted_stories.ogg'},
				{id:'bgm3', src:'audio/tomorrow.ogg'},
				{id:'bgm4', src:'audio/spreading_white.ogg'},
				{id:'bgm5', src:'audio/lighted_stories_strings.ogg'},
				{id:'bgm0', src:'audio/tomorrow_short.ogg'},
				{id:'tomorrow', src:'image/title_'+game.settings.lang+'.png'},
				{id:'img6', src:'image/6.png'},
				{id:'img7', src:'image/7.png'},
				{id:'img8', src:'image/8.png'},
				{id:'img9', src:'image/9.png'},
				{id:'img10', src:'image/10.png'},
				{id:'img14', src:'image/14.png'},
				{id:'img22', src:'image/22.png'},
				{src:'js/levels.js?v='+VERSION}
			]);
		} else {
			// load text data through xhr
			var xhr1 = new XMLHttpRequest();
			xhr1.addEventListener('load', function(){
				game.maps = xhr1.response.split('\n');
			}, false);
			xhr1.open('GET', 'data/maps.data', false);
			xhr1.overrideMimeType('text/plain; charset=utf8');
			xhr1.send();
			var xhr2 = new XMLHttpRequest();
			xhr2.addEventListener('load', function(){
				game.words = JSON.parse(xhr2.response);
			}, false);
			xhr2.open('GET', 'data/words_'+game.settings.lang+'.json', false);
			xhr2.overrideMimeType('text/plain; charset=utf8');
			xhr2.send();
			var xhr3 = new XMLHttpRequest();
			xhr3.addEventListener('load', function(){
				game.ctrl = JSON.parse(xhr3.response);
			}, false);
			xhr3.open('GET', 'data/ctrl.json', false);
			xhr3.overrideMimeType('text/plain; charset=utf8');
			xhr3.send();
			// load else
			q.loadManifest([
				{id:'bgm1', src:'audio/the_start_of_night.ogg'},
				{id:'bgm2', src:'audio/lighted_stories.ogg'},
				{id:'bgm3', src:'audio/tomorrow.ogg'},
				{id:'bgm4', src:'audio/spreading_white.ogg'},
				{id:'bgm5', src:'audio/lighted_stories_strings.ogg'},
				{id:'bgm0', src:'audio/tomorrow_short.ogg'},
				{id:'tomorrow', src:'image/title_'+game.settings.lang+'.png'},
				{id:'img6', src:'image/6.png'},
				{id:'img7', src:'image/7.png'},
				{id:'img8', src:'image/8.png'},
				{id:'img9', src:'image/9.png'},
				{id:'img10', src:'image/10.png'},
				{id:'img14', src:'image/14.png'},
				{id:'img22', src:'image/22.png'},
				{src:'js/levels.js'}
			]);
		}
	}

};

// wrapper resize

var startResizeWrapper = function(){
	var wrapper = document.getElementById('wrapper');
	var mainCanvas = document.getElementById('main_canvas');
	var resizeWrapper = function(){
		wrapper.style.height = document.documentElement.clientHeight + 'px';
		var r = document.documentElement.clientHeight / HEIGHT;
		var t = document.documentElement.clientWidth / WIDTH;
		if(r > t) r = t;
		if(r >= 1 && !MOBILE) {
			mainCanvas.style.width = WIDTH + 'px';
			mainCanvas.style.height = HEIGHT + 'px';
		} else {
			mainCanvas.style.width = 'auto';
			mainCanvas.style.height = 'auto';
			mainCanvas.width = Math.floor(WIDTH*r);
			mainCanvas.height = Math.floor(HEIGHT*r);
			game.stage.scaleX = r;
			game.stage.scaleY = r;
		}
		game.stage.offsetX = mainCanvas.offsetLeft;
		game.stage.offsetY = mainCanvas.offsetTop;
		if(game.stage.dirtyRect) {
			game.stage.dirtyRect(0, 0, WIDTH, HEIGHT);
			game.stage.update();
		}
	};
	window.onresize = resizeWrapper;
	resizeWrapper();
};

// start function

document.bindReady(function(){

	// read settings
	try {
		if(!localStorage[STORAGE_ID]) {
			// fallback to "tomorrow" item on published site
			if(location.hostname === 'mistymiracle.github.io' && localStorage['tomorrow'])
				localStorage[STORAGE_ID] = localStorage['tomorrow'];
		}
		game.settings = JSON.parse(localStorage[STORAGE_ID]);
		if(game.settings.version !== STORAGE_VERSION) {
			// update settings
			for(var k in DEFAULT_SETTINGS)
				if(typeof(game.settings[k]) === 'undefined')
					game.settings[k] = DEFAULT_SETTINGS[k];
			game.settings.version = STORAGE_VERSION;
			game.saveSettings();
		}
	} catch(e) {
		game.settings = DEFAULT_SETTINGS;
	}

	// determine langs
	if(!game.settings.lang) {
		if(navigator.language === 'zh-CN' || navigator.userLanguage === 'zh-CN')
			game.settings.lang = 'zh-CN';
		else
			game.settings.lang = 'en';
	}
	game.lang = game.langs[game.settings.lang];
	game.str = game.lang.str;

	// check compatibility
	hint.show(game.str[0]);
	if(!HTML5Compatibility.supportAll()) {
		hint.showLink(game.str[1]);
		return;
	}
	try {
		game.saveSettings();
		var t = JSON.parse(localStorage[STORAGE_ID]);
	} catch(e) {
		hint.showLink(game.str[27], location.href);
		return;
	}

	// fullscreen for mobile
	if(MOBILE) {
		var wrapper = document.getElementById('wrapper')
		wrapper.ondblclick = null;
		wrapper.oncontextmenu = function(e){
			e.preventDefault();
		};
	}

	// window focus status
	window.addEventListener('focus', function(){
		game.focused = true;
	}, false);
	window.addEventListener('blur', function(){
		game.focused = false;
	}, false);

	// hacks on new version of createjs
	createjs.BitmapAnimation = createjs.Sprite;

	// init canvas
	document.getElementById('wrapper').innerHTML = '<canvas id="main_canvas" width="'+WIDTH+'" height="'+HEIGHT+'"></canvas>';
	game.stage = new createjs.Stage('main_canvas');
	startResizeWrapper();
	game.stage.autoClear = false;
	createjs.Sound.alternateExtensions = ["mp3"];

	// dirty rect management
	var dirtyRects = [];
	game.stage.dirtyRect = function(x, y, width, height){
		dirtyRects.push([x, y, width, height]);
	};
	var stageUpdate = game.stage.update;
	game.stage.update = function(){
		var scale = game.stage.scaleX;
		while(dirtyRects.length) {
			var rect = dirtyRects.shift();
			var x = rect[0];
			var y = rect[1];
			var width = rect[2];
			var height = rect[3];
			var context = game.stage.canvas.getContext('2d');
			var prev = context.fillStyle;
			context.fillStyle = '#000';
			context.fillRect(x*scale, y*scale, width*scale, height*scale);
			context.fillStyle = prev;
		}
		stageUpdate.call(game.stage);
	};

	// init touch system
	if(MOBILE) {
		var touchAreas = [];
		game.stage.removeTouchAreas = function(){
			touchAreas = [];
		};
		game.stage.addTouchArea = function(x, y, w, h, cb){
			touchAreas.push({
				x1: x,
				y1: y,
				x2: x+w,
				y2: y+h,
				cb: cb,
				started: false
			});
		};
		var touchStartFunc = function(e){
			e.preventDefault();
			var touches = e.touches;
			if(e.type === 'touchend' || e.type === 'touchcancel' || e.type === 'touchleave') touches = e.changedTouches;
			for(var i=0; i<touchAreas.length; i++) {
				var area = touchAreas[i];
				for(var j=0; j<touches.length; j++) {
					var x = (touches[j].pageX - game.stage.offsetX) / game.stage.scaleX;
					var y = (touches[j].pageY - game.stage.offsetY) / game.stage.scaleY;
					if(area.x1 > x || area.x2 < x) continue;
					if(area.y1 > y || area.y2 < y) continue;
					if(e.type === 'touchend' || e.type === 'touchcancel' || e.type === 'touchleave') {
						area.started = false;
						area.cb('end');
						break;
					}
					if(area.started) area.cb('move', x, y);
					else area.cb('start', x, y);
					area.started = true;
					break;
				}
				if(e.type === 'touchend' || e.type === 'touchcancel' || e.type === 'touchleave') continue;
				if(j === touches.length && area.started) {
					area.started = false;
					area.cb('end');
				}
			}
		};
		game.stage.canvas.addEventListener('touchstart', touchStartFunc);
		game.stage.canvas.addEventListener('touchmove', touchStartFunc);
		game.stage.canvas.addEventListener('touchend', touchStartFunc);
		game.stage.canvas.addEventListener('touchcancel', touchStartFunc);
		game.stage.canvas.addEventListener('touchleave', touchStartFunc);
	}

	// load title resource
	hint.show(game.str[2]);
	var q = new createjs.LoadQueue(USE_ADVANCED_LOADING, 'data/');
	q.addEventListener('complete', function(){
		hint.hide();
		initResource = q;
		game.showCover();
	});
	q.loadManifest([
		{id:'title', src:'image/title_'+game.settings.lang+'.png'},
		{id:'lastleaf', src:'image/lastleaf.png'},
		{id:'lastleaf_grey', src:'image/lastleaf_grey.png'}
	]);

});
