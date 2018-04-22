/*eslint-env es6, jquery, browser*/

/* TODO
- Change image on download link hover
- Song preview
- Sharpen preview button
- Header with link to YouTube channel, short about section
- Appearance and polish
- Favicon
- Support for more hosting services
- Request metadata on file viewing
- Mobile UI
- Convert all px to rem
- dynamic thumbnail resolution
*/

let itemData = window.itemData; //All folders.
let gridFolders = []; //Folders that match the current search.
let slideShowGridItems = window.slideShowGridItems; //Folders that contain multiple images.

let urlParams; // Containing the url search/sort parameters.
let sortBy = "date" //sorting order
let orderBy = "ascending" //sorting order
let filterSong = false; //only display folders with a song download

let searchEnabled = false; //Enables and disables search.

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
        let e1 = folder.gridItem.children[1].children[index];
        index = folder.thumbnailIndex = ((index + 1) % images.length);
        let e2 = folder.gridItem.children[1].children[index];
        let e3 = folder.gridItem.children[1].children[(index+1)%images.length];
        if (e3 === e1) {
            e3 = undefined;
        }
        folder.gridItem.children[0].children[0].style.backgroundColor = images[index].dominantColorDark;
        folder.gridItem.children[0].children[1].style.backgroundColor = images[index].dominantColorDark;
        e1.style.opacity = "0";
        e2.style.opacity = "1";

        if (e3 === undefined || folder.darkColor[(index+1)%images.length] !== undefined) {
            return
        }
    }
}

function sort(folders) {
    folders.sort(function(a, b) {
        let aData = a.data;
        let bData = b.data;
        let result;

        if (sortBy === "name") {
            result = aData.name < bData.name;
        } else if (sortBy === "date") {
            result = Date.parse(aData.createdDateTime) < Date.parse(bData.createdDateTime);
        }

        if (orderBy === "descending") {
            result = !result;
        }

        return result;
    })
}

function fillGrid(folders) {
    if (gridFolders.length === 1) {
        for (let f of gridFolders) {
            f.gridItem.style.width = null;
            f.gridItem.style.marginLeft = null;
        }
    }

    gridFolders = [];
    let gridElements = []
    for (let folder of folders) {
        gridFolders.push(folder);
        gridElements.push(folder.gridItem);
    }

    let grid = document.getElementsByClassName("grid")[0];
    while (grid.hasChildNodes()) {
        grid.removeChild(grid.lastChild);
    }
    let arr = Array.from(gridElements);
    sort(arr)
    let frag = new DocumentFragment()
    for(e of arr) {
        frag.appendChild(e);
    }
    grid.append(frag);
    if (gridFolders.length === 1) {
        let main = document.getElementsByClassName("main")[0];
        let padding = parseFloat(window.getComputedStyle(main).getPropertyValue("padding-top"))*2;
        let fitWidth = (parseFloat(main.offsetHeight) - padding)*(16/9);
        if (fitWidth > parseFloat(gridFolders[0].gridItem.children[1].offsetWidth)) {
            fitWidth = parseFloat(grid.offsetWidth);
        }
        gridFolders[0].gridItem.style.width = fitWidth + "px";
        let widthDiff = parseFloat(grid.offsetWidth) - fitWidth;
        gridFolders[0].gridItem.style.marginLeft = (widthDiff/2) + "px";
    }
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
        if (searchItem(item[1], string)) {
            results.push(item[1]);
        }
    }
    fillGrid(results);
}

function setupHooks() {
    window.onresize = function() {
        if (gridFolders.length === 1) {
            for (let f of gridFolders) {
                f.gridItem.style.width = null;
                f.gridItem.style.marginLeft = null;
            }
            let main = document.getElementsByClassName("main")[0];
            let grid = document.getElementsByClassName("grid")[0];
            let padding = parseFloat(window.getComputedStyle(main).getPropertyValue("padding-top"))*2;
            let fitWidth = (parseFloat(main.offsetHeight) - padding)*(16/9);
            if (fitWidth > parseFloat(gridFolders[0].gridItem.children[1].offsetWidth)) {
                fitWidth = parseFloat(grid.offsetWidth);
            }
            gridFolders[0].gridItem.style.width = fitWidth + "px";
            let widthDiff = parseFloat(grid.offsetWidth) - fitWidth;
            gridFolders[0].gridItem.style.marginLeft = (widthDiff/2) + "px";
        }
    };

    let searchField = document.getElementsByClassName("search-field")[0];
    let orderNameCheckbox = document.getElementsByClassName("order-name-checkbox")[0];
    let orderDateCheckbox = document.getElementsByClassName("order-date-checkbox")[0];
    let sortAscCheckbox = document.getElementsByClassName("sort-asc-checkbox")[0];
    let sortDescCheckbox = document.getElementsByClassName("sort-desc-checkbox")[0];
    let filterSongDownload = document.getElementsByClassName("filter-song-download-checkbox")[0];

    searchField.oninput = function() {
        search(searchField.value);
    }

    orderNameCheckbox.onchange = function() {
        orderNameCheckbox.setAttribute("disabled", true);
        orderDateCheckbox.removeAttribute("disabled");
        orderDateCheckbox.checked = false;
        sortBy = "name";
        if(orderBy === "descending") {
            search(searchField.value);
        } else {
            sortDescCheckbox.click();
        }
    }

    orderDateCheckbox.onchange = function() {
        orderDateCheckbox.setAttribute("disabled", true);
        orderNameCheckbox.removeAttribute("disabled");
        orderNameCheckbox.checked = false
        sortBy = "date";
        if(orderBy === "ascending") {
            search(searchField.value);
        } else {
            sortAscCheckbox.click();
        }
    }

    sortAscCheckbox.onchange = function() {
        sortAscCheckbox.setAttribute("disabled", true);
        sortDescCheckbox.removeAttribute("disabled");
        sortDescCheckbox.checked = false
        orderBy = "ascending";
        search(searchField.value);
    }

    sortDescCheckbox.onchange = function() {
        sortDescCheckbox.setAttribute("disabled", true);
        sortAscCheckbox.removeAttribute("disabled");
        sortAscCheckbox.checked = false;
        orderBy = "descending";
        search(searchField.value);
    }

    filterSongDownload.onchange = function() {
        filterSong = !filterSong;
        search(searchField.value);
    }


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
    let sb = getUrlParams("sb");
    let o = getUrlParams("o");
    let f = getUrlParams("f");
    let s = getUrlParams("s");

    if (!isEmpty(f)) {
        if (f === "song") {
            document.getElementsByClassName("filter-song-download-checkbox")[0].click();
        }
    }
    if (!isEmpty(sb)) {
        if (sb === "name") {document.getElementsByClassName("order-name-checkbox")[0].click()}
        else if (sb === "date") {document.getElementsByClassName("order-date-checkbox")[0].click()}
    } else {
        document.getElementsByClassName("order-date-checkbox")[0].click();
    }
    if (!isEmpty(o)) {
        if (o === "asc") {document.getElementsByClassName("sort-asc-checkbox")[0].click()}
        else if (o === "desc") {document.getElementsByClassName("sort-desc-checkbox")[0].click()}
    } else {
        document.getElementsByClassName("sort-asc-checkbox")[0].click();
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
    searchEnabled = false;
}
document.addEventListener("DOMContentLoaded", galleryInit);

