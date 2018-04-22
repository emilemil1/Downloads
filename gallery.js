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
- Optimize
*/

let itemData = window.itemData; //All folders.
let gridFolders = []; //Folders that match the current search.
let gridElements = new Set(); //Folders that are currently visible.
let slideShowGridItems = window.slideShowGridItems; //Folders that contain multiple images.

let urlParams; // Containing the url search/sort parameters.
let sortBy = "date" //sorting order
let orderBy = "ascending" //sorting order
let filterSong = false; //only display folders with a song download

let searchEnabled = false; //Enables and disables search.

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
    if (gridElements.length === 1) {
        for (let e of gridElements) {
            e.style.width = null;
            e.style.marginLeft = null;
        }
    }

    gridFolders = [];
    gridElements = [];
    for (let folder of folders) {
        gridFolders.push(folder);
        gridElements.push(folder.gridItem);
    }

    let grid = $(".grid");
    grid.children().remove();
    let arr = Array.from(gridElements);
    sort(arr)
    grid.append(arr);
    if (gridElements.length === 1) {
        let main = $(".main");
        let padding = parseFloat(main.css("padding-top"));
        let fitWidth = (main.height())*(16/9) - padding;
        if (fitWidth > parseFloat(gridFolders[0].gridItem.children[1].offsetWidth)) {
            fitWidth = grid.width();
        }
        gridFolders[0].gridItem.style.width = fitWidth + "px";
        let widthDiff = grid.width() - fitWidth;
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
    let url = baseurl.substring(0,baseurl.indexOf("index.html")+10);
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
        console.log(url);
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
        for (let e of gridElements) {
            e.style.width = null;
            e.style.marginLeft = null;
        }
        let main = $(".main");
        let grid = $(".grid");
        let padding = parseFloat(main.css("padding-top"));
        let fitWidth = (main.height())*(16/9) - padding;
        if (fitWidth > parseFloat(gridFolders[0].gridItem.children[1].offsetWidth)) {
            fitWidth = grid.width();
        }
        gridFolders[0].gridItem.style.width = fitWidth + "px";
        let widthDiff = grid.width() - fitWidth;
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

    if (!$.isEmptyObject(f)) {
        if (f === "song") {
            $(".filter-song-download-checkbox").click();
        }
    }
    if (!$.isEmptyObject(sb)) {
        if (sb === "name") {$(".order-name-checkbox").click()}
        else if (sb === "date") {$(".order-date-checkbox").click()}
    } else {
        $(".order-date-checkbox").click();
    }
    if (!$.isEmptyObject(o)) {
        if (o === "asc") {$(".sort-asc-checkbox").click()}
        else if (o === "desc") {$(".sort-desc-checkbox").click()}
    } else {
        $(".sort-asc-checkbox").click();
    }

    if (!$.isEmptyObject(s)) {
        $(".search-field").val(s);
    }
}

function galleryInit() {
    window.requestAnimationFrame(async function() {
        await window.preload;
        searchEnabled = true;
        let s = getUrlParams("s");
        if (!$.isEmptyObject(s)) {
            search(s);
        } else {
            search("");
        }
    })
    searchEnabled = false;
    setupHooks();
    handleUrlArguments();
    setInterval(slideShow, 7000);
}
document.addEventListener("DOMContentLoaded", galleryInit);

