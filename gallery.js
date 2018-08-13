/*eslint-env es6, browser*/

/* TODO
- Song preview
- Sharpen preview button
- Header with link to YouTube channel, short about section
- Appearance and polish
- Favicon
- Support for more hosting services
- Mobile UI
- Prevent slideshow on elements not in view (-500)
- improve search by searching data
- light/dark theme
- specific search for grid item
- minify everything
- force reload of manifest on update
- don't load resolution if a higher one exists
*/

let itemData = []; //All folders.
let gridFolders = []; //Visible folders that match the current search.
let searchFolders = []; //All folders that match the current search.
let slideShowGridItems = []; //Visible folders that contain multiple images.
let slideShowLoop;
let popups = [];
let exploreItemContent;

let sourceFrag;
let imgFrag;

let urlParams; // Containing the url search/sort parameters.
let sortBy = "date" //sorting order
let orderBy = "descending" //sorting order
let filterSong = false; //only display folders with a song download

const thumbSizes = [{name: "m", width: 320, backup: "downloadMedium"}, {name: "l", width: 640, backup: "downloadLarge"}, {name: "", width: 1600, backup: "downloadUrl"}];
let curr;
let itemWidth;
let itemHeight;
let scrollBarWidth = 17;

let searchEnabled = false; //Enables and disables search.
let pageSize = 10;
let firstPageSize = 1;
let scrollbarExists = false;
let pageHeight;
let mainHeight;
let gridItemsPerRow = 1;

let loadmore;
let loadedMore = false;
let grid; //Grid element.
let main; //Main element.
let sidebar;
let explorerBoxFiles;
let explorerBoxImages;
let explorerLoading;
let explorer;
let sortOption;
let searchField;
let orderOption;
let filterSongDownload;
let scrollPos;
let returnTitle;
let returnButtonColor;
let selectedItem;
let hoverTile;
let highlight;
let highlightImage;
let highlightLoad;
let highlightSong;
let highlightSongType;
let highlightSongTitle;
let highlightSongDownload;
let highlightSongContainer;
let highlightImageContainer;
let explorerSelected;
let highlightLoaded = false;
let audioPlay;
let audioProgress;
let volume = 1;
let audioTextElapsed;
let audioTextTotal;

let rem = parseFloat(getComputedStyle(document.documentElement).fontSize);

function isEmpty(obj) {
    for (let key in obj) {
        if(obj.hasOwnProperty(key)) {
            return false;
        }
    }

    return true;
}

function mod(n,m) {
    return ((n % m) + m) % m;
}

function createElementTemplate() {
    let frag = document.createDocumentFragment();

    frag.appendChild(document.createElement('div'));
    frag.appendChild(document.createElement('div'));
    frag.childNodes[0].className = "image-ui-container";
    frag.childNodes[1].className = "sixteenbynine";
    let item = frag.childNodes[1];
    item.appendChild(document.createElement('img'));
    item.childNodes[0].className = "gallery-image";
    item = frag.childNodes[0];
    item.appendChild(document.createElement('div'));
    item.appendChild(document.createElement('div'));
    item.childNodes[0].className = "image-bar";
    item.childNodes[1].className = "image-frame";
    item = item.childNodes[0];
    item.appendChild(document.createElement('span'));
    item.childNodes[0].className = "image-title";

    return frag;
}

function createImgTemplate() {
    let frag = document.createDocumentFragment();

    frag.appendChild(document.createElement('img'));
    frag.childNodes[0].className = "gallery-image";

    return frag;
}

function resetSelectedItem() {
    selectedItem.style.filter = "";
    selectedItem = undefined;
}

function closeSelection(event) {
    if ((event.target === event.currentTarget || event.target === grid) && selectedItem !== undefined) {
        closeExplorer();
    }
}

function selectItem(event) {
    if (selectedItem === event.currentTarget) {
        closeExplorer();
        return;
    }

    let folder = event.currentTarget.data;

    if (selectedItem !== undefined) {
        resetSelectedItem();
        selectedItem = event.currentTarget;
        loadExplorer(folder);
    } else {
        selectedItem = event.currentTarget;
        setTimeout(function(){
            loadExplorer(folder);
        }, 1000, folder);
    }

    highlight.removeEventListener("transitionend", resetHighlightLoad);
    sidebar.firstElementChild.style.transform = "translateX(-50%)";
    returnTitle.textContent = folder.name;
    returnButtonColor = RGBtoBrightness(folder.images[folder.thumbnailIndex].dominantColor, 52);
    returnTitle.parentElement.style.backgroundColor = getRGB(returnButtonColor);
    selectedItem.style.filter = "drop-shadow(0 0 0.4rem " + getRGB(RGBtoBrightness(folder.images[folder.thumbnailIndex].dominantColor, 220)) + ")";
}

function loadExplorer(folder) {
    let temp = selectedItem;
    let url = "https://api.onedrive.com/v1.0/shares/s!AqeaU-N5JvJ_gYJLVTUOUyNy1NFPHA/root:/" + encodeURIComponent(folder.fullName) + ":/children?select=audio,file,@content.downloadUrl";

    explorerLoading.style.visibility = "visible";

    fetch(url).then(response => response.json()).then(function(response) {
        exploreItemContent = {
            files: [],
            images: []
        }
        let f = [];
        let i = [];
        let indi = 0;
        let indf = 0;
        for (item of response.value) {
            if (item.file.mimeType.startsWith("audio")) {
                item.name = selectedItem.data.files[indf].name;
                indf++;
                f.push(item);
            } else if (item.file.mimeType.startsWith("image")) {
                item.name = selectedItem.data.images[indi].name;
                indi++;
                i.push(item);
            }
        }
        for (file of f) {
            if (f.length === 1) {
                exploreItemContentAddFile(file, "Nightcore");
            } else {
                exploreItemContentAddFile(file);
            }
        }
        for (img of i) {
            exploreItemContentAddImage(img);
        }
        if (temp !== selectedItem) {
            return;
        }
        explorePopulate();
        /*
        if (explorerBoxImages.offsetHeight + explorerBoxFiles.offsetHeight + 84 > explorer.getBoundingClientRect().height - 16) {
            if (scrollBarWidth > 4.8) {
                explorer.style.paddingRight = "0.3rem";
                explorer.style.paddingLeft = "0.3rem";
            } else {
                explorer.style.paddingRight = (4.8 - scrollBarWidth) + "px";
                explorer.style.paddingLeft = "0.3rem";
            }
        } else {
            explorer.style.paddingRight = "0.3rem";
            explorer.style.paddingLeft = "0.3rem";
        }
        */
        explorerLoading.style.visibility = "hidden";
    });
}

function onExplorerItemClick(event) {
    let element = event.currentTarget.parentElement;
    let type;

    if (element.hasAttribute("active")) {
        element.removeAttribute("active");
        explorerSelected = undefined;
        closeExplorerHighlight();
        return;
    }
    element.setAttribute("active", "");
    if (explorerSelected !== undefined) {
        explorerSelected.removeAttribute("active");
        explorerSelected = undefined;
    }
    if (element.parentNode.parentNode.classList.contains("explorer-box-files")) {
        type = "file";
    } else if (element.parentNode.parentNode.classList.contains("explorer-box-images")) {
        type = "image"
    }
    explorerSelected = element;
    explorerHighlight(selectedItem.data, type, element.index);
}

function closeHighlightIfOutsideHighlight(event) {
    if (event.target === event.currentTarget && explorerSelected !== undefined) {
        explorerSelected.removeAttribute("active");
        explorerSelected = undefined;
        closeExplorerHighlight();
    }
}

function showHighlightLoad(nohide=false, fade=false) {
    if (fade) {
        let func = function(){
            highlightLoad.style.transition = "";
            highlightLoad.removeEventListener("transitionend", func);
        }
        highlightLoad.addEventListener("transitionend", func);
        highlightLoad.style.transition = "opacity 0.5s";
    }
    highlightLoad.style.opacity = "";
    playHoverOff();
    if (nohide) {
        return;
    }
    highlightImageContainer.style.display = "";
    highlightSongContainer.style.display = "";
}

function showHighlightImage() {
    highlightSongContainer.style.display = "";
    highlightImageContainer.style.display = "grid";
    highlightLoad.style.transition = "opacity 0s";
    highlightLoad.style.opacity = 0;
    highlightLoaded = true;
    playHoverOff();
}

function showHighlightSong() {
    highlightImageContainer.style.display = "";
    let func = function(){
        highlightLoad.style.transition = "";
        highlightLoad.removeEventListener("transitionend", func);
    }
    highlightLoad.addEventListener("transitionend", func);
    highlightLoad.style.transition = "opacity 0s";
    highlightLoad.style.opacity = 0;
    highlightSongContainer.style.display = "flex";
    highlightLoaded = true;
    if (highlightSongDownload.offsetHeight < highlightSongDownload.parentNode.offsetWidth) {
        highlightSongDownload.style.fontSize = highlightSongDownload.offsetHeight * 0.9 + "px";
    } else {
        highlightSongDownload.style.fontSize = highlightSongDownload.parentNode.offsetWidth * 0.9 + "px";
    }
    audioPlay.firstElementChild.className = "fas fa-play";
    clearInterval(highlightSong.progressMeter);
    audioReset(true);
    playHoverOff();
}

function resetHighlightLoad() {
    showHighlightLoad()
    highlight.removeEventListener("transitionend", resetHighlightLoad);
}

function closeExplorerHighlight() {
    fadePause();
    let temp = selectedItem;
    highlight.addEventListener("transitionend", resetHighlightLoad);
    main.style.filter = "";
    highlight.style.opacity = 0;
    highlight.style.pointerEvents = "";
    highlightImage.note = null;
}

function playHoverOn() {
    if (selectedItem === undefined) {
        return;
    }
    let clr = RGBtoBrightness(selectedItem.data.images[0].dominantColor, 80);
    audioPlay.style.backgroundColor = getRGB(clr);
}

function playHoverOff() {
    if (selectedItem === undefined) {
        return;
    }
    let clr = RGBtoBrightness(selectedItem.data.images[0].dominantColor, 64);
    audioPlay.style.backgroundColor = getRGB(clr);
}

function updateProgress() {
    let width = Math.round((highlightSong.currentTime / highlightSong.duration) * updateProgress.totalWidth);
    if (width !== updateProgress.currentWidth) {
        updateProgress.currentWidth = width
        audioProgress.firstElementChild.style.width = width + "px";
    }
    if (width === updateProgress.totalWidth) {
        clearInterval(highlightSong.progressMeter);
        audioPlay.firstElementChild.className = "fas fa-play";
        audioProgress.firstElementChild.style.width = 0 + "px";

    } else if (highlightSong.currentTime === 0) {
        clearInterval(highlightSong.progressMeter);
    }
}

function audioReset(zero=false) {
    updateProgress.totalWidth = parseInt(audioProgress.offsetWidth);
    if (zero) {
        audioProgress.firstElementChild.style.width = "0px";
    } else {
        updateProgress.currentWidth = Math.floor((highlightSong.currentTime / highlightSong.duration) * updateProgress.totalWidth);
        audioProgress.firstElementChild.style.width = updateProgress.currentWidth + "px";
    }
}

function audioJump(time) {
    highlightSong.currentTime = time;
    audioProgress.firstElementChild.style.width = Math.round((highlightSong.currentTime / highlightSong.duration) * updateProgress.totalWidth) + "px";
}

function onProgressBarClick(event) {
    clearInterval(highlightSong.progressMeter);
    let initX = event.clientX;
    let initOffset = event.offsetX;
    audioProgress.firstElementChild.style.width = initOffset + "px";
    let f = function(event){
        audioProgress.firstElementChild.style.width = Math.max(Math.min((event.clientX - initX + initOffset), updateProgress.totalWidth),0) + "px";
        audioTextElapsed.textContent = secToTimeString(Math.round((parseInt(audioProgress.firstElementChild.style.width) / updateProgress.totalWidth) * highlightSong.duration));
    };
    window.addEventListener("mousemove", f);
    window.addClickQueue(function() {
        if (!highlightSong.paused) {
            highlightSong.progressMeter = setInterval(updateProgress, 100);
        }
        window.removeEventListener("mousemove", f)
        let frac = parseInt(audioProgress.firstElementChild.style.width) / updateProgress.totalWidth;
        console.log(frac);
        let time = highlightSong.duration * frac;
        audioJump(time);
    }, true);
    event.stopPropagation();
}

function playPause() {
    if (audioPlay.firstElementChild.className === "fas fa-play") {
        audioReset();
        highlightSong.progressMeter = setInterval(updateProgress, 100);
        if (highlightSong.currentTime === 0 || highlightSong.currentTime === highlightSong.duration) {
            highlightSong.volume = volume;
            highlightSong.play();
        } else {
            fadePlay();
        }
        playHoverOn();
        audioPlay.firstElementChild.className = "fas fa-pause";
    } else {
        if (highlightSong.currentTime !== 0) {
            fadePause();
        }
        playHoverOn()
        audioPlay.firstElementChild.className = "fas fa-play";
    }
}

function fadePlay() {
    highlightSong.volume = 0;
    let startVolume = highlightSong.volume;
    let volumeChange = volume - highlightSong.volume;
    let time = 0;
    let duration = 1;

    highlightSong.play();
    let i = setInterval(function(){
        highlightSong.volume = easeInOutSine(time, startVolume, volumeChange, duration);
        time += 0.02;
        if (time >= 1) {
            clearInterval(i);
        }
    }, 10);
}

function fadePause() {
    if (highlightSong.volume === 0) {
        return;
    }
    let startVolume = highlightSong.volume;
    let volumeChange = 0 - startVolume;
    let time = 0;
    let duration = 1;

    let i = setInterval(function(){
        highlightSong.volume = easeInOutSine(time, startVolume, volumeChange, duration);
        time += 0.02;
        if (time >= 1) {
            clearInterval(i);
            clearInterval(highlightSong.progressMeter);
            highlightSong.pause();
            clearInterval(highlightSong.progressMeter);
        }
    }, 10);
}

function easeInOutSine (t, b, c, d) {
    return -c/2 * (Math.cos(Math.PI*t/d) - 1) + b;
}

function highlightDownload() {
    let e = document.createElement('a');
    e.href = highlightSong.downloadUrl;
    e.download = selectedItem.data.files[highlightSong.index].name;
    e.style.display = "none";
    document.body.appendChild(e);
    e.click();
    document.body.removeChild(e);
}

function explorerHighlight(folder, type, index) {
    main.style.filter = "blur(0.5rem) brightness(30%)";
    highlightLoaded = false;
    if (highlightLoad.style.opacity == "") {
        showHighlightLoad(true);
    } else if (highlightSongContainer.style.display === "flex") {
        fadePause();
        if (type === "file") {
            setTimeout(function(){
                if (highlightLoaded === false) {
                    showHighlightLoad(true);
                }
            }, 100)
        } else if (type === "image") {
            setTimeout(function(){
                if (highlightLoaded === false) {
                    showHighlightLoad(true);
                }
            }, 100)
        }
    } else if (highlightImageContainer.style.display === "grid") {
        if (type === "image") {
            setTimeout(function(){
                if (highlightLoaded === false) {
                    showHighlightLoad(true);
                }
            }, 100)
        } else if (type === "file") {
            setTimeout(function(){
                if (highlightLoaded === false) {
                    showHighlightLoad(true);
                }
            }, 100)
        }
    }
    highlight.style.opacity = 1;
    highlight.style.pointerEvents = "all";
    if (type === "image") {
        let tempImg = document.createElement("img");
        let selected = explorerSelected;
        let display = function() {
            if (selected === explorerSelected && highlightImage.note === "timeout" && tempImg.complete) {
                highlightImage.src = tempImg.src;
                showHighlightImage();
            }
        }
        tempImg.onload = function() {
            display();
        }
        tempImg.onerror = function() {

        }
        if (highlightImageContainer.style.display === "") {
            setTimeout(function() {
                if(explorerSelected === undefined) {
                    return;
                }
                highlightImage.note = "timeout";
                display();
            }, 1000);
        } else {
            highlightImage.note = "timeout";
        }
        tempImg.src = exploreItemContent.images[index].url;
    } else if (type === "file") {
        audioProgress.firstElementChild.style.backgroundColor = getRGB(RGBtoBrightness(selectedItem.data.images[0].dominantColor, 64));
        fetch(exploreItemContent.files[index].url,{mode: "cors"}).then(function(response){
            return response.blob();
        }).then(function(data){
            highlightSong.src = URL.createObjectURL(data);
            highlightSong.type = exploreItemContent.files[index].type;
            highlightSongType.textContent = exploreItemContent.files[index].short;
            highlightSongTitle.textContent = folder.songName;
            highlightSong.downloadUrl = exploreItemContent.files[index].url;
            highlightSong.index = index;
            showHighlightSong();
        });
    }
}

function explorePopulate() {
    let fileFrag = document.createDocumentFragment();
    let imageFrag = document.createDocumentFragment();


    let index = 0;
    for (file of exploreItemContent.files) {
        fileFrag.appendChild(document.createElement('div'));
        fileFrag.lastElementChild.index = index;
        index++;
        explorerPopulateFile(file, fileFrag.lastChild);
        fileFrag.lastElementChild.firstElementChild.onclick = onExplorerItemClick;
    }

    index = 0;
    for (image of exploreItemContent.images) {
        imageFrag.appendChild(document.createElement('div'));
        imageFrag.lastElementChild.index = index;
        index++;
        explorerPopulateImage(image, imageFrag.lastChild);
        imageFrag.lastElementChild.firstElementChild.onclick = onExplorerItemClick;
    }

    if (exploreItemContent.files.length === 0) {
        explorer.children[1].children[0].textContent = "Files - None Available";
        explorer.children[1].children[2].style.marginTop = "1rem";
    } else {
        explorer.children[1].children[0].textContent = "Files";
        explorer.children[1].children[2].style.marginTop = "";
    }
    if (exploreItemContent.images.length === 0) {
        explorer.children[1].children[2].textContent = "Images - None Available";
    } else {
        explorer.children[1].children[2].textContent = "Images";
    }

    let div = document.createElement("div");
    div.className = "explorer-box-content";
    explorerBoxFiles.replaceChild(div, explorerBoxFiles.firstElementChild);
    div.appendChild(fileFrag);

    div = document.createElement("div");
    div.className = "explorer-box-content";
    explorerBoxImages.replaceChild(div, explorerBoxImages.firstElementChild);
    div.appendChild(imageFrag);
}

function explorerPopulateFile(file, div) {
    let e = div;
    e.className = "explorer-box-item";
    e.appendChild(document.createElement("div"));
    e.appendChild(document.createElement("div"));
    e.firstChild.className = "explorer-box-item-title";
    e.firstChild.textContent = file.short;
    e = e.lastChild;
    e.className = "item-options";
    e.appendChild(document.createElement("div"));
    e.appendChild(document.createElement("div"));
    e.appendChild(document.createElement("div"));
    e.childNodes[0].className = "item-options-dot";
    e.childNodes[1].className = "item-options-dot";
    e.childNodes[2].className = "item-options-dot";
}

function explorerPopulateImage(image, div) {
    let e = div;
    e.className = "explorer-box-item";
    e.appendChild(document.createElement("div"));
    e.appendChild(document.createElement("div"));
    e.firstChild.className = "explorer-box-item-title";
    e.firstChild.textContent = image.title;
    e = e.lastChild;
    e.className = "item-options";
    e.appendChild(document.createElement("div"));
    e.appendChild(document.createElement("div"));
    e.appendChild(document.createElement("div"));
    e.childNodes[0].className = "item-options-dot";
    e.childNodes[1].className = "item-options-dot";
    e.childNodes[2].className = "item-options-dot";
}

function exploreItemContentAddFile(item, force=null) {
    let title = item.name;
    let shortTitle;
    if (force !== null) {
        shortTitle = force;
    } else if (title.includes("(Extended) (Nightcore)")) {
        shortTitle = "Extended Nightcore";
    } else if (title.includes("(Extended) (Original)")) {
        shortTitle = "Extended Original";
    } else if (title.includes("(Nightcore)")) {
        shortTitle = "Nightcore";
    } else if (title.includes("Video Edit")) {
        shortTitle = "Video Edit";
    } else {
        shortTitle = "Original";
    }

    let mimeType = item.file.mimeType;
    let accessURL = item["@content.downloadUrl"];

    exploreItemContent.files.push({
        title: title,
        short: shortTitle,
        url: accessURL,
        type: mimeType
    })
}

function exploreItemContentAddImage(item) {
    let title = item.name;
    let resolution = item.image;
    let accessURL = item["@content.downloadUrl"];

    exploreItemContent.images.push({
        title: title,
        resolution: resolution,
        url: accessURL
    })
}


function RGBtoBrightness(rgb, brightness) {
    let multiplier = (brightness*3)/(rgb.r+rgb.g+rgb.b);
    return {
        r: Math.round(rgb.r * multiplier),
        g: Math.round(rgb.g * multiplier),
        b: Math.round(rgb.b * multiplier)
    }
}

function closeExplorer() {
    closeExplorerHighlight();
    sidebar.firstElementChild.style.transform = "";
    returnTitle.parentElement.style.backgroundColor = "rgb(26,26,26)";
    resetSelectedItem();
    setTimeout(function() {
        explorerLoading.style.visibility = "visible";
        explorerBoxFiles.replaceChild(document.createElement("div"), explorerBoxFiles.firstElementChild);
        explorerBoxImages.replaceChild(document.createElement("div"), explorerBoxImages.firstElementChild);
    }, 1000);
}

function returnHover() {
    let r = Math.round(returnButtonColor.r * 1.5);
    let g = Math.round(returnButtonColor.g * 1.5);
    let b = Math.round(returnButtonColor.b * 1.5);
    returnTitle.parentElement.children[1].style.backgroundColor = getRGB({r: r, g: g, b: b});
}

function returnHoverOff() {
    returnTitle.parentElement.children[1].style.backgroundColor = "";
}

function hoverItem(event) {
    hoverTile = event.currentTarget;
    let item = event.currentTarget;
    let bar = item.firstElementChild.firstElementChild;
    let frame = item.firstElementChild.lastElementChild;

    let folder = item.data;
    let newRGB = RGBtoBrightness(folder.images[folder.thumbnailIndex].dominantColor, 64);
    let string = getRGB(newRGB);

    let f = function() {
        bar.style.transition = "background-color 2s";
        frame.style.transition = "background-color 2s";
        bar.removeEventListener("transitionend", f);
    }

    bar.addEventListener("transitionend", f);

    bar.style.transition = "background-color 0.15s";
    frame.style.transition = "background-color 0.15s";
    bar.style.backgroundColor = string;
    frame.style.backgroundColor = string
}

function hoverOffItem(event) {
    if (hoverTile === event.currentTarget) {
        hoverTile = undefined;
    }

    let item = event.currentTarget;
    let bar = item.firstElementChild.firstElementChild;
    let frame = item.firstElementChild.lastElementChild;

    let folder = item.data;
    let oldRGB = folder.images[folder.thumbnailIndex].dominantColorDark;
    let string = getRGB(oldRGB);

    let f = function() {
        if (bar.style.backgroundColor === string) {
            bar.style.transition = "background-color 2s";
            frame.style.transition = "background-color 2s";
        }
        bar.removeEventListener("transitionend", f);
    }

    bar.addEventListener("transitionend", f);

    bar.style.transition = "background-color 0.15s";
    frame.style.transition = "background-color 0.15s";
    bar.style.backgroundColor = string;
    frame.style.backgroundColor = string;
}

function imgonerror(event) {
    let e = event.currentTarget;
    let folder = e.parentElement.parentElement.data;
    if (e.src !== folder.images[folder.thumbnailIndex][curr.backup]) {
        e.src = folder.images[folder.thumbnailIndex][curr.backup];
    }
}

function imgonload(event) {
    if (event.currentTarget.naturalHeight === 81) {
        imgonerror(event);
        return;
    }
    let e = event.currentTarget;
    let folder = e.parentElement.parentElement.data;
    let rgb = getRGB(folder.images[folder.thumbnailIndex].dominantColorDark);
    folder.gridItem.firstElementChild.firstElementChild.style.backgroundColor = rgb;
    folder.gridItem.firstElementChild.lastElementChild.style.backgroundColor = rgb;
    folder.gridItem.lastElementChild.style.backgroundColor = rgb;
    if (e.shadow !== undefined) {
        e.shadow.style.opacity = 0;
        folder.currImg = e.src;
        e.shadow = undefined;
    }
    e.style.opacity = 1;
}

function slideShow() {
    if (selectedItem !== undefined) {
        return;
    }

    let urlString = "https://api.onedrive.com/v1.0/shares/s!AqeaU-N5JvJ_gYJLVTUOUyNy1NFPHA/root:/";
    for (let i = 0; i < slideShowGridItems.length; i++) {
        let folder = slideShowGridItems[i];
        if (folder.gridItem === hoverTile) {
            continue;
        }
        let images = folder.images;
        let e1 = folder.gridItem.lastElementChild.firstElementChild;
        let e2;
        if (e1.style.opacity === "1") {
            e2 = folder.gridItem.lastElementChild.lastElementChild;
        } else {
            e2 = e1;
            e1 = folder.gridItem.lastElementChild.lastElementChild;
        }
        folder.thumbnailIndex = mod(folder.thumbnailIndex + 1,Math.min(images.length, 5));
        let index = folder.thumbnailIndex;

        if (folder.images[index].dominantColorDark === undefined) {
            let dom = folder.images[index].dominantColor;
            let multiplier = 96/(dom.r+dom.g+dom.b);
            folder.images[index].dominantColorDark = {
                r: dom.r * multiplier,
                g: dom.g * multiplier,
                b: dom.b * multiplier
            }
        }

        e2.shadow = e1;
        if (folder.images[index].imgurId !== undefined) {
            e2.src = "https://i.imgur.com/" + folder.images[index].imgurId + curr.name + ".jpg";
        } else {
            e2.src = folder.images[index][curr.backup];
        }
    }
}

function sort(folders) {
    folders.sort(function(a, b) {
        let result;

        if (sortBy.toLowerCase() === "name") {
            let aName = a.name.toLowerCase();
            let bName = b.name.toLowerCase();
            if (aName < bName) {
                result = -1;
            } else if (aName > bName) {
                result = 1;
            } else {
                result = 0;
            }
        } else if (sortBy.toLowerCase() === "date") {
            if (a.date < b.date) {
                result = -1;
            } else if (a.date > b.date) {
                result = 1;
            } else {
                result = 0;
            }
        }

        if (orderBy.toLowerCase() === "descending") {
            result = -result;
        }
        return result;
    })
}

function calcItemWidth(itemCount) {
    let gridWidth = document.body.getBoundingClientRect().width - 15*rem - 6*rem;
    let gridHeight = document.body.getBoundingClientRect().height - 3*rem - 2*rem;
    if (itemCount !== 0) {
        gridItemsPerRow = Math.floor((gridWidth - (16*rem)) / (17*rem)) + 1;
        let gridItemsFirstRow = Math.max(Math.min(gridItemsPerRow, folders.length, itemCount), 3);
        let totalItemWidth = gridWidth - (1 * rem * (gridItemsFirstRow-1));
        itemWidth = (totalItemWidth/gridItemsFirstRow);
        itemHeight = ((itemWidth-4)/(16/9))+4;
        if (itemWidth <= thumbSizes[0].width) {
            itemHeight = itemHeight + 34;
        }
        let gridRowsPerPage = Math.max(Math.floor((gridHeight - (9*rem)) / itemHeight), 1);
        firstPageSize = gridRowsPerPage * gridItemsPerRow;
        pageSize = gridRowsPerPage * gridItemsPerRow * 3;
        let visibleItems = gridFolders.length;
        if (gridFolders.length === 0) {
            visibleItems = firstPageSize;
        }
        let visibleRows = Math.ceil(visibleItems / gridItemsPerRow);
        pageHeight = (itemHeight * visibleRows) + ((1 * rem) * (visibleRows - 1));
        if (visibleItems < itemCount) {
            pageHeight += (6 * rem);
        }
    } else {
        //REMEMBER
        let fitWidth = gridHeight*(16/9);
        if (fitWidth > gridWidth) {
            fitWidth = gridWidth;
        }
        itemWidth = fitWidth;
        itemHeight = itemWidth/(16/9);
        if (itemWidth <= thumbSizes[0].width) {
            itemHeight += 34;
        }
        pageHeight = mainHeight;
    }
}

function resizeSource() {
    let width = itemWidth;
    let nodelist = [];
    for(folder of gridFolders) {
        nodelist.push(folder.gridItem.lastElementChild);
        nodelist.push(folder.gridItem.firstElementChild);
        nodelist.push(folder.gridItem.firstElementChild.firstElementChild);

    }
    if (gridFolders.length === 0) {
        return;
    }
    if (gridFolders.length === 1) {
        for (let img of folder.images) {
            img.downloadUrl = "https://api.onedrive.com/v1.0/shares/s!AqeaU-N5JvJ_gYJLVTUOUyNy1NFPHA/root:/" + encodeURIComponent(folder.name);
            if (folder.suffix !== undefined) {
                img.downloadUrl += " - " + folder.suffix;
            }
            img.downloadUrl += "/" + encodeURIComponent(img.name) + ":/content";
        }
        curr = thumbSizes[2];
        nodelist.forEach((node) => {
            node.classList.remove("reduced");
        });
    } else {
        if (width > thumbSizes[0].width) {
            curr = thumbSizes[1]
            nodelist.forEach((node) => {
                node.classList.remove("reduced");
            });
        } else {
            curr = thumbSizes[0]
            nodelist.forEach((node) => {
                node.classList.add("reduced");
            });
        }

    }

    for (folder of gridFolders) {
        if (folder.gridItem.style.width !== itemWidth) {
            folder.gridItem.style.width = itemWidth + "px";
        }
        if (folder.gridItem.style.height !== itemHeight) {
            folder.gridItem.style.height = itemHeight + "px";
        }
        if (folder.images[folder.thumbnailIndex].imgurId !== undefined) {
            folder.currImg = "https://i.imgur.com/" + folder.images[folder.thumbnailIndex].imgurId + curr.name + ".jpg";
        } else {
            folder.currImg = folder.images[folder.thumbnailIndex][curr.backup];
        }

        if (folder.gridItem.lastElementChild.firstElementChild.src !== folder.currImg) {
            let target = folder.gridItem.lastElementChild.firstElementChild;
            if(target.src === "") {
                target.src = folder.currImg;
                if (target.complete) {
                    target.style.opacity = 1;
                }
            } else {
                let tempImg = new Image();
                let f = folder;
                tempImg.onload = function() {
                    if (tempImg.src === f.currImg)
                    target.src = f.currImg;
                }
                tempImg.src = f.currImg;
            }
        }
    }

    if ((Math.floor(pageHeight) > mainHeight) && main.style.paddingRight !== "calc(3rem - " + scrollBarWidth + "px)") {
        main.style.paddingRight = "calc(3rem - " + scrollBarWidth + "px)";
    } else if ((Math.floor(pageHeight) <= mainHeight) && main.style.paddingRight !== "3rem") {
        main.style.paddingRight = "3rem";
    }

    if (gridFolders.length < 3) {
        grid.style.gridTemplateColumns = "repeat(3, 1fr)";
    } else {
        grid.style.gridTemplateColumns = "";
    }
}

function loadMore() {
    let moreFolders = [];

    let pageMod = -gridFolders.length % gridItemsPerRow;

    for (let i = gridFolders.length; moreFolders.length < (pageSize + pageMod); i++) {
        if (gridFolders.length === searchFolders.length) {
            loadmore.style.display = "none";
            break;
        }
        gridFolders.push(searchFolders[i]);
        moreFolders.push(searchFolders[i]);

        if (searchFolders[i].images.length > 1) {
            slideShowGridItems.push(searchFolders[i]);
        }

    }
    let frag = document.createDocumentFragment();
    for(e of moreFolders) {
        if (e.rgbset === false) {
            let rgb = getRGB(e.images[0].dominantColorDark);
            e.gridItem.firstElementChild.firstElementChild.style.backgroundColor = rgb;
            e.gridItem.firstElementChild.lastElementChild.style.backgroundColor = rgb;
            e.gridItem.lastElementChild.style.backgroundColor = rgb;
        }
        frag.appendChild(e.gridItem);
    }

    if (loadedMore === false) {
        loadedMore = true;
        calcItemWidth(gridFolders.length);
    }
    grid.appendChild(frag);
    requestAnimationFrame(resizeSource);
}

function fillGrid(folders) {
    loadedMore = false;
    sort(folders);
    searchFolders = folders;
    gridFolders = [];
    calcItemWidth(folders.length);
    for (folder of folders) {
        if (gridFolders.length === firstPageSize) {
            break;
        }
        gridFolders.push(folder);

        if (folder.rgbset === false) {
            let rgb = getRGB(folder.images[0].dominantColorDark);
            folder.gridItem.firstElementChild.firstElementChild.style.backgroundColor = rgb;
            folder.gridItem.firstElementChild.lastElementChild.style.backgroundColor = rgb;
            folder.gridItem.lastElementChild.style.backgroundColor = rgb;
        }
    }

    if (gridFolders.length < searchFolders.length) {
        loadmore.style.display = "flex";
    } else {
        loadmore.style.display = "none";
    }

    slideShowGridItems = [];
    for (let folder of gridFolders) {
        if (folder.images.length > 1) {
            slideShowGridItems.push(folder);
        }
    };
    if(main.childElementCount !== 0) {
        main.removeChild(grid);
        grid = document.createElement('div');
        grid.className = "grid";
        main.insertBefore(grid, loadmore);
    }

    let frag = document.createDocumentFragment();
    for(e of gridFolders) {
        frag.appendChild(e.gridItem);
    }
    grid.appendChild(frag);
    requestAnimationFrame(resizeSource);
    if (slideShowLoop !== undefined) {
        clearInterval(slideShowLoop);
    }
    slideShowLoop = setInterval(slideShow, 7000);
}

function searchItem(item, string) {
    if (!item.name.toLowerCase().includes(string.toLowerCase())) {
        return false;
    }
    if (filterSong === true && item.files === undefined) {
        return false;
    }

    return true;
}

function setUrl(string) {
    let baseurl = window.location.href;
    let finalurl = baseurl;
    if (baseurl.includes("index.html")) {
        finalurl = baseurl.substring(0,baseurl.indexOf("index.html")+10);
    } else {
        finalurl = baseurl.substring(0,baseurl.lastIndexOf("/")+1);
    }
    let modstring = "";
    if (string !== "") {
        modstring += "s=" + string + "&";
    }
    if (sortBy.toLowerCase() !== "date") {
        modstring += "sb=" + "name" + "&";
    }
    if (orderBy.toLowerCase() !== "descending") {
        modstring += "o=" + "asc" + "&";
    }
    if (filterSong !== false) {
        modstring += "f=" + "song" + "&";
    }
    if (modstring !== "") {
        modstring = "?" + modstring.substring(0,modstring.length-1)
        finalurl += modstring;
    }
    url2 = encodeURI(finalurl);
    if (finalurl != baseurl) {
        window.history.replaceState("", "", finalurl);
    }
}

function search(string) {
    if (!searchEnabled) {return}
    let results = [];
    setUrl(string);
    for (let item of itemData) {
        if (searchItem(item, string)) {
            results.push(item);
        }
    }
    fillGrid(results);
}

function orderMode(string) {
    let items = orderOption.lastElementChild.firstElementChild.lastElementChild;

    if (string === "Name") {
        items.children[0].textContent = "A-Z";
        items.children[0].setAttribute("value", "Ascending");
        items.children[1].textContent = "Z-A";
        items.children[1].setAttribute("value", "Descending");
    } else if (string === "Date") {
        items.children[0].textContent = "Newest";
        items.children[0].setAttribute("value", "Descending");
        items.children[1].textContent = "Oldest";
        items.children[1].setAttribute("value", "Ascending");
    }
}

function setSort(string) {
    sortBy = string;
    sortOption.firstElementChild.textContent = sortBy;
    orderMode(sortBy);

    let prevIndex = sortOption.firstElementChild.getAttribute("index");
    let items = sortOption.lastElementChild.firstElementChild.lastElementChild;
    items.children[prevIndex].removeAttribute("checked");

    if (sortBy === "Date") {
        sortOption.firstElementChild.setAttribute("index", "0");
        items.children[0].setAttribute("checked", "");
        setOrder("Descending");
    } else if (sortBy === "Name") {
        sortOption.firstElementChild.setAttribute("index", "1");
        items.children[1].setAttribute("checked", "");
        setOrder("Ascending");
    }
    search(searchField.value);
}

function setOrder(string) {
    orderBy = string;
    let prevIndex = orderOption.firstElementChild.getAttribute("index");
    let items = orderOption.lastElementChild.firstElementChild.lastElementChild;
    items.children[prevIndex].removeAttribute("checked");

    let index = 0;
    if (orderBy === "Ascending") {
        index = 1;
    }
    if (sortBy === "Name") {
        index = Math.abs(index - 1);
    }

    orderOption.firstElementChild.setAttribute("index", index);
    items.children[index].setAttribute("checked", "");
    orderOption.firstElementChild.textContent = items.children[index].textContent;

    search(searchField.value);
}

function bindElements() {
    main = document.getElementsByClassName("main")[0];
    searchField = document.getElementsByClassName("search-field")[0];
    orderOption = document.getElementById("order-select");
    sortOption = document.getElementById("sort-select");
    filterSongDownload = document.getElementById("filtersong-select");
    explorer = document.getElementsByClassName("explorer")[0];
    explorerBoxFiles = document.getElementsByClassName("explorer-box-files")[0];
    explorerBoxImages = document.getElementsByClassName("explorer-box-images")[0];
    explorerLoading = document.getElementsByClassName("explorer-loading")[0];
    grid = main.firstElementChild;
    loadmore = main.lastElementChild;
    sidebar = document.getElementsByClassName("sidebar")[0];
    returnTitle = document.getElementsByClassName("return-title")[0];
    highlight = document.getElementsByClassName("highlight")[0];
    highlightImage = document.getElementsByClassName("highlight-image")[0];
    highlightLoad = document.getElementsByClassName("highlight-load")[0];
    highlightImageContainer = document.getElementsByClassName("highlight-image-container")[0];
    highlightSong = document.getElementsByClassName("highlight-song")[0];
    highlightSongContainer = document.getElementsByClassName("highlight-song-container")[0];
    audioPlay = document.getElementsByClassName("audio-controls-play")[0];
    audioProgress = document.getElementsByClassName("audio-controls-progress")[0];
    audioTextElapsed = document.getElementsByClassName("audio-controls-progress-elapsed")[0];
    audioTextTotal = document.getElementsByClassName("audio-controls-progress-total")[0];
    highlightSongType = document.getElementsByClassName("highlight-song-overlay-type")[0];
    highlightSongTitle = document.getElementsByClassName("highlight-song-overlay-title")[0];
    highlightSongDownload = document.getElementsByClassName("highlight-song-overlay-download")[0];
}

function setupHooks() {
    mainHeight = document.documentElement.scrollHeight - (3 * rem) - (2 * rem);
    window.onresize = function() {
        rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
        mainHeight = document.documentElement.scrollHeight - (3 * rem) - (2 * rem);
        calcItemWidth(searchFolders.length);
        resizeSource();
        audioReset();
        if (highlightSongContainer.style.display === "flex") {
            if (highlightSongDownload.offsetHeight < highlightSongDownload.parentNode.offsetWidth) {
                highlightSongDownload.style.fontSize = highlightSongDownload.offsetHeight * 0.9 + "px";
            } else {
                highlightSongDownload.style.fontSize = highlightSongDownload.parentNode.offsetWidth * 0.9 + "px";
            }
        }
    };

    loadmore.firstElementChild.firstElementChild.onclick = function() {
        let scrollSave = main.scrollTop;
        loadMore();
        requestAnimationFrame(function() {
            main.scrollTop = scrollSave;
        });
    }

    searchField.oninput = function(e) {
        search(searchField.value);
    }
    searchField.style.transition = "outline 0.15s ease";

    requestAnimationFrame(function(){
        filterSongDownload.removeAttribute("noanim");
    })

    window.clickQueue = [];

    window.onmouseup = function() {
        for (let i = clickQueue.length - 1; i >= 0; i--) {
            clickQueue[i].func();
            if (clickQueue[i].once === true) {
                clickQueue.splice(i, 1);
            }
        }
    }

    window.addClickQueue = function(func, once="false") {
        window.clickQueue.push({func: func, once: once})
    }

    window.removeClickQueue = function(func) {
        for (let i = clickQueue.length - 1; i >= 0; i--) {
            if (clickQueue[i].func === func) {
                clickQueue.splice(i, 1);
                break;
            }
        }
    }

    window.addClickQueue(clearPopups.bind(this, false));

    highlightSong.ontimeupdate = function(event) {
        audioTextElapsed.textContent = secToTimeString(Math.round(highlightSong.currentTime));
    }
    highlightSong.onloadedmetadata = function(event) {
        audioTextTotal.textContent = secToTimeString(Math.round(highlightSong.duration));
    }
}

function secToTimeString(sec) {
    let min = Math.floor(sec / 60);
    sec = sec % 60;

    if (sec < 10) {
        sec = "0" + sec;
    }

    return min + ":" + sec;
}

function clearPopups(newPopupSoon) {
    for (let pop of popups) {
        pop.removeAttribute("active");
    }
    if (!newPopupSoon) {
        sidebar.firstElementChild.style.willChange = "";
    }
}

function getRGB(obj) {
    return "rgb(" + obj.r + "," + obj.g + "," + obj.b + ")";
}

function getUrlParams(prop) {
    if (urlParams !== undefined) {
        if (prop !== undefined) {
            return (prop && prop in urlParams) ? urlParams[prop]: {};
        } else {
            return urlParams;
        }
    }
    urlParams = {};
    let search = decodeURIComponent(window.location.href.slice(window.location.href.indexOf("?")+1));
    if (search === decodeURIComponent(window.location.href)) {
        return (prop && prop in urlParams) ? urlParams[prop]: urlParams;
    }
    let definitions = search.split("&");

    definitions.forEach(function(val) {
        let parts = val.split('=', 2);
        urlParams[parts[0]] = parts[1];
    });

    if (prop !== undefined) {
        return (prop && prop in urlParams) ? urlParams[prop]: {};
    } else {
        return urlParams;
    }
}

function enableSongFilter() {
    filterSong = true;
    filterSongDownload.setAttribute("checked", "");
}

function handleUrlArguments() {
    let params = getUrlParams();
    let sb = params.sb;
    let o = params.o;
    let f = params.f;
    let s = params.s;

    if (!isEmpty(f)) {
        if (f === "song") {
            enableSongFilter();
        }
    }
    if (!isEmpty(sb)) {
        if (sb === "name") {setSort("Name")}
        else if (sb === "date") {setSort("Date")}
    } else {
        setSort("Date");
    }
    if (!isEmpty(o)) {
        if (o === "asc") {setOrder("Ascending")}
        else if (o === "desc") {setOrder("Descending")}
    } else {
        setOrder("Descending");
    }

    if (!isEmpty(s)) {
        document.getElementsByClassName("search-field")[0].value = s;
    }
}

function storeData(data) {
    let sourceFrag = createElementTemplate();
    let imgFrag = createImgTemplate();

    for (let folder of data) {
        let gridItem = sourceFrag.cloneNode(true);

        gridItem.childNodes[1].childNodes[0].onload = imgonload;
        gridItem.childNodes[1].childNodes[0].onerror = imgonerror;
        gridItem.childNodes[0].childNodes[0].childNodes[0].textContent = folder.name;
        let dom = folder.images[0].dominantColor;
        let multiplier = 96/(dom.r+dom.g+dom.b);

        folder.images[0].dominantColorDark = {
            r: dom.r * multiplier,
            g: dom.g * multiplier,
            b: dom.b * multiplier
        }
        folder.fullName = folder.name;
        if (folder.suffix !== undefined) {
            folder.fullName += " - " + folder.suffix;
        }

        folder.thumbnailIndex = 0;
        if (folder.images.length != 1) {
            gridItem.childNodes[1].appendChild(imgFrag.cloneNode(true));
            gridItem.childNodes[1].childNodes[gridItem.childNodes.length-1].onload = imgonload;
            gridItem.childNodes[1].childNodes[gridItem.childNodes.length-1].onerror = imgonerror;
        }

        folder.gridItem = document.createElement('div');
        folder.gridItem.onclick = selectItem;
        folder.gridItem.onmouseover = hoverItem;
        folder.gridItem.onmouseout = hoverOffItem;
        folder.gridItem.className = "grid-item";
        folder.gridItem.appendChild(gridItem);
        folder.gridItem.data = folder;
        folder.rgbset = false;
        itemData.push(folder);
    }
}

function getScrollBarWidth() {
    let scrollDiv = document.createElement('div');
    scrollDiv.className = "scrollbar-measure";
    document.body.appendChild(scrollDiv);

    scrollBarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
    document.body.removeChild(scrollDiv);
    if (scrollBarWidth === 0) {
        if ('WebkitAppearance' in document.documentElement.style) {
            scrollBarWidth = 8;
        } else {
            scrollBarWidth = 17;
        }
    }
}
function toggle(event) {
    let target = event.currentTarget;
    if (target.hasAttribute("checked")) {
        target.removeAttribute("checked");
    } else {
        target.setAttribute("checked", "");
    }

    if (target.getAttribute("id") === "filtersong-select") {
        filterSong = target.hasAttribute("checked");
        search(searchField.value);
    }
}

function dropdownSelect(event) {
    let root = event.currentTarget.parentElement.parentElement.parentElement.parentElement;
    let selection = event.currentTarget.getAttribute("value");
    root.removeAttribute("active");

    if (root.firstElementChild.textContent === event.currentTarget.textContent) {
        event.stopPropagation();
        return;
    }

    if (root.getAttribute("id") === "order-select") {
        setOrder(selection);
    } else if (root.getAttribute("id") === "sort-select") {
        setSort(selection);
    }
    event.stopPropagation();
}

function dropdownOpen(event) {
    if (event.currentTarget.hasAttribute("active")) {
        return;
    }
    sidebar.firstElementChild.style.willChange = "auto";
    clearPopups(true);
    event.currentTarget.setAttribute("active", "");
    popups.push(event.currentTarget);
    event.stopPropagation();
}

async function galleryInit() {
    await window.preload;
    storeData(window.folders);
    clearTimeout(window.spinAdd);
    document.getElementById("spinner").remove();
    searchEnabled = true;
    let s = getUrlParams("s");
    if (!isEmpty(s)) {
        search(s);
    } else {
        search("");
    }
}

function preloader() {
    bindElements();
    handleUrlArguments();
    getScrollBarWidth();
    setupHooks();
}

preloader();
document.addEventListener("DOMContentLoaded", galleryInit);

