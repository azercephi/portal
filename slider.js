/*
 * Authors: Hamik Mukelyan, Jessica Li, Xi Xu
 * Date: Spring 2016
 * 
 * Some of this code was derived from http://jsfiddle.net/6PdVV/39/
 */

/* These are objects corresponding to the HTML file's #bar and #slider divs. */
var bar, slider, debugbox;

/* A number in the interval [0, 100] describing the position of the slider. */
var slider_val = 0;

/* Number of milliseconds that this date was from the epoch (at midnight). */
var curr_days_ms_since_epoch;

/* Number of milliseconds that this date was from the epoch (now). */
var curr_ms_since_epoch;

/* These the "hooks" into the HTML file. */
window.onload = init;
window.onkeydown = function check(e) {
    var code = e.keyCode;
    switch (code) {
        case 37: incr(false); break; // Left key
        case 39: incr(true); break; // Right key
        default: // Do nothing for everything else
    }
}

/* First function called from the HTML. */
function init(){
    bar = document.getElementById('bar');
    slider = document.getElementById('slider');
    info = document.getElementById('info');
    debugbox = document.getElementById('debugbox');
    
    var curr_date = new Date();
    curr_hour = curr_date.getHours();
    curr_ms_since_epoch = curr_date.getTime();
    curr_days_ms_since_epoch = curr_ms_since_epoch 
    	- (curr_date.getHours() * 60 * 60 * 1000 
    			+ curr_date.getMinutes() * 1000 * 60 
    			+ curr_date.getSeconds() * 1000 
    			+ curr_date.getMilliseconds());
    
    bar.addEventListener('mousedown', startSlide, false);
    bar.addEventListener('mouseup', stopSlide, false);
}

function startSlide(event){
    var set_perc = ((((event.clientX - bar.offsetLeft) 
    		/ bar.offsetWidth)).toFixed(2));
    info.innerHTML = 'Slider value (start): ' + Math.round(set_perc * 100); 
    bar.addEventListener('mousemove', moveSlide, false);    
    slider_val = set_perc * 100;
    slider.style.width = slider_val + '%';  
}

function moveSlide(event){
    var set_perc = ((((event.clientX - bar.offsetLeft) 
    		/ bar.offsetWidth)).toFixed(2));
    info.innerHTML = 'Slider value (moving): ' + Math.round(set_perc * 100);
    slider_val = set_perc * 100;
    slider.style.width = slider_val + '%';
    
    updateDebugBox();
}

function stopSlide(event){
    var set_perc = ((((event.clientX - bar.offsetLeft) 
    		/ bar.offsetWidth)).toFixed(2));
    info.innerHTML = 'Slider value (done): ' + Math.round(set_perc * 100);
    bar.removeEventListener('mousemove', moveSlide, false);
    slider_val = set_perc * 100;
    slider.style.width = slider_val + '%';
}

/* Increments the bar by 2 percentage points up (if up is true) or down
 * (otherwise).
 */
function incr(up){
	var pos_percent = slider.style.width.indexOf('%');
	var old_num = Number(slider.style.width.slice(0, pos_percent));
	if (old_num < 0 || old_num > 100)
		return;
	if (old_num > 0 && old_num < 1)
		old_num *= 100;
	old_num += (up ? 1 : -1);
	if (old_num > 100)
		old_num = 100;
	if (old_num < 0)
		old_num = 0;
    slider.style.width = old_num + '%';
    slider_val = old_num;
    info.innerHTML = 'Slider value (incrementing): ' + slider_val;

    updateDebugBox();
}

function updateDebugBox() {
	
	var running_msg = "";
	
	var top_curr_hour = Math.floor(curr_ms_since_epoch / 1000 / 60 / 60) 
		* 1000 * 60 * 60;
	
	// The top of the hour dictated by the slider. If the slider is 70% then
	// we take the top of the hour that is 70% from midnight.
	var start_time = top_curr_hour - slider_val * 1000 * 60 * 60;
	var end_time = (start_time + 1000 * 60 * 60 > curr_ms_since_epoch ? 
			curr_ms_since_epoch : start_time + 1000 * 60 * 60);
	
	running_msg += '(MS start time, MS end time): (' + start_time + ', ' 
		+ end_time + ') <p>Slider value: ' + slider_val + ' <p>';
	
	chrome.history.search(
			{ 
				'text' : '', 
				'startTime' : start_time, 
				'endTime' : end_time,
				'maxResults' : 100
			}, 
			function (arrayHistItems) {
				arrayHistItems.forEach(function (histItem) {
					running_msg += "{ id : '" + histItem.id 
						+  "' , url : '" + histItem.url.slice(0, 40) 
						+ "...'} <p>";
				});
				debugbox.innerHTML = running_msg;
			});
	
	
}




