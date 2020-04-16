


var config = {
    clientContainerId: 'client-container',
    videoTech: 'html5',
    adTagUrl:'https://pubads.g.doubleclick.net/gampad/ads?iu=/21718562853/Bitsat_Preroll&description_url=https%3A%2F%2Fadtech.bitsat.com%2Fi_video%2Fros.html&tfcd=0&npa=0&sz=640x480&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=',
    // adTagUrl: 'https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/124319096/external/single_ad_samples&ciu_szs=300x250&impl=s&gdfp_req=1&env=vp&output=vast&unviewed_position_start=1&cust_params=deployment%3Ddevsite%26sample_ct%3Dskippablelinear&correlator=',
    imaSdkSource: 'https://imasdk.googleapis.com/js/sdkloader/ima3.js',
    videojsSourceJS: 'https://cdnjs.cloudflare.com/ajax/libs/video.js/7.6.6/video.min.js',
    videojsSourceCSS: 'https://cdnjs.cloudflare.com/ajax/libs/video.js/7.6.6/video-js.min.css',
    baseUrl: document.currentScript.src.slice(0, document.currentScript.src.lastIndexOf('/')),
    mrssFeedUrl: 'https://ascendeum-hb.s3.us-east-2.amazonaws.com/nitin/video-playlist-ads' + '/video-elephant-mrss.xml',
    autoplay: true,
    adFirst: false, // to show ad before first video content
    videoPositions: ['floating']
};

var domRefs;


var adsManager;
var adsLoader;
var adDisplayContainer;

var floatingAdContainerClosed = false;

var player; // videojs player instance
var playlist;
var currentVideoIndex = -1;
// to prevent playing the next video after ad in case of advt requested in between video
var resumeVideoAfterAd = false;


function loadScriptsAndStyle() {

    // load style sheet
    var style = document.createElement('link');
    style.href = config.baseUrl + '/ascendeum-video-playlist-ads.css';
    style.rel = 'stylesheet';
    document.head.appendChild(style);

    // load scripts : imasdk, xmlTOJson, Videojs(if required)
    var imaSdk = document.createElement('script');
    imaSdk.src = config.imaSdkSource;
    imaSdk.defer = true;
    document.body.append(imaSdk);

    var xmlToJson = document.createElement('script');
    xmlToJson.src = config.baseUrl + '/xmlToJson.js';
    xmlToJson.defer = true;
    document.body.append(xmlToJson);

    if (config.videoTech === 'videojs') {
        // load videojs js
        var videojsJS = document.createElement('script');
        videojsJS.src = config.videojsSourceJS;
        videojsJS.defer = true;
        document.body.append(videojsJS);

        // load videojs css
        var videojsCSS = document.createElement('link');
        videojsCSS.href = config.videojsSourceCSS;
        videojsCSS.rel = 'stylesheet';
        document.head.appendChild(videojsCSS);
    }

}

function buildDOM() {

    // client independent code
    var ascContainerWrapper = document.createElement('div');
    var ascContainer = document.createElement('div');
    var ascContentContainer = document.createElement('div');
    var ascAdContainer = document.createElement('div');
    var videoElement = document.createElement('video');
    if (config.videoPositions.includes('floating')) {
        var ascAdFloatingCloseBtn = document.createElement('button');
        ascAdFloatingCloseBtn.id = "asc-floating-close-btn";
        ascAdFloatingCloseBtn.innerText = 'X';
        ascAdFloatingCloseBtn.addEventListener('click', onFloatingCloseBtn);
    }
    ascContainerWrapper.id = 'asc-container-wrapper';
    ascContainer.id = 'asc-container';
    ascContentContainer.id = 'asc-content-container';
    ascAdContainer.id = 'asc-ad-container';
    videoElement.id = 'asc-video-element';
    videoElement.muted = config.autoplay ? true : false;
    videoElement.controls = false;
    videoElement.controlslist = "nodownload";
    videoElement.playsinline = true;
    videoElement.disablePictureInPicture = true;


    if (config.videoPositions.includes('inline')) {
        /**Client Dependent code starts */

        var clientDiv = document.createElement('article');
        clientDiv.classList.add('lead'); // make it look similar to lead article
        // create DOM elements to be embedded inside client's div
        // var clientDiv = document.getElementById(config.clientContainerId);
        // if (!clientDiv) {
        //     throw new Error('Client container Id is not valid');
        // }

        var articles = document.querySelector('section.new').getElementsByTagName('article');

        var secondArticle = articles[1];
        secondArticle.parentNode.insertBefore(clientDiv, secondArticle);

        /** Client Dependent code End */
        clientDiv.appendChild(ascContainerWrapper);
    } else {

        document.body.appendChild(ascContainerWrapper);
    }


    ascContainerWrapper.appendChild(ascContainer);
    ascContainer.appendChild(ascContentContainer);
    if (config.videoPositions.includes('floating')) {
        ascContainer.appendChild(ascAdFloatingCloseBtn);
    }
    ascContainer.appendChild(ascAdContainer);
    ascContentContainer.appendChild(videoElement);


    if (config.videoTech === 'videojs') {
        videoElement.classList.add('video-js', 'vjs-default-skin', 'vjs-big-play-centered');
    }
    if (config.videoTech === 'html5') {
        var ascPlayBtnContainer = document.createElement('div');
        ascPlayBtnContainer.id = 'asc-playbtn-container';
        var btn = document.createElement('button');
        btn.id = 'asc-playbtn';
        var btnContent = document.createElement('span');

        btn.appendChild(btnContent);
        ascPlayBtnContainer.appendChild(btn);
        ascContentContainer.appendChild(ascPlayBtnContainer);

    }
}


// set DOM references
function setDOMRefernces() {
    domRefs = {
        containerWrapper: document.getElementById('asc-container-wrapper'),
        container: document.getElementById('asc-container'),
        videoElement: document.getElementById('asc-video-element'),
        adContainer: document.getElementById('asc-ad-container'),
        //playBtnContainer is  used with html5 player
        playBtnContainer: document.getElementById('asc-playbtn-container')
    };
}




function init() {

    initVideoPlayer();
    setUpIMA();
    if (config.autoplay) {
        setPlayBtn(false);
        if (config.adFirst) {
            requestAds();
        } else {
            setVideoControls(true);
            playNextVideo();
        }
    }
}

function initVideoPlayer() {


    if (config.videoTech === 'videojs') {

        var videoJsOptions = {
            autoplay: false,
            controls: true,
            controlBar: {
                pictureInPictureToggle: false, // hide pictureInPicture option
            },
            userActions: {
                doubleClick: false // disable the default functionality of fullscreen on doubleClick  
            }
        };


        player = videojs(domRefs.videoElement, videoJsOptions);
        player.bigPlayButton.on('click', playBtnHandler);
    } else {
        var playBtn = document.getElementById('asc-playbtn');
        playBtn.addEventListener('click', playBtnHandler);
    }
}

function playBtnHandler() {
    pauseVideo();
    setPlayBtn(false);
    if (config.adFirst) {
        requestAds();
    } else {
        setVideoControls(true);
        playNextVideo();
    }
}

function registerVideoEndedListener() {
    // An event listener to tell the SDK that our content video
    // is completed so the SDK can play any post-roll ads.
    if (config.videoTech === 'videojs') {
        player.on('ended', onContentEnded);
    } else {
        domRefs.videoElement.addEventListener('ended', onContentEnded);
    }
}

function unRegisterVideoEndedListener() {
    if (config.videoTech === 'videojs') {
        player.off('ended', onContentEnded);
    } else {
        domRefs.videoElement.removeEventListener('ended', onContentEnded);
    }
}

function onContentEnded() {
    // console.log('content ended....');
    adsLoader.contentComplete();
    requestAds();
}

function playNextVideo() {
    currentVideoIndex++;
    // check if this was the last video in playlist, if yes, reset the currentVideoIndex
    if (currentVideoIndex === playlist.length) {
        currentVideoIndex = 0;
    }
    setVideoSource(playlist[currentVideoIndex]);
    playVideo();
}

function setVideoSource(srcObject) {

    var src = typeof srcObject === 'object' ? srcObject.src : src;
    var type = typeof srcObject === 'object' ? srcObject.type : 'video/mp4';

    if (config.videoTech === 'videojs') {
        player.src({
            src: src,
            type: type
        });
    } else {
        var videoSource = domRefs.videoElement.getElementsByTagName('source')[0];
        if (!videoSource) {
            videoSource = document.createElement('source');
            domRefs.videoElement.appendChild(videoSource);
        }
        videoSource.src = src;
        videoSource.type = type;
        domRefs.videoElement.load();
    }

}


function setUpIMA() {
    // Create the ad display container.
    createAdDisplayContainer();
    // Init the ad display container.
    initAdDisplayContainer();

    // Create ads loader.
    adsLoader = new google.ima.AdsLoader(adDisplayContainer);
    // Listen and respond to ads loaded and error events.
    adsLoader.addEventListener(google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED, onAdsManagerLoaded, false);
    adsLoader.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, onAdError, false);

    registerVideoEndedListener();

}


function createAdDisplayContainer() {
    adDisplayContainer = new google.ima.AdDisplayContainer(domRefs.adContainer, domRefs.videoElement);
}

function initAdDisplayContainer() {
    adDisplayContainer.initialize();
}

function requestAds() {
    // Request video ads.
    var adsRequest = new google.ima.AdsRequest();
    adsRequest.adTagUrl = config.adTagUrl;

    // Specify the linear and nonlinear slot sizes. This helps the SDK to
    // select the correct creative if multiple are returned.
    adsRequest.linearAdSlotWidth = 640;
    adsRequest.linearAdSlotHeight = 400;

    adsRequest.nonLinearAdSlotWidth = 640;
    adsRequest.nonLinearAdSlotHeight = 150;
    console.log('requesting ad .......');

    adsLoader.requestAds(adsRequest);
}

function showAdContainer() {
    domRefs.adContainer.style.display = 'block';
}

function hideAdContainer() {
    domRefs.adContainer.style.display = 'none';
}


function playVideo() {
    if (config.videoTech === 'videojs') {
        player.play();
    } else {
        domRefs.videoElement.play();
    }
}

function pauseVideo() {
    if (config.videoTech === 'videojs') {
        player.pause();
    } else {
        domRefs.videoElement.pause();
    }
}

function setVideoControls(toShow) {
    if (config.videoTech === 'videojs') {
        player.controls(toShow);
    } else {
        domRefs.videoElement.controls = toShow;
    }
}

function setPlayBtn(toShow) {
    if (config.videoTech === 'videojs') {
        // player.controls(toShow);
        var playBtn = document.querySelector('.video-js .vjs-big-play-button');

        playBtn.style.display = toShow ? 'block' : 'none';
    } else {
        var playBtnContainer = document.getElementById('asc-playbtn-container');
        playBtnContainer.style.display = toShow ? 'block' : 'none';
    }
}


function onAdsManagerLoaded(adsManagerLoadedEvent) {
    console.log('AdsManager Loaded .......');

    // Get the ads manager.
    var adsRenderingSettings = new google.ima.AdsRenderingSettings();
    adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true;
    adsRenderingSettings.uiElements = [google.ima.UiElements.AD_ATTRIBUTION, google.ima.UiElements.COUNTDOWN];
    // give your video player reference to getAdsManager
    adsManager = adsManagerLoadedEvent.getAdsManager(domRefs.videoElement, adsRenderingSettings);

    // Add listeners to the required events.
    adsManager.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, onAdError);
    adsManager.addEventListener(google.ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED, onContentPauseRequested);
    adsManager.addEventListener(google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED, onContentResumeRequested);
    // adsManager.addEventListener(google.ima.AdEvent.Type.SKIPPED, onContentResumeRequested);
    adsManager.addEventListener(google.ima.AdEvent.Type.ALL_ADS_COMPLETED, onAdEvent);

    // Listen to any additional events, if necessary.
    adsManager.addEventListener(google.ima.AdEvent.Type.LOADED, onAdEvent);
    adsManager.addEventListener(google.ima.AdEvent.Type.STARTED, onAdEvent);
    adsManager.addEventListener(google.ima.AdEvent.Type.COMPLETE, onAdEvent);

    // For non-auto ad breaks, listen for ad break ready
    // adsManager.addEventListener(google.ima.AdEvent.Type.AD_BREAK_READY, adBreakReadyHandler);


    try {
        // Initialize the ads manager. Ad rules playlist will start at this time.
        adsManager.init(640, 360, google.ima.ViewMode.NORMAL);
        // Call play to start showing the ad. Single video and overlay ads will
        // start at this time; the call will be ignored for ad rules.
        adsManager.start();
    } catch (adError) {
        console.log(adError);
        // An error may be thrown if there was a problem with the VAST response.
        playVideo();
    }
}

function onAdEvent(adEvent) {
    console.log('add events ', adEvent);

    // Retrieve the ad from the event. Some events (e.g. ALL_ADS_COMPLETED)
    // don't have ad object associated.
    // var ad = adEvent.getAd();
    // switch (adEvent.type) {
    //     case google.ima.AdEvent.Type.LOADED:
    //        break;
    //     case google.ima.AdEvent.Type.STARTED:
    //         break;
    //     case google.ima.AdEvent.Type.COMPLETE:
    //         break;
    // }
}

function onAdError(adErrorEvent) {
    // Handle the error logging.
    console.log(adErrorEvent.getError());
    adsManager.destroy();
    resumeContent();
}

function onContentPauseRequested() {
    console.log('content pause requested');

    pauseVideo();
    setVideoControls(false);
    showAdContainer();
    unRegisterVideoEndedListener();
    setAdSize();
}

function onContentResumeRequested() {
    console.log('content resume requested');

    setVideoControls(true);
    hideAdContainer();
    registerVideoEndedListener();

    // To be able to request ads again, call below 2 methods
    adsManager.destroy();
    adsLoader.contentComplete();

    resumeContent();
}

function resumeContent() {
    if (resumeVideoAfterAd) {
        playVideo();
    } else {
        playNextVideo();
    }
}

/**
 * Sets Ad's size or resize the existing ad according to ad-container size
 */
function setAdSize() {
    // debugger;
    if (adsManager) {
        var h = domRefs.container.clientHeight;
        var w = domRefs.container.clientWidth;
        adsManager.resize(w, h, google.ima.ViewMode.NORMAL);
    }
}



function fetchMrssFeed(clbk) {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            const json = xmlToJson.parse(xhttp.responseText);
            clbk(json);
        }
    };
    xhttp.onerror = function () {
        console.error('ERROR OCCURED WHILE FETCHING THE MRSS FEED');
    }
    xhttp.open("GET", config.mrssFeedUrl);
    xhttp.send();
}

function extractPlaylist(mrssInfoObject) {
    var items = mrssInfoObject.rss.channel.item, playlist = [];

    items.forEach(function (item) {
        let media = item['media:content'];
        if (media.type === 'video/mp4' || media.type.indexOf('video/') === 0) {
            let playlistItem = {
                src: media.url,
                type: media.type
            };
            if (media['media:thumbnail'] && media['media:thumbnail'].url) {
                playlistItem.poster = media['media:thumbnail'].url;
            }

            playlist.push(playlistItem);

        }
    });
    return playlist;
}


window.document.addEventListener('DOMContentLoaded', function () {
    console.log('---------------DOM content loaded---------');
    loadScriptsAndStyle();
    buildDOM();
    setDOMRefernces();
    if (config.videoPositions.includes('floating') && !config.videoPositions.includes('inline')) {
        setVideoPositionFloating(true);
    }
});


window.addEventListener('load', function () {
    console.log('-----------------loaded----------------');

    // All the required scripts are loaded.
    // Fetch playlist data, init video player and IMASDK, do DOM related stuff
    // Register scroll listener
    fetchMrssFeed(function (mrss) {
        playlist = extractPlaylist(mrss);
        init();
        if (config.videoPositions.includes('inline') && config.videoPositions.includes('floating')) {
            setTimeout(() => {
                registerScrollListener(true);
            }, 2000);
        }
    });
});

/**
 * Calculate the size for asc-container wrapper after it is rendered. This helps in
 * showing the placeholder for video when video is playing inside floating container.
 */
function setContainerWrapperSize() {
    var height = domRefs.container.clientHeight;
    var width = domRefs.container.clientWidth;
    domRefs.containerWrapper.style.height = height + 'px';
    domRefs.containerWrapper.style.width = width + 'px';
    domRefs.containerWrapper.style.background = '#000';
    domRefs.containerWrapper.style.margin = '0 auto';
}


var throttledSrollListener = throttle(scrollListener, 200);


function registerScrollListener(register) {
    register ? window.addEventListener('scroll', throttledSrollListener) : window.removeEventListener('scroll', throttledSrollListener);
}


function shouldVideoBeFloating() {
    if (!isVideoFloating()) {
        setContainerWrapperSize();
    }
    var rect = domRefs.containerWrapper.getBoundingClientRect();

    if (rect.top < 0 && rect.bottom < rect.height / 4) {
        return true;
    }
    return false;
}

function throttle(fn, wait) {
    var toCall = true;
    return function () {
        if (toCall) {
            fn();
            toCall = false;
            setTimeout(function () {
                toCall = true;
            }, wait);
        }
    }
}

function scrollListener() {
    // console.log('scrolling');

    if (shouldVideoBeFloating()) {
        setVideoPositionFloating(true);
    } else {
        setVideoPositionFloating(false);
    }
}

function setVideoPositionFloating(showFloating) {
    if (showFloating) {
        domRefs.container.classList.add('floating');
    } else {
        domRefs.container.classList.remove('floating');
    }
    setAdSize();
}

function isVideoFloating() {
    return domRefs.container.classList.contains('floating');
}

function onFloatingCloseBtn() {
    floatingAdContainerClosed = true;
    if (config.videoPositions.includes('inline')) {

        setVideoPositionFloating(false);
        registerScrollListener(false);
    } else {
        // remove the wrapper from dom
        domRefs.containerWrapper.remove();
    }
}
