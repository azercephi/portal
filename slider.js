/* These are objects corresponding to the HTML file's #bar and #slider divs. */
var bar, slider;

/* A number in the interval [0, 100] describing the position of the slider. */
var slider_val;

window.onload = init;
window.onkeydown = function check(e) {
    var code = e.keyCode;
    switch (code) {
        case 37: incr(true); break; // Left key
        case 39: incr(false); break; // Right key
        default: // Do nothing for everything else
    }
}

// THIS CODE IS FROM: http://jsfiddle.net/6PdVV/39/

function init(){
    bar = document.getElementById('bar');
    slider = document.getElementById('slider');
    info = document.getElementById('info');
    bar.addEventListener('mousedown', startSlide, false);
    bar.addEventListener('mouseup', stopSlide, false);
}

function startSlide(event){
    var set_perc = ((((event.clientX - bar.offsetLeft) 
    		/ bar.offsetWidth)).toFixed(2));
    info.innerHTML = 'Slider value (start): ' + Math.round(set_perc * 100); 
    bar.addEventListener('mousemove', moveSlide, false);    
    slider.style.width = (set_perc * 100) + '%';    
}

function moveSlide(event){
    var set_perc = ((((event.clientX - bar.offsetLeft) 
    		/ bar.offsetWidth)).toFixed(2));
    info.innerHTML = 'Slider value (moving): ' + Math.round(set_perc * 100);
    slider.style.width = (set_perc * 100) + '%';
}

function stopSlide(event){
    var set_perc = ((((event.clientX - bar.offsetLeft) 
    		/ bar.offsetWidth)).toFixed(2));
    info.innerHTML = 'Slider value (done): ' + Math.round(set_perc * 100);
    bar.removeEventListener('mousemove', moveSlide, false);
    slider.style.width = (set_perc * 100) + '%';
}

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
    info.innerHTML = 'Slider value (incrementing): ' + old_num;
}