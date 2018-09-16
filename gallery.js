/*eslint-env es6, browser*/

/* TODO
- Sharpen preview button
- Header with link to YouTube channel, short about section
- Appearance and polish
- Favicon
- Support for more hosting services
- Mobile UI
- Prevent slideshow on elements not in view (-500)
- improve search by searching data
- light/dark theme
- minify everything
*/

let itemData = []; //All folders.
let gridFolders = []; //Visible folders that match the current search.
let searchFolders = []; //All folders that match the current search.
let slideShowGridItems = []; //Visible folders that contain multiple images.
let slideShowLoop;
let slideShowLoaded = -1;
let slideShowLoadedGroup = [];
let popups = [];
let exploreItemContent;

let sourceFrag;
let imgFrag;

let urlParams; // Containing the url search/sort parameters.
let sortBy = "date"; //sorting order
let currentSort = null;
let currentOrder = null;
let orderBy = "descending"; //sorting order
let filterSong = false; //only display folders with a song download

const thumbSizes = [
    {name: "m", width: 320, size: ":/thumbnails/0/c320x180_Crop/content"},
    {name: "l", width: 640, size: ":/thumbnails/0/c640x360_Crop/content"},
    {name: "", width: 1600, size: "/content"}
];
let curr;

let searchEnabled = false; //Enables and disables search.
let pageSize = 10;
let firstPageSize = 1;
let scrollbarExists = false;
let gridItemsPerRow = 1;

let loadmore;
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
let selectedItem;
let highlight;
let highlightImage;
let highlightLoad;
let highlightSong;
let highlightSongType;
let highlightSongTitle;
let highlightSongDownload;
let highlightImageDownload;
let highlightSongContainer;
let highlightImageContainer;
let explorerSelected;
let highlightLoaded = false;
let audioPlay;
let audioProgress;
let volume = 1;
let audioTextElapsed;
let audioTextTotal;
let audioTextStopUpdate = false;
let clipPathSupported = true;
let volumeText;
let autoExplore = false;
let ItemWidth;

let mainHeight = window.mainHeight;
let rem = window.rem;

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
    frag.childNodes[0].className = "image-bar";
    frag.childNodes[1].className = "sixteenbynine";
    let item = frag.childNodes[1];
    item.appendChild(document.createElement('img'));
    item.childNodes[0].className = "gallery-image";
    item = frag.childNodes[0];
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
    selectedItem.lastElementChild.style.filter = "";
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

    main.setAttribute("willchange", "");
    highlight.removeEventListener("transitionend", resetHighlightLoad);
    sidebar.firstElementChild.setAttribute("active","");
    returnTitle.textContent = folder.name;
    returnTitle.parentElement.style.backgroundColor = getRGB(RGBtoBrightness(folder.images[folder.thumbnailIndex].dominantColor, 52));
    selectedItem.lastElementChild.style.filter = "drop-shadow(0 0 0.4rem " + getRGB(RGBtoBrightness(folder.images[folder.thumbnailIndex].dominantColor, 220)) + ")";

    setUrl(getIndex(event.currentTarget.data));
}

function getIndex(folder) {
    let index = itemData.findIndex(function(element) {
        return element.date === folder.date;
    });
    return index + 1;
}

function loadExplorer(folder) {
    let temp = selectedItem;
    let url = "https://api.onedrive.com/v1.0/shares/s!AqeaU-N5JvJ_gYJLVTUOUyNy1NFPHA/root:/" + encodeURIComponent(folder.fullName) + ":/children?select=audio,file,@content.downloadUrl";

    explorerLoading.style.visibility = "visible";

    fetch(url).then(response => response.json()).then(function(response) {
        if(selectedItem === undefined) {
            return;
        }
        exploreItemContent = {
            files: [],
            images: []
        };
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
        type = "image";
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
        };
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
    highlightLoad.style.transition = "";
    highlightLoad.style.opacity = 0;
    highlightLoaded = true;
    highlightImageDownload.style.fontSize = highlightImageDownload.parentNode.offsetHeight * 0.4 + "px";
    playHoverOff();
}

function showHighlightSong() {
    highlightImageContainer.style.display = "";
    highlightLoad.style.transition = "";
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
    showHighlightLoad();
    highlight.removeEventListener("transitionend", resetHighlightLoad);
}

function closeExplorerHighlight() {
    fadePause();
    let temp = selectedItem;
    highlight.addEventListener("transitionend", resetHighlightLoad);
    main.removeAttribute("darken");
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
    audioProgress.firstElementChild.style.width = width + "px";
    if (width === updateProgress.totalWidth) {
        audioPlay.firstElementChild.className = "fas fa-play";
        audioProgress.firstElementChild.style.width = 0 + "px";
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
    audioTextStopUpdate = true;
    clearInterval(highlightSong.progressMeter);
    let initX = event.clientX;
    let initOffset = event.offsetX;
    audioProgress.firstElementChild.style.width = initOffset + "px";
    let f = function(event){
        audioProgress.firstElementChild.style.width = Math.max(Math.min((event.clientX - initX + initOffset), updateProgress.totalWidth),0) + "px";
        audioTextElapsed.textContent = secToTimeString(Math.round((parseInt(audioProgress.firstElementChild.style.width) / updateProgress.totalWidth) * highlightSong.duration));
    };
    window.addEventListener("mousemove", f);
    f(event);
    window.addClickQueue(function() {
        audioTextStopUpdate = false;
        if (!highlightSong.paused) {
            highlightSong.progressMeter = setInterval(updateProgress, 100);
        }
        window.removeEventListener("mousemove", f);
        let frac = parseInt(audioProgress.firstElementChild.style.width) / updateProgress.totalWidth;
        let time = highlightSong.duration * frac;
        audioJump(time);
    }, true);
    event.stopPropagation();
}

function playPause() {
    if (audioPlay.firstElementChild.className === "fas fa-play") {
        audioReset();
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
        playHoverOn();
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
    if (highlightSongContainer.style.display === "flex") {
        e.href = highlightSong.downloadUrl;
        e.download = selectedItem.data.files[highlightSong.index].name;
    } else if (highlightImageContainer.style.display === "grid") {
        e.href = highlightImage.downloadUrl;
        e.download = selectedItem.data.images[highlightImage.index].name;
    }
    e.style.display = "none";
    document.body.appendChild(e);
    e.click();
    document.body.removeChild(e);
}

function explorerHighlight(folder, type, index) {
    main.setAttribute("darken", "");
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
            }, 100);
        } else if (type === "image") {
            setTimeout(function(){
                if (highlightLoaded === false) {
                    showHighlightLoad(true);
                }
            }, 100);
        }
    } else if (highlightImageContainer.style.display === "grid") {
        if (type === "image") {
            setTimeout(function(){
                if (highlightLoaded === false) {
                    showHighlightLoad(true);
                }
            }, 100);
        } else if (type === "file") {
            setTimeout(function(){
                if (highlightLoaded === false) {
                    showHighlightLoad(true);
                }
            }, 100);
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
                highlightImage.downloadUrl = exploreItemContent.images[index].url;
                highlightImage.index = index;
                showHighlightImage();
            }
        };
        tempImg.onload = function() {
            display();
        };
        tempImg.onerror = function() {

        };
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
        explorer.children[1].children[0].textContent = "TRACKS - None Available";
        explorer.children[1].children[2].style.marginTop = "1rem";
    } else {
        explorer.children[1].children[0].textContent = "TRACKS";
        explorer.children[1].children[2].style.marginTop = "";
    }
    if (exploreItemContent.images.length === 0) {
        explorer.children[1].children[2].textContent = "IMAGES - None Available";
    } else {
        explorer.children[1].children[2].textContent = "IMAGES";
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
    e.lastChild.className = "item-options";
    e.lastChild.appendChild(document.createElement("i"));
    e.lastChild.firstChild.className = "fas fa-ellipsis-v";
}

function explorerPopulateImage(image, div) {
    let e = div;
    e.className = "explorer-box-item";
    e.appendChild(document.createElement("div"));
    e.appendChild(document.createElement("div"));
    e.firstChild.className = "explorer-box-item-title";
    e.firstChild.textContent = image.title;
    e.lastChild.className = "item-options";
    e.lastChild.appendChild(document.createElement("i"));
    e.lastChild.firstChild.className = "fas fa-ellipsis-v";
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
    });
}

function exploreItemContentAddImage(item) {
    let title = item.name;
    let resolution = item.image;
    let accessURL = item["@content.downloadUrl"];

    exploreItemContent.images.push({
        title: title,
        resolution: resolution,
        url: accessURL
    });
}


function RGBtoBrightness(rgb, brightness) {
    let multiplier = (brightness*3)/(rgb.r+rgb.g+rgb.b);
    return {
        r: Math.round(rgb.r * multiplier),
        g: Math.round(rgb.g * multiplier),
        b: Math.round(rgb.b * multiplier)
    };
}

function closeExplorer() {
    closeExplorerHighlight();
    main.removeAttribute("willchange");
    sidebar.firstElementChild.removeAttribute("notransition");
    sidebar.firstElementChild.removeAttribute("active");
    returnTitle.parentElement.style.backgroundColor = "rgb(26,26,26)";
    resetSelectedItem();
    setTimeout(function() {
        explorerLoading.style.visibility = "visible";
        explorerBoxFiles.replaceChild(document.createElement("div"), explorerBoxFiles.firstElementChild);
        explorerBoxImages.replaceChild(document.createElement("div"), explorerBoxImages.firstElementChild);
    }, 1000);
    setUrl(search.prevSearch);
}

function imgonerror(event) {
    let e = event.currentTarget;
    let folder = e.parentElement.parentElement.data;
    let url = "https://api.onedrive.com/v1.0/shares/s!AqeaU-N5JvJ_gYJLVTUOUyNy1NFPHA/root:/" + encodeURIComponent(folder.fullName) + "/" + encodeURIComponent(folder.images[folder.thumbnailIndex].name) + [curr.size];
    if (e.src !== url) {
        e.src = url;
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
    folder.gridItem.lastElementChild.style.backgroundColor = rgb;
    if (e.shadow !== undefined) {
        slideShowLoaded--;
        slideShowLoadedGroup.push(e);
        if (slideShowLoaded < 0) {
            e.shadow = undefined;
        } else if (slideShowLoaded === 0) {
            for (e of slideShowLoadedGroup) {
                e.shadow.style.opacity = 0;
                e.style.opacity = 1;
                e.shadow = undefined;
            }
            slideShowLoaded = -1;
        }
    } else {
        e.style.opacity = 1;
    }
}

function slideShow() {
    if (highlight.style.opacity === "1" || slideShowLoaded !== -1) {
        return;
    }

    slideShowLoaded = slideShowGridItems.length;
    slideShowLoadedGroup = [];

    let urlString = "https://api.onedrive.com/v1.0/shares/s!AqeaU-N5JvJ_gYJLVTUOUyNy1NFPHA/root:/";
    for (let i = 0; i < slideShowGridItems.length; i++) {
        let folder = slideShowGridItems[i];
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
            };
        }

        e2.shadow = e1;
        if (folder.images[index].imgurId !== undefined) {
            e2.src = "https://i.imgur.com/" + folder.images[index].imgurId + curr.name + ".jpg";
        } else {
            e2.src = "https://api.onedrive.com/v1.0/shares/s!AqeaU-N5JvJ_gYJLVTUOUyNy1NFPHA/root:/" + encodeURIComponent(folder.fullName) + "/" + encodeURIComponent(folder.images[folder.thumbnailIndex].name) + [curr.size];
        }
    }
}

function sortName(a,b) {
    let aName = a.name.toLowerCase();
    let bName = b.name.toLowerCase();
    if (aName < bName) {
        result = -1;
    } else if (aName > bName) {
        result = 1;
    } else {
        result = 0;
    }
    if (sort.mod) {
        return result;
    } else {
        return -result;
    }
}

function sortDate(a,b) {
    if (a.date < b.date) {
        result = -1;
    } else if (a.date > b.date) {
        result = 1;
    } else {
        result = 0;
    }
    if (sort.mod) {
        return result;
    } else {
        return -result;
    }
}

function sort(items) {
    if (currentSort === sortBy && currentOrder === orderBy) {
        return false;
    }
    let s = sortBy.toLowerCase();
    let o = orderBy.toLowerCase();
    let f;
    sort.mod = true;
    if (o === "descending") {
        sort.mod = false;
    }
    if (s === "name") {
        f = sortName;
    } else if (s === "date") {
        f = sortDate;
    }
    items.sort(f);
    currentSort = sortBy;
    currentOrder = orderBy;
    return true;
}

function calcSizes() {
    let gridWidth = grid.offsetWidth;
    let gridHeight = main.offsetHeight - (2 * rem) - (6 * rem);
    let minItemWidth = 16 * rem;
    let itemGap = 1 * rem;

    gridItemsPerRow = Math.floor((gridWidth - minItemWidth) / (minItemWidth + itemGap)) + 1;
    itemWidth = (gridWidth - ((gridItemsPerRow - 1) * itemGap)) / gridItemsPerRow;
    let itemHeight = ((itemWidth - 6) * 0.5625) + 36 + 6;
    let gridRowsPerPage = Math.max(Math.floor((gridHeight - itemHeight) / (itemHeight + itemGap)) + 1, 1);
    firstPageSize = gridRowsPerPage * gridItemsPerRow;
    pageSize = gridRowsPerPage * gridItemsPerRow * 3;
}

function setSources(folders) {
    if (itemWidth < thumbSizes[0]) {
        curr = thumbSizes[0];
    } else if (itemWidth < thumbSizes[1].width) {
        curr = thumbSizes[1];
    } else {
        curr = thumbSizes[2];
    }

    for (folder of folders) {
        if (folder.images[folder.thumbnailIndex].imgurId !== undefined) {
            folder.currImg = "https://i.imgur.com/" + folder.images[folder.thumbnailIndex].imgurId + curr.name + ".jpg";
        } else {
            folder.currImg = "https://api.onedrive.com/v1.0/shares/s!AqeaU-N5JvJ_gYJLVTUOUyNy1NFPHA/root:/" + encodeURIComponent(folder.fullName) + "/" + encodeURIComponent(folder.images[folder.thumbnailIndex].name) + [curr.size];
        }

        let target = folder.gridItem.lastElementChild.firstElementChild;
        if (target.src == "") {
            target.src = folder.currImg;
            if (target.complete) {
                target.style.transition = "opacity 0s";
                target.style.opacity = 1;
            }
        }
    }
}
function loadMore() {
    let moreFolders = [];
    let pageMod = -gridFolders.length % gridItemsPerRow;
    grid.style.gridTemplateColumns = "";

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
    setSources(moreFolders);
    let frag = document.createDocumentFragment();
    for(e of moreFolders) {
        if (e.rgbset === false) {
            let rgb = getRGB(e.images[0].dominantColorDark);
            e.gridItem.lastElementChild.style.backgroundColor = rgb;
        }
        frag.appendChild(e.gridItem);
    }
    grid.appendChild(frag);
    if (slideShowLoop !== undefined) {
        clearInterval(slideShowLoop);
        slideShowLoaded = -1;
    }
    slideShowLoop = setInterval(slideShow, 7000);
}

function fillGrid(folders) {
    searchFolders = folders;
    gridFolders = [];
    for (folder of folders) {
        if (gridFolders.length === firstPageSize) {
            break;
        }
        gridFolders.push(folder);

        if (folder.rgbset === false) {
            let rgb = getRGB(folder.images[0].dominantColorDark);
            folder.gridItem.lastElementChild.style.backgroundColor = rgb;
        }
    }

    setSources(gridFolders);

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
    if (gridFolders.length <= 3) {
        let count = Math.min(3, firstPageSize);
        grid.style.gridTemplateColumns = "repeat("+count+", 1fr)";
    } else {
        grid.style.gridTemplateColumns = "";
    }
    if (slideShowLoop !== undefined) {
        clearInterval(slideShowLoop);
        slideShowLoaded = -1;
    }
    slideShowLoop = setInterval(slideShow, 7000);
    if (autoExplore === true) {
        selectItem({currentTarget: grid.firstElementChild});
    }
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
        modstring = "?" + modstring.substring(0,modstring.length-1);
        finalurl += modstring;
    }
    url2 = encodeURI(finalurl);
    if (finalurl != baseurl) {
        window.history.replaceState("", "", finalurl);
    }
}

function paramsChanged() {
    let result = false;
    if (orderBy !== paramsChanged.orderBy) {
        result = true;
    } else if (sortBy !== paramsChanged.sortBy) {
        result = true;
    } else if (filterSong !== paramsChanged.filterSong) {
        result = true;
    }

    paramsChanged.orderBy = orderBy;
    paramsChanged.sortBy = sortBy;
    paramsChanged.filterSong = filterSong;

    return result;
}

function search(string) {
    if (!searchEnabled) {return;}
    setUrl(string);
    let paramChanged = paramsChanged();
    sort(itemData);
    let target;
    let results = [];
    if (!isNaN(string) && string !== "" && itemData.length >= parseInt(string)) {
        if(search.prevSearchData === undefined) {
            autoExplore = true;
            searchField.value = itemData[parseInt(string)-1].name;
        }
        results.push(itemData[parseInt(string)-1]);
    } else {
        autoExplore = false;
        if (search.prevSearch !== undefined && string.includes(search.prevSearch) && !paramChanged) {
            target = search.prevSearchData;
        } else {
            target = itemData;
        }
        for (let item of target) {
            if (searchItem(item, string)) {
                results.push(item);
            }
        }
    }
    search.prevSearch = string;
    search.prevSearchData = results;
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
    highlightImageDownload = document.getElementsByClassName("highlight-image-overlay-download")[0];
    volumeSlider = document.getElementsByClassName("audio-controls-volume-sliderbg")[0];
    volumeText = document.getElementsByClassName("audio-controls-volume-text")[0];
}

function setupHooks() {
    window.onresize = function() {
        rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
        mainHeight = document.documentElement.scrollHeight - (3.5 * rem) - (2 * rem);
        calcSizes();
        setSources(gridFolders);
        audioReset();
        if (highlightSongContainer.style.display === "flex") {
            if (highlightSongDownload.offsetHeight < highlightSongDownload.parentNode.offsetWidth) {
                highlightSongDownload.style.fontSize = highlightSongDownload.offsetHeight * 0.9 + "px";
            } else {
                highlightSongDownload.style.fontSize = highlightSongDownload.parentNode.offsetWidth * 0.9 + "px";
            }
        }
        if (highlightImageContainer.style.display === "grid") {
            highlightImageDownload.style.fontSize = highlightImageDownload.parentNode.offsetHeight * 0.4 + "px";
        }
        volumeSlider.rect = volumeSlider.getBoundingClientRect();
    };

    main.onclick = closeSelection;
    highlightImageDownload.onclick = highlightDownload;
    highlightSongDownload.onclick = highlightDownload;
    highlight.onmousedown = closeHighlightIfOutsideHighlight;
    audioPlay.onmouseover = playHoverOn;
    audioPlay.onmouseout = playHoverOff;
    audioPlay.onclick = playPause;
    audioProgress.onmousedown = onProgressBarClick;
    volumeSlider.onclick = volumeSliderClick;
    returnTitle.parentElement.children[1].onclick = closeExplorer;
    filterSongDownload.onclick = toggle;
    orderOption.onclick = dropdownOpen;
    sortOption.onclick = dropdownOpen;
    explorer.lastElementChild.onclick = closeHighlightIfOutsideHighlight;

    let els = document.getElementsByClassName("option-dropdown-item");
    for (let i = 0; i < els.length; i++) {
        els.item(i).onclick = dropdownSelect;

    }

    loadmore.firstElementChild.firstElementChild.onclick = function() {
        let scrollSave = main.scrollTop;
        loadMore();
        requestAnimationFrame(function() {
            main.scrollTop = scrollSave;
        });
    };

    searchField.oninput = function(e) {
        search(searchField.value);
    };
    searchField.style.transition = "outline 0.15s ease";

    requestAnimationFrame(function(){
        filterSongDownload.removeAttribute("noanim");
    });

    window.clickQueue = [];

    window.onmouseup = function(event) {
        for (let i = clickQueue.length - 1; i >= 0; i--) {
            clickQueue[i].func(event);
            if (clickQueue[i].once === true) {
                clickQueue.splice(i, 1);
            }
        }
    };

    window.addClickQueue = function(func, once="false") {
        window.clickQueue.push({func: func, once: once});
    };

    window.removeClickQueue = function(func) {
        for (let i = clickQueue.length - 1; i >= 0; i--) {
            if (clickQueue[i].func === func) {
                clickQueue.splice(i, 1);
                break;
            }
        }
    };

    window.addClickQueue(clearPopups.bind(this, false));

    highlightSong.ontimeupdate = function(event) {
        updateProgress();
        if (!audioTextStopUpdate) {
            audioTextElapsed.textContent = secToTimeString(Math.round(highlightSong.currentTime));
        }
    };
    highlightSong.onloadedmetadata = function(event) {
        audioTextTotal.textContent = secToTimeString(Math.round(highlightSong.duration));
    };

    let e = document.createElement("div");
    if (e.style.clipPath !== "") {
        clipPathSupported = false;
    } else {
        e.style.clipPath = "polygon(0px 0px, 100% 0px, 100% 100%, 0px 100%, 0px 0px, 2px 2px, 2px calc(100% - 2px), calc(100% - 2px) calc(100% - 2px), calc(100% - 2px) 2px, 2px 2px)";
        if (e.style.clipPath !== "polygon(0px 0px, 100% 0px, 100% 100%, 0px 100%, 0px 0px, 2px 2px, 2px calc(100% - 2px), calc(100% - 2px) calc(100% - 2px), calc(100% - 2px) 2px, 2px 2px)") {
            clipPathSupported = false;
        }
    }
}

function volumeSliderClick(event) {
    if (volumeSlider.parentNode.hasAttribute("active2") || volumeSliderClick.skip === true) {
        volumeSliderClick.skip = false;
        return;
    }

    let f = function() {
        volumeSlider.onmousedown = "";
        volumeSlider.parentNode.removeAttribute("active2");
    };
    window.addClickQueue(f, true);

    volumeSlider.onmousedown = function(event2) {
        window.removeClickQueue(f);
        let f2 = function(event2) {
            let oHeight = parseFloat(volumeSlider.offsetHeight);
            let sliderY = Math.max(Math.min(oHeight + ((volumeSlider.rect.top - (6.5 * 16)) - event2.y), oHeight),0);
            let sliderVol = sliderY/oHeight;
            setVolume(sliderVol);
            localStorage.setItem("volume", sliderVol);
            if (volumeSlider.rect.left <= event2.x && event2.x <= volumeSlider.rect.right && volumeSlider.rect.top - (6.5 * 16) <= event2.y && event2.y <= volumeSlider.rect.bottom) {
                volumeSliderClick.skip = true;
            }
            window.addClickQueue(f, true);
            window.onmousemove = "";
        };
        window.addClickQueue(f2, true);
        window.onmousemove = volumeSliderUpdate;
        let oHeight = parseFloat(volumeSlider.offsetHeight);
        let sliderY = Math.max(Math.min(oHeight + ((volumeSlider.rect.top - (6.5 * 16)) - event2.y), oHeight),0);
        let sliderVol = sliderY/oHeight;
        setVolume(sliderVol);
    };

    volumeSlider.rect = volumeSlider.getBoundingClientRect();

    volumeSlider.parentNode.setAttribute("active2", "");
    event.stopPropagation();
}

function setVolume(v) {
    volume = v;
    highlightSong.volume = v;
    volumeText.textContent = Math.round(highlightSong.volume * 100) + "%";
    volumeSlider.firstElementChild.style.height = (highlightSong.volume * 100) + "%";
    if (volume > 0.35) {
        volumeSlider.parentNode.firstElementChild.className = "fas fa-volume-up";
    } else if (volume > 0) {
        volumeSlider.parentNode.firstElementChild.className = "fas fa-volume-down";
    } else {
        volumeSlider.parentNode.firstElementChild.className = "fas fa-volume-off";
    }
}

function volumeSliderUpdate(event) {
    let oHeight = parseFloat(volumeSlider.offsetHeight);
    let sliderY = Math.max(Math.min(oHeight + ((volumeSlider.rect.top - (6.5 * 16)) - event.y), oHeight),0);
    let sliderVol = sliderY/oHeight;
    setVolume(sliderVol);
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
        sidebar.firstElementChild.setAttribute("willchange", "");
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
        if (sb === "name") {setSort("Name");}
        else if (sb === "date") {setSort("Date");}
    } else {
        setSort("Date");
    }
    if (!isEmpty(o)) {
        if (o === "asc") {setOrder("Ascending");}
        else if (o === "desc") {setOrder("Descending");}
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

        gridItem.lastElementChild.firstElementChild.onload = imgonload;
        gridItem.lastElementChild.firstElementChild.onerror = imgonerror;
        gridItem.firstElementChild.firstElementChild.textContent = folder.name;
        let dom = folder.images[0].dominantColor;
        let multiplier = 96/(dom.r+dom.g+dom.b);

        folder.images[0].dominantColorDark = {
            r: dom.r * multiplier,
            g: dom.g * multiplier,
            b: dom.b * multiplier
        };
        folder.fullName = folder.name;
        if (folder.suffix !== undefined) {
            folder.fullName += " - " + folder.suffix;
        }

        folder.thumbnailIndex = 0;
        if (folder.images.length != 1) {
            gridItem.childNodes[1].appendChild(imgFrag.cloneNode(true));
            gridItem.childNodes[1].childNodes[gridItem.childNodes.length-1].onload = imgonload;
            gridItem.childNodes[1].childNodes[gridItem.childNodes.length-1].onerror = imgonerror;
            gridItem.childNodes[1].childNodes[gridItem.childNodes.length-1].style.opacity = 0;
        }

        for (img of folder.images) {
            if (img.name.startsWith("§")) {
                img.name = folder.name + img.name.substring(1);
            }
        }

        if (folder.files !== undefined) {
            for (file of folder.files) {
                if (file.name.startsWith("§")) {
                    file.name = folder.name + file.name.substring(1);
                }
            }

        }

        folder.gridItem = document.createElement('div');
        folder.gridItem.onclick = selectItem;
        folder.gridItem.className = "grid-item";
        folder.gridItem.appendChild(gridItem);
        folder.gridItem.data = folder;
        folder.rgbset = false;
        itemData.push(folder);
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
    sidebar.firstElementChild.removeAttribute("willchange");
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

function loadStorage() {
    let v = localStorage.getItem("volume");
    if (v !== null) {
        setVolume(v);
    } else {
        setVolume(0.5);
    }
}

function preloader() {
    bindElements();
    handleUrlArguments();
    setupHooks();
    calcSizes();
    loadStorage();
}

preloader();
document.addEventListener("DOMContentLoaded", galleryInit);

