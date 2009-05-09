// ==UserScript==
// @name           infoq slide navigator
// @namespace      http://github.com/omo
// @include        http://www.infoq.com/presentations/*
// ==/UserScript==

InfoqPSNav = {}
InfoqPSNav.ROOT_ID = "openedSlides";
InfoqPSNav.SLIDE_CLASS = "iqnSlide";
InfoqPSNav.SLIDE_AREA_ID = "slideArea"; // given by the page
InfoqPSNav.slideIndex = 0;
InfoqPSNav.slideIndexField = null;
InfoqPSNav.rootStyle = null;

// configuration parameters
InfoqPSNav.PRELOAD_INTERVAL = 500;
InfoqPSNav.MIN_SCALE = 0.8;
InfoqPSNav.MAX_SCALE = 1.2;

InfoqPSNav.createSlideElement = function(url, style)
{
    var slide = document.createElement("div");
    slide.setAttribute("style", style);
    slide.setAttribute("class", InfoqPSNav.SLIDE_CLASS);
    slide.innerHTML = ("<embed quality='high' width='100%' height='100%'" +
			   "src='" + url + "' type='application/x-shockwave-flash'/>");
    var link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("style", "display:block;");
    link.innerHTML = url;
    var parent = document.createElement("div");
    parent.appendChild(slide);
    parent.appendChild(link);
    return parent;
};

InfoqPSNav.makeSlideList = function(rootId)
{
    var slideStyle = document.getElementById(InfoqPSNav.SLIDE_AREA_ID).getAttribute("style");
    var slideRoot = document.createElement("div");
    slideRoot.setAttribute("id",rootId);
    var toshow = unsafeWindow.slides;
    for (var i=1; i<toshow.length;++i) {  // skip first slide which is already shown.
	var elem = InfoqPSNav.createSlideElement(toshow[i], slideStyle);
	slideRoot.appendChild(elem);
    };

    return slideRoot;
};

InfoqPSNav.makeScaled = function(style, scale)
{
    var m = style.toString().match("(\\d+\\.?\\d*)(.*)");
    var num  = parseInt(m[1]);
    var unit = m[2];
    return (num*scale).toString() + unit;
};

InfoqPSNav.zoom = function(scale)
{
    // XXX: hide all slide to prevent relayout
    var list = unsafeWindow.$A(document.getElementsByClassName(InfoqPSNav.SLIDE_CLASS));
    list.push(document.getElementById(InfoqPSNav.SLIDE_AREA_ID));
    list.each(function(e) {
	//e.style.width = InfoqPSNav.makeScaled(e.style.width, scale); 
	e.style.height = InfoqPSNav.makeScaled(e.style.height, scale);
    });
};

InfoqPSNav.slideIndexChanged = function()
{
    InfoqPSNav.slideIndexField.value = InfoqPSNav.slideIndex.toString();
};

InfoqPSNav.focusToShorcut = function()
{
    InfoqPSNav.slideIndexField.focus();
};

InfoqPSNav.slideRoot = function()
{
    return document.getElementById(InfoqPSNav.ROOT_ID);
};

InfoqPSNav.setSlideRoot = function(elm)
{
    var original = document.getElementById("presentationContent");
    original.appendChild(elm);
};

InfoqPSNav.hide = function(elm)
{
    elm.style.display = "none";
};

InfoqPSNav.show = function(elm)
{
    elm.style.display = "block";
};

InfoqPSNav.preloadingStarted = false;

InfoqPSNav.startPreloadingSlides = function(list)
{
    if (InfoqPSNav.preloadingStarted) {
	GM_log("preloading started.");
	return;
    }

    var preloadingHost = document.createElement("div");
    preloadingHost.setAttribute("style", "width:1px; height:1px;"); // XXX: set visibility
    document.getElementsByTagName("body")[0].appendChild(preloadingHost);
    
    var preloadOne = function(index) {
	var url = list[index];
	if (!url) {
	    //GM_log("done");
	    preloadingHost.parentNode.removeChild(preloadingHost);
	    return;
	}

	//GM_log("load:" + url);
	var one = document.createElement("div");
	one.innerHTML = ("<embed src='" + url + "' type='application/x-shockwave-flash'/>");
	preloadingHost.appendChild(one);
	
	unsafeWindow.setTimeout(function() { preloadOne(index+1); }, InfoqPSNav.PRELOAD_INTERVAL);
    };

    preloadOne(0);
    InfoqPSNav.preloadingStarted = true;
};

InfoqPSNav.move = function(delta)
{
    var newIndex = InfoqPSNav.slideIndex + delta;
    var newSlide = unsafeWindow.slides[newIndex];
    if (!newSlide) {
	return;
    }

    InfoqPSNav.startPreloadingSlides(unsafeWindow.slides);

    var selem = document.getElementById("slides");
    selem.setAttribute("src", newSlide);
    InfoqPSNav.slideIndex = newIndex;
    InfoqPSNav.slideIndexChanged();
};

InfoqPSNav.addLinks = function(original)
{
    var toshow = document.createElement("span");
    toshow.innerHTML = "<a href='#'>[show slides(" + unsafeWindow.slides.length + ")]</a>";
    toshow.addEventListener("click", function(evt) {
	evt.preventDefault();
	var existing = InfoqPSNav.slideRoot();
	if (existing) {
	    InfoqPSNav.show(existing);
	} else {
	    InfoqPSNav.setSlideRoot((InfoqPSNav.makeSlideList(InfoqPSNav.ROOT_ID)));
	}
    }, false);

    var tohide = document.createElement("span");
    tohide.innerHTML = "<a href='#'>[hide slides]</a>";
    tohide.addEventListener("click", function(evt) {
	evt.preventDefault();
	var existing = InfoqPSNav.slideRoot();
	if (existing) {
	    InfoqPSNav.hide(existing);
	}
    }, false);


    var tomin = document.createElement("span");
    tomin.innerHTML = "<a href='#'>[-]</a>";
    tomin.addEventListener("click", function(evt) {
	evt.preventDefault();
	InfoqPSNav.zoom(InfoqPSNav.MIN_SCALE);
    }, false);

    var tomax = document.createElement("span");
    tomax.innerHTML = "<a href='#'>[+]</a>";
    tomax.addEventListener("click", function(evt) {
	evt.preventDefault();
	InfoqPSNav.zoom(InfoqPSNav.MAX_SCALE);
    }, false);

    var handlePrevOrNextKey = function(evt) {
	switch (evt.charCode)
	{
	case 112: // "p"
	    evt.preventDefault();
	    InfoqPSNav.move(-1);
	    break;
	case 110: // "n"
	    evt.preventDefault();
	    InfoqPSNav.move( 1);
	    break;
	}
    };

    InfoqPSNav.slideIndexField = document.createElement("input");
    InfoqPSNav.slideIndexField.setAttribute("type", "text");
    InfoqPSNav.slideIndexField.setAttribute("size", "2");
    InfoqPSNav.slideIndexField.setAttribute("style", "border-style: solid; text-align:right;");
    InfoqPSNav.slideIndexField.addEventListener("keypress", handlePrevOrNextKey, false);
    InfoqPSNav.slideIndexChanged();

    var tonext = document.createElement("span");
    tonext.innerHTML = "<a href='#'>&gt;]</a>";
    tonext.addEventListener("keypress", handlePrevOrNextKey, false);
    tonext.addEventListener("click", function(evt) {
	evt.preventDefault();
	InfoqPSNav.move(1);
    }, false);

    var toprev = document.createElement("span");
    toprev.innerHTML = "<a href='#'>[&lt;</a>";
    toprev.addEventListener("keypress", handlePrevOrNextKey, false);
    toprev.addEventListener("click", function(evt) {
	console.log("hello");
	evt.preventDefault();
	InfoqPSNav.move(-1);
    }, false);

    var guide = document.createElement("span");
    guide.innerHTML = " ... (<b>p</b>rev,<b>n</b>ext)";

    var panel = document.createElement("div");
    panel.appendChild(toshow);
    panel.appendChild(tohide);
    panel.appendChild(tomin);
    panel.appendChild(tomax);
    panel.appendChild(toprev);
    panel.appendChild(InfoqPSNav.slideIndexField);
    panel.appendChild(tonext);
    panel.appendChild(guide);

    original.insertBefore(panel, document.getElementById(InfoqPSNav.SLIDE_AREA_ID));
    //original.appendChild(panel);
};

InfoqPSNav.bootstrap = function()
{
    var original = document.getElementById("presentationContent");
    InfoqPSNav.addLinks(original);
    InfoqPSNav.focusToShorcut();
};

InfoqPSNav.bootstrap();
