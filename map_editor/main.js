'use strict';
$(function(){

	$(window).bind('beforeunload', function(e){
		var confirmationMessage = '确认离开页面吗？';
		e.returnValue = confirmationMessage;
		return confirmationMessage;
	});

	// map: 2D Array
	var map = new Uint8Array(90*160);

	// inputs
	var $startX = $('#start_x');
	var $startY = $('#start_y');
	var $endX = $('#end_x');
	var $endY = $('#end_y');
	var $lights = $('#lights');

	// update canvas
	var updateCanvas = function(){
		var context = $('#canvas')[0].getContext('2d');
		context.lineWidth = 0;
		// standard
		for(var i=0; i<90; i++)
			for(var j=0; j<160; j++) {
				if(map[i*160+j])
					context.fillStyle = "#000";
				else
					context.fillStyle = "#888";
				context.fillRect(j*6, i*6, 6, 6);
			}
		// extra
		if(!$('#show_extra')[0].checked) return;
		context.beginPath();
		context.fillStyle = "blue";
		context.arc(parseInt($startX.val())*6, parseInt($startY.val())*6, 6, 0, Math.PI*2);
		context.fill();
		var endX = $endX.val().split(' ');
		var endY = $endY.val().split(' ');
		for(var i=0; i<endX.length; i++) {
			context.beginPath();
			context.fillStyle = "green";
			context.arc(endX[i]*6, endY[i]*6, 24, 0, Math.PI*2);
			context.fill();
		}
		// parse lights
		var s = $lights.val().split(/[ \t]+/g);
		for(var i=0; i<s.length; i++) {
			var a = s[i].match(/^\(([0-9]+)\,([0-9]+)\)\*([0-9]+)\(([0-9]+)\,([0-9]+)\)(o[0-9]+|)(\~[0-9\.]+|)$/);
			if(!a) continue;
			var x = a[1];
			var y = a[2];
			var r = a[3];
			var rmin = a[4];
			var rmax = a[5];
			context.beginPath();
			context.arc(x*6, y*6, rmax*6, 0, Math.PI*2);
			context.fillStyle = "rgba(255,255,255,0.7)";
			context.fill();
			context.beginPath();
			context.arc(x*6, y*6, r*6, 0, Math.PI*2);
			context.fillStyle = "rgba(255,255,255,0.3)";
			context.fill();
			context.beginPath();
			context.arc(x*6, y*6, rmin*6, 0, Math.PI*2);
			context.fillStyle = "rgba(255,255,255,0.3)";
			context.fill();
			context.fillStyle = "black";
			context.font = "16px monospace";
			context.textAlign = 'center';
			context.textBaseline = 'middle';
			context.fillText(a[7].slice(1), x*6, y*6);
			if(a[6]) {
				context.beginPath();
				context.arc(x*6, y*6, a[6].slice(1)*6, 0, Math.PI*2);
				context.lineWidth = 1;
				context.strokeStyle = '#000';
				context.stroke();
				context.beginPath();
				context.arc(x*6, y*6, a[6].slice(1)*6+rmax*6, 0, Math.PI*2);
				context.lineWidth = 1;
				context.strokeStyle = '#404040';
				context.stroke();
			}
		}
	};

	// mouse drag
	var mouseStart = {
		ed: false,
		x: 0,
		y: 0
	};
	var $currenrX = $('#current_x');
	var $currenrY = $('#current_y');
	var $pointMove = $('#point_move');
	var $pointStart = $('#point_start');
	var $pointSel = $('#point_selected');
	var pointSelStart = function(){
		$pointSel.css({
			left: mouseStart.x*6+'px',
			top: mouseStart.y*6+'px',
			right: (159-mouseStart.x)*6+'px',
			bottom: (89-mouseStart.y)*6+'px'
		}).show();
	};
	var pointSelUpdate = function(x, y){
		if(mouseStart.x < x) {
			var x1 = mouseStart.x;
			var x2 = x;
		} else {
			var x1 = x;
			var x2 = mouseStart.x;
		}
		if(mouseStart.y < y) {
			var y1 = mouseStart.y;
			var y2 = y;
		} else {
			var y1 = y;
			var y2 = mouseStart.y;
		}
		$pointSel.css({
			left: x1*6+'px',
			top: y1*6+'px',
			right: (159-x2)*6+'px',
			bottom: (89-y2)*6+'px'
		});
	};
	$('#editor')
	.bind('contextmenu', function(e){
		e.preventDefault();
	})
	.mousemove(function(e){
		var p = $(this).offset();
		var x = Math.floor((e.pageX - p.left)/6);
		var y = Math.floor((e.pageY - p.top)/6);
		$currenrX.val(x);
		$currenrY.val(y);
		$pointMove.css({
			left: x*6+'px',
			top: y*6+'px'
		}).show();
		if(mouseStart.ed)
			pointSelUpdate(x, y);
	})
	.mousedown(function(e){
		e.preventDefault();
		mouseStart.ed = true;
		var p = $(this).offset();
		mouseStart.x = Math.floor((e.pageX - p.left)/6);
		mouseStart.y = Math.floor((e.pageY - p.top)/6);
		$pointStart.css({
			left: mouseStart.x*6+'px',
			top: mouseStart.y*6+'px'
		}).show();
		pointSelStart();
	})
	.mouseup(function(e){
		e.preventDefault();
		if(!mouseStart.ed) return;
		mouseStart.ed = false;
		$pointStart.hide();
		$pointSel.hide();
		var p = $(this).offset();
		var x1 = Math.floor((e.pageX - p.left)/6);
		var y1 = Math.floor((e.pageY - p.top)/6);
		var x2 = mouseStart.x;
		var y2 = mouseStart.y;
		for(var i=(y1<y2?y1:y2); i<=y1 || i<=y2; i++)
			for(var j=(x1<x2?x1:x2); j<=x1 || j<=x2; j++)
				map[i*160+j] = (e.button?0:1);
		updateCanvas();
	})
	.mouseleave(function(e){
		$pointMove.hide();
		$pointSel.hide();
	})
	.mouseenter(function(e){
		if(e.buttons) {
			$pointMove.show();
			$pointSel.show();
			return;
		}
		mouseStart.ed = false;
		$pointStart.hide();
		$pointSel.hide();
	});

	// update canvas
	updateCanvas();
	$('input').change(function(){
		updateCanvas();
	});

	// generate code
	$('#generate_code').click(function(){
		var code = '';
		// compress map
		for(var i=0; i<90*160; i+=6) {
			var t = 0;
			for(var j=0; j<6; j++)
				t = t*2 + map[i+j];
			code += String.fromCharCode(t+48);
		}
		code += '|';
		code += $startX.val()+'|' + $startY.val()+'|' + $endX.val()+'|' + $endY.val()+'|';
		code += $lights.val();
		$('#code').val(code);
	});

	// parse code
	$('#apply_code').click(function(){
		var code = $('#code').val();
		try {
			var a = code.split('|');
			$startX.val(a[1]);
			$startY.val(a[2]);
			$endX.val(a[3]);
			$endY.val(a[4]);
			$lights.val(a[5]);
			// uncompress map
			for(var i=0; i<90*160/6; i++) {
				var t = a[0].charCodeAt(i) - 48;
				for(var j=5; j>=0; j--) {
					map[i*6+j] = t%2;
					t = t/2;
				}
			}
			updateCanvas();
		} catch(e) {
			alert('地图代码有误！');
		}
	});

	// save and load
	$('#save_code').click(function(){
		if(!confirm('保存代码为模板？')) return;
		localStorage.tomorrowMapEditor = $('#code').val();
	});
	$('#load_code').click(function(){
		if(!confirm('载入模板？')) return;
		$('#code').val(localStorage.tomorrowMapEditor);
		$('#apply_code').click();
	});
	if(localStorage.tomorrowMapEditor) {
		$('#code').val(localStorage.tomorrowMapEditor);
		$('#apply_code').click();
	}
});
