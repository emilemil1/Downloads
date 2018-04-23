/*eslint-env es6, jquery, browser*/

/* TODO
- Change image on download link hover
- Song preview
- Sharpen preview button
- Header with link to YouTube channel, short about section
- Appearance and polish
- Favicon
- Support for more hosting services
- Mobile UI
- Fill grid as the user scrolls, page size based on viewport
*/

let itemData = window.itemData; //All folders.
let gridFolders = []; //Folders that match the current search.
let slideShowGridItems = []; //Visible folders that contain multiple images.

let urlParams; // Containing the url search/sort parameters.
let sortBy = "date" //sorting order
let orderBy = "ascending" //sorting order
let filterSong = false; //only display folders with a song download

const thumbSizes = [{name: "thumbnailMedium", width: 300}, {name: "thumbnailLarge", width: 800}];

let searchEnabled = false; //Enables and disables search.
let smoothLoad = true; //Enables fade-in of loaded images.

let grid; //Grid element.
let main; //Main element.
let orderNameCheckbox;
let searchField;
let orderDateCheckbox;
let sortAscCheckbox;
let sortDescCheckbox;
let filterSongDownload;

let rem = parseFloat(getComputedStyle(document.documentElement).fontSize);

function isEmpty(obj) {
    for (let key in obj) {
        if(obj.hasOwnProperty(key)) {
            return false;
        }
    }

    return true;
}

function slideShow() {
    for (let i = 0; i < slideShowGridItems.length; i++) {
        let folder = slideShowGridItems[i];
        let index = folder.thumbnailIndex;
        let images = folder.images;
        let e1 = folder.gridItem.lastElementChild.children[index];
        index = folder.thumbnailIndex = ((index + 1) % images.length);
        let e2 = folder.gridItem.lastElementChild.children[index];
        let rgb = getRGB(images[index].dominantColorDark);
        folder.gridItem.firstElementChild.firstElementChild.style.backgroundColor = rgb;
        folder.gridItem.firstElementChild.lastElementChild.style.backgroundColor = rgb;
        e1.style.opacity = "0";
        e2.style.opacity = "1";
    }
}

function sort(folders) {
    folders.sort(function(a, b) {
        let result;

        if (sortBy === "name") {
            result = a.name < b.name;
        } else if (sortBy === "date") {
            result = Date.parse(a.createdDateTime) < Date.parse(b.createdDateTime);
        }

        if (orderBy === "descending") {
            result = !result;
        }

        return result;
    })
}

function resizeSource() {
    if (gridFolders.length === 0) {
        return;
    }
    let curr;
    let folder = gridFolders[0];
    let child = folder.gridItem.lastElementChild.firstElementChild;
    if (gridFolders.length === 1) {
        if (child.src = folder.images[0].downloadUrl) {
            return;
        }

        for(let i = 0; i < folder.images.length; i++) {
            let image = folder.gridItem.lastElementChild.children[i];
            let url = folder.images[i].downloadUrl;
            let img = document.createElement('img');
            img.onload = function() {
                image.src = img.src;
            }
            img.src = url;
        }
        return;
    }
    let gridWidth = (window.innerWidth - (15 * rem)) * 0.93;
    let actualItems = Math.min(Math.floor(gridWidth/(16 * rem)), gridFolders.length);
    let width = gridWidth / actualItems;

    curr = thumbSizes[0];

    if (width > thumbSizes[0].width) {
        curr = thumbSizes[1];
    }

    for (folder of gridFolders) {
        if (width < thumbSizes[0].width) {
            folder.gridItem.classList.add("reduced");
        }
        if(child.src != folder.images[0][curr.name]) {
            let child = folder.gridItem.lastElementChild.firstElementChild;
            for(let i = 0; i < folder.images.length; i++) {
                let image = folder.gridItem.lastElementChild.children[i];
                let url = folder.images[i][curr.name];
                let img = document.createElement('img');
                img.onload = function() {
                    image.src = img.src;
                }
                img.src = url;
            }
        }
    }
}

function fillGrid(folders) {
    sort(folders);
    let abort = true;
    if (gridFolders.length === folders.length) {
        for (let i = 0; i < gridFolders.length; i++) {
            if (gridFolders[i].name != folders[i].name) {
                abort = false;
                break;
            }
        }
        if (abort) {
            return;
        }
    }

    if (gridFolders.length === 1) {
        for (let f of gridFolders) {
            f.gridItem.style.width = null;
            f.gridItem.style.marginLeft = null;
        }
    }
    for (let folder of gridFolders) {
        folder.gridItem.lastElementChild.firstElementChild.style.opacity = 0;
        folder.gridItem.classList.remove("reduced");
    }

    gridFolders = folders;
    slideShowGridItems = [];
    for (let folder of folders) {
        if (folder.images.length > 1) {
            slideShowGridItems.push(folder);
        }
        if (!smoothLoad) {
            folder.gridItem.lastElementChild.firstElementChild.style.opacity = 1;
        }
    };
    while (grid.hasChildNodes()) {
        grid.removeChild(grid.lastChild);
    }
    let frag = new DocumentFragment()
    for(e of gridFolders) {
        frag.appendChild(e.gridItem);
    }
    grid.appendChild(frag);
    if (gridFolders.length === 1) {
        let padding = parseFloat(window.getComputedStyle(main).getPropertyValue("padding-top"))*2;
        let fitWidth = (parseFloat(main.offsetHeight) - padding)*(16/9);
        if (fitWidth > parseFloat(gridFolders[0].gridItem.lastElementChild.offsetWidth)) {
            fitWidth = parseFloat(grid.offsetWidth);
        }
        gridFolders[0].gridItem.style.width = fitWidth + "px";
        let widthDiff = parseFloat(grid.offsetWidth) - fitWidth;
        gridFolders[0].gridItem.style.marginLeft = (widthDiff/2) + "px";
    }
    resizeSource();
}

function searchItem(item, string) {
    if (!item.name.toLowerCase().includes(string.toLowerCase())) {
        return false;
    }
    if (filterSong === true && item.files.length === 0) {
        return false;
    }

    return true;
}

function setUrl(string) {
    let baseurl = window.location.href;
    let url = baseurl;
    if (baseurl.includes("index.html")) {
        url = baseurl.substring(0,baseurl.indexOf("index.html")+10);
    } else {
        url = baseurl.substring(0,baseurl.lastIndexOf("/")+1);
    }
    let modstring = "";
    if (string !== "") {
        modstring += "s=" + string + "&";
    }
    if (sortBy !== "date") {
        modstring += "sb=" + sortBy + "&";
    }
    if (orderBy !== "ascending") {
        modstring += "o=" + "desc" + "&";
    }
    if (filterSong !== false) {
        modstring += "f=" + "song" + "&";
    }
    if (modstring !== "") {
        modstring = "?" + modstring.substring(0,modstring.length-1)
        url += modstring;
    }
    if (url != baseurl) {
        window.history.pushState("", "", url);
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

function clickNameCheckbox() {
    orderNameCheckbox.disabled = true;
    orderDateCheckbox.disabled = false;
    orderNameCheckbox.checked = true;
    orderDateCheckbox.checked = false;
    sortBy = "name";
    if(orderBy === "descending") {
        search(searchField.value);
    } else {
        sortDescCheckbox.click();
    }
}

function clickDateCheckbox() {
    orderDateCheckbox.disabled = true;
    orderNameCheckbox.disabled = false;
    orderDateCheckbox.checked = true;
    orderNameCheckbox.checked = false;
    sortBy = "date";
    if(orderBy === "ascending") {
        search(searchField.value);
    } else {
        sortAscCheckbox.click();
    }
}

function clickSortAscCheckbox() {
    sortAscCheckbox.disabled = true;
    sortDescCheckbox.disabled = false;
    sortAscCheckbox.checked = true;
    sortDescCheckbox.checked = false;
    orderBy = "ascending";
    search(searchField.value);
}

function clickSortDescCheckbox() {
    sortDescCheckbox.disabled = true;
    sortAscCheckbox.disabled = false;
    sortDescCheckbox.checked = true;
    sortAscCheckbox.checked = false;
    orderBy = "descending";
    search(searchField.value);
}

function clickFilterSongDownloadCheckbox(event) {
    filterSong = !filterSong;
    search(searchField.value);
}

function setupHooks() {
    main = document.getElementsByClassName("main")[0]
    orderNameCheckbox = document.getElementsByClassName("order-name-checkbox")[0];
    searchField = document.getElementsByClassName("search-field")[0];
    orderDateCheckbox = document.getElementsByClassName("order-date-checkbox")[0];
    sortAscCheckbox = document.getElementsByClassName("sort-asc-checkbox")[0];
    sortDescCheckbox = document.getElementsByClassName("sort-desc-checkbox")[0];
    filterSongDownload = document.getElementsByClassName("filter-song-download-checkbox")[0];

    grid = main.firstElementChild;
    window.onresize = function() {
        rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
        if (gridFolders.length === 1) {
            for (let f of gridFolders) {
                f.gridItem.style.width = null;
                f.gridItem.style.marginLeft = null;
            }
            let padding = parseFloat(window.getComputedStyle(main).getPropertyValue("padding-top"))*2;
            let fitWidth = (parseFloat(main.offsetHeight) - padding)*(16/9);
            if (fitWidth > parseFloat(gridFolders[0].gridItem.lastElementChild.offsetWidth)) {
                fitWidth = parseFloat(grid.offsetWidth);
            }
            gridFolders[0].gridItem.style.width = fitWidth + "px";
            let widthDiff = parseFloat(grid.offsetWidth) - fitWidth;
            gridFolders[0].gridItem.style.marginLeft = (widthDiff/2) + "px";
        }
        resizeSource();
    };

    searchField.oninput = function() {
        search(searchField.value);
    }

    orderNameCheckbox.onchange = clickNameCheckbox;
    orderDateCheckbox.onchange = clickDateCheckbox;
    sortAscCheckbox.onchange = clickSortAscCheckbox;
    sortDescCheckbox.onchange = clickSortDescCheckbox;
    filterSongDownload.onchange = clickFilterSongDownloadCheckbox;

    let mutObs = new MutationObserver(function (record) {
        if (smoothLoad) {
            record[0].addedNodes.forEach(function(gridItem) {
                if (gridItem.lastElementChild.firstElementChild.completed) {
                    gridItem.lastElementChild.firstElementChild.style.opacity = 1;
                    let rgb = getRGB(folder.images[0].dominantColorDark);
                    gridItem.firstElementChild.firstElementChild.style.backgroundColor = rgb;
                    gridItem.firstElementChild.lastElementChild.style.backgroundColor = rgb;

                } else {
                    gridItem.lastElementChild.firstElementChild.onload = function() {
                        gridItem.lastElementChild.firstElementChild.style.opacity = 1;
                        gridItem.lastElementChild.firstElementChild.onload = null;
                        let rgb = getRGB(gridItem.data.images[0].dominantColorDark);
                        gridItem.firstElementChild.firstElementChild.style.backgroundColor = rgb;
                        gridItem.firstElementChild.lastElementChild.style.backgroundColor = rgb;
                    }
                }

            });
        smoothLoad = false;
        }
    })

    mutObs.observe(grid, {childList: true});

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

function handleUrlArguments() {
    let params = getUrlParams();
    let sb = params.sb;
    let o = params.o;
    let f = params.f;
    let s = params.s;

    if (!isEmpty(f)) {
        if (f === "song") {
            clickFilterSongDownloadCheckbox();
            filterSongDownload.checked = true;
        }
    }
    if (!isEmpty(sb)) {
        if (sb === "name") {clickNameCheckbox()}
        else if (sb === "date") {clickDateCheckbox()}
    } else {
        clickDateCheckbox();
    }
    if (!isEmpty(o)) {
        if (o === "asc") {clickSortAscCheckbox()}
        else if (o === "desc") {clickSortDescCheckbox()}
    } else {
        clickSortAscCheckbox();
    }

    if (!isEmpty(s)) {
        document.getElementsByClassName("search-field")[0].value = s;
    }
}

async function galleryInit() {
    setupHooks();
    handleUrlArguments();
    setInterval(slideShow, 7000);
    await window.preload;
    searchEnabled = true;
    let s = getUrlParams("s");
    if (!isEmpty(s)) {
        search(s);
    } else {
        search("");
    }
}
document.addEventListener("DOMContentLoaded", galleryInit);

