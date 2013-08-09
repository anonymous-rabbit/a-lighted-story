'use strict';

// compatibility checker

(function(){
    // checkers
    var checkers = {

        'JavaScript/TypedArray':
            function() {
                if(typeof(Uint8Array) !== 'undefined' && typeof(Float64Array) !== 'undefined')
                    return true;
            },

        'DOM/Canvas':
            function() {
                try {
                    if(typeof(document.createElement('canvas').getContext) !== 'undefined')
                        return true;
                } catch(e) {}
            },

        'DOM/Audio':
            function() {
                try {
                    if(typeof(document.createElement('audio').src) !== 'undefined')
                        return true;
                } catch(e) {}
            },

        'DOM/FileReader':
            function() {
                if(typeof(FileReader) !== 'undefined' && typeof(URL) !== 'undefined' && typeof(URL.createObjectURL) !== 'undefined')
                    return true;
            },

        'DOM/LocalStorage':
            function() {
                if(typeof(localStorage) !== 'undefined')
                    return true;
            },

        '': function(){ return true; }
    };

    // check function
    window.HTML5Compatibility = (function(){
        // select unsupported features from a list (given as array or argument list)
        var unsupported = function() {
            var list;
            if(typeof(arguments[0]) === 'array')
                list = arguments[0];
            else
                list = arguments;
            var r = [];
            for(var i=0; i<list.length; i++) {
                var supported = false;
                var item = list[i];
                if(!checkers[item])
                    throw new Error('Unrecognized compatibility test item: '+list[i]);
                else if(checkers[item]())
                    supported = true;
                if(!supported) r.push(list[item]);
            }
            return r;
        };
        return {
            unsupported: unsupported
        };
    })();
})();

// document.ready partly from jQuery

(function(){
	if(document.bindReady) return;

	var funcs = [];

	var executeReady = function(){
        if(funcs === null) return;
		for(var i = 0; i < funcs.length; i++)
			funcs[i].call(window);
		funcs = null;
	};

	// Mozilla, Opera and webkit nightlies currently support this event
	if ( document.addEventListener ) {
		// Use the handy event callback
		document.addEventListener( "DOMContentLoaded", function f(){
			document.removeEventListener( "DOMContentLoaded", f, false );
			executeReady();
		}, false );
	// If IE event model is used
	} else if ( document.attachEvent ) {
		// ensure firing before onload,
		// maybe late but safe also for iframes
		document.attachEvent("onreadystatechange", function f(){
			if ( document.readyState === "complete" ) {
				document.detachEvent( "onreadystatechange", f );
				executeReady();
			}
		});
		// If IE and not an iframe
		// continually check to see if the document is ready
		if ( document.documentElement.doScroll && window == window.top ) (function f(){
			if ( funcs === null ) return;
			try {
				// If IE is used, use the trick by Diego Perini
				// http://javascript.nwbox.com/IEContentLoaded/
				document.documentElement.doScroll("left");
			} catch( error ) {
				setTimeout( f, 0 );
				return;
			}
			// and execute any waiting functions
			executeReady();
		})();
	} else {
    	// A fallback to window.onload, that will always work
    	window.onload = executeReady;
    }

	document.bindReady = function(func){
		if(funcs !== null)
			funcs.push(func);
		else
			func.call(window);
	};
})();

// html to text
window.textToHtml = function(text){
	return text.replace(/\&/, '&amp;').replace(/\</, '&lt;').replace(/\>/, '&gt;').replace(/(\r|\n|\r\n)/, '<br>');
};

// hint utils

document.bindReady(function(){
    window.hint = (function(){
    	var ANIMATION_STEP_LENGTH = 8;
        var ANIMATION_INTERVAL = 40;
    	var div = document.getElementById('hint');
        var curTop = 0;
    	var isShown = true;
        var aniObj = false;
        var aniFrame = function(){
            if(isShown) {
                curTop = curTop + ANIMATION_STEP_LENGTH;
                if(curTop > 0) {
                    curTop = 0;
                    clearInterval(aniObj);
                    aniObj = false;
                }
                div.style.top = curTop + 'px';
            } else {
                curTop = curTop - ANIMATION_STEP_LENGTH;
                if(curTop <= -div.clientHeight) {
                    div.style.display = 'none';
                    clearInterval(aniObj);
                    aniObj = false;
                }
                div.style.top = curTop + 'px';
            }
        };
        var aniStart = function(){
            if(aniObj) return;
            aniObj = setInterval(aniFrame, ANIMATION_INTERVAL);
            div.style.display = 'block';
        };
    	var show = function(text){
    		div.innerHTML = textToHtml(text);
            if(!isShown) {
                isShown = true;
                curTop = -div.clientHeight;
                div.style.top = curTop + 'px';
                aniStart();
            }
    	};
        var hide = function(){
            if(isShown) {
                isShown = false;
                aniStart();
            }
        };
    	return {
    		show: show,
    		hide: hide
    	};
    })();
});

// wrapper resize

document.bindReady(function(){
    var wrapper = document.getElementById('wrapper');
    var resizeWrapper = function(){
        wrapper.style.height = document.documentElement.clientHeight + 'px';
    };
    window.onresize = resizeWrapper;
    resizeWrapper();
});