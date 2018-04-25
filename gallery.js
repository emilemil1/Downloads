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
- Remove src from elements far from view (-2000)
- Prevent slideshow on elements not in view (-500)
- improve search by searching data
- light/dark theme
- fade in elements on initial load.
*/

let itemData = window.itemData; //All folders.
let gridFolders = []; //Visible folders that match the current search.
let searchFolders = []; //All folders that match the current search.
let slideShowGridItems = []; //Visible folders that contain multiple images.

let urlParams; // Containing the url search/sort parameters.
let sortBy = "date" //sorting order
let orderBy = "descending" //sorting order
let filterSong = false; //only display folders with a song download

const thumbSizes = [{name: "thumbnailMedium", width: 350}, {name: "thumbnailLarge", width: 800}, {name: "downloadUrl", width: 1600}];
let curr;
let itemWidth;
let prevWidth = 0;
let windowChanged = true;

let searchEnabled = false; //Enables and disables search.
let pageSize = 100;

let loadmore;
let grid; //Grid element.
let main; //Main element.
let orderNameCheckbox;
let searchField;
let orderDateCheckbox;
let sortAscCheckbox;
let sortDescCheckbox;
let filterSongDownload;
let mutator;
let scrollPos;

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

function slideShow() {
    for (let i = 0; i < slideShowGridItems.length; i++) {
        let folder = slideShowGridItems[i];
        let images = folder.images;
        let e1 = folder.gridItem.lastElementChild.firstElementChild;
        let e2;
        if (e1.src === images[folder.thumbnailIndex][curr.name]) {
            e2 = folder.gridItem.lastElementChild.lastElementChild;
        } else {
            e2 = e1;
            e1 = folder.gridItem.lastElementChild.lastElementChild;
        }
        folder.thumbnailIndex = mod(folder.thumbnailIndex + 1,images.length);
        let index = folder.thumbnailIndex;

        if (folder.images[index].dominantColorDark === undefined) {
            let dom = folder.images[index].dominantColor;
            let multiplier = 96/(dom.r+dom.g+dom.b)
            folder.images[index].dominantColorDark = {
                r: dom.r * multiplier,
                g: dom.g * multiplier,
                b: dom.b * multiplier
            }
        }


        let rgb = getRGB(images[index].dominantColorDark);
        e2.src = folder.images[index][curr.name];
        if (e1.complete && e2.complete) {
            e1.style.opacity = "0";
            e2.style.opacity = "1";
            folder.gridItem.firstElementChild.firstElementChild.style.backgroundColor = rgb;
            folder.gridItem.firstElementChild.lastElementChild.style.backgroundColor = rgb;
            continue;
        }

        e1.onload = function() {
            if (e2.complete) {
                e1.style.opacity = "0";
                e2.style.opacity = "1";
                folder.gridItem.firstElementChild.firstElementChild.style.backgroundColor = rgb;
                folder.gridItem.firstElementChild.lastElementChild.style.backgroundColor = rgb;
            }
        }

        e2.onload = function() {
            if (e1.complete) {
                e1.style.opacity = "0";
                e2.style.opacity = "1";
                folder.gridItem.firstElementChild.firstElementChild.style.backgroundColor = rgb;
                folder.gridItem.firstElementChild.lastElementChild.style.backgroundColor = rgb;
            }
        }
    }
}

function sort(folders) {
    folders.sort(function(a, b) {
        let result;

        if (sortBy === "name") {
            let aName = a.name.toLowerCase();
            let bName = b.name.toLowerCase();
            if (aName < bName) {
                result = 1;
            } else if (aName > bName) {
                result = -1;
            } else {
                result = 0;
            }
        } else if (sortBy === "date") {
            if (a.date < b.date) {
                result = -1;
            } else if (a.date > b.date) {
                result = 1;
            } else {
                result = 0;
            }
        }

        if (orderBy === "descending") {
            result = -result;
        }
        return result;
    })
}

function calcItemWidth() {
    if (windowChanged === false) {
        return;
    }
    windowChanged = true;
    let windowWidth = document.documentElement.clientWidth + (main.clientWidth - main.offsetWidth);
    if (gridFolders.length !== 1) {
        let gridWidth = parseFloat(window.getComputedStyle(grid).getPropertyValue("width"));
        let maxGridItems = 1;
        while((maxGridItems * 16 * rem) + (gridWidth * 0.01 * (maxGridItems-1)) < gridWidth) {
            maxGridItems++;
        }
        maxGridItems--;
        maxGridItems = Math.min(maxGridItems, gridFolders.length);
        let totalItemWidth = gridWidth - (gridWidth * 0.01 * (maxGridItems-1));
        itemWidth = totalItemWidth/maxGridItems;
    } else {
        let padding = parseFloat(window.getComputedStyle(main).getPropertyValue("padding-top"))*2;
        let fitWidth = (parseFloat(main.offsetHeight) - padding)*(16/9);
        if (fitWidth > ((windowWidth - (15 * rem)) * 0.93)) {
            fitWidth = ((windowWidth - (15 * rem)) * 0.93);
        }
        itemWidth = fitWidth;
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

    console.log(width);
    console.log(curr.width);
    console.log(prevWidth);

    for (folder of gridFolders) {
        if (prevWidth != itemWidth) {
            folder.gridItem.style.width = itemWidth + "px";
        }
        if (width > thumbSizes[0].width) {
            if (prevWidth != itemWidth) {
                folder.gridItem.style.height = itemWidth/(16/9) + "px";
            }
        } else {
            if (prevWidth != itemWidth) {
                folder.gridItem.style.height = ((itemWidth/(16/9)) + 42) + "px";
            }
        }
        if (folder.images.length === 1) {
            if (folder.gridItem.lastElementChild.firstElementChild.src !== folder.images[0][curr.name]) {
                folder.gridItem.lastElementChild.firstElementChild.src = folder.images[0][curr.name];
            }
        } else {
            folder.gridItem.lastElementChild.firstElementChild.src = folder.images[folder.thumbnailIndex][curr.name];
        }
    }
    prevWidth = itemWidth;
}

function loadMore() {
    let moreFolders = [];

    for (let i = gridFolders.length; moreFolders.length < pageSize; i++) {
        if (gridFolders.length === searchFolders.length) {
            loadmore.style.display = "none";
            break;
        }
        gridFolders.push(searchFolders[i]);
        moreFolders.push(searchFolders[i]);

        if (searchFolders[i].images.length > 1) {
            slideShowGridItems.push(searchFolders[i]);
            console.log(searchFolders[i].name);
        }

    }

    let frag = new DocumentFragment()
    for(e of moreFolders) {
        frag.appendChild(e.gridItem);
    }
    resizeSource();
    grid.appendChild(frag);
}

function fillGrid(folders) {
    sort(folders);
    if (gridFolders.length === 1) {
        for (let f of gridFolders) {
            f.gridItem.style.width = null;
            f.gridItem.style.marginLeft = null;
        }
    }

    searchFolders = folders;
    gridFolders = [];
    for (folder of folders) {
        if (gridFolders.length === pageSize) {
            break;
        }
        gridFolders.push(folder);
    }

    calcItemWidth(folders.length);
    slideShowGridItems = [];
    for (let folder of gridFolders) {
        if (folder.images.length > 1) {
            slideShowGridItems.push(folder);
        }
    };
    mutator.disconnect();
    main.removeChild(grid);
    grid = document.createElement('div');
    grid.className = "grid";
    main.insertBefore(grid, loadmore);
    mutator.observe(grid, {childList: true});

    let frag = new DocumentFragment()
    for(e of gridFolders) {
        frag.appendChild(e.gridItem);
    }
    resizeSource();
    grid.appendChild(frag);

    if (gridFolders < searchFolders) {
        loadmore.style.display = "grid";
    } else {
        loadmore.style.display = "none";
    }
    if (gridFolders.length === 1) {
        gridFolders[0].gridItem.style.width = itemWidth + "px";
        let widthDiff = parseFloat(grid.offsetWidth) - itemWidth;
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
    if (orderBy !== "descending") {
        modstring += "o=" + "asc" + "&";
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
    if(orderBy === "descending") {
        search(searchField.value);
    } else {
        sortDescCheckbox.click();
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
    main = document.getElementsByClassName("main")[0];
    orderNameCheckbox = document.getElementById("order-name");
    searchField = document.getElementsByClassName("search-field")[0];
    orderDateCheckbox = document.getElementById("order-date");
    sortAscCheckbox = document.getElementById("sort-asc");
    sortDescCheckbox = document.getElementById("sort-desc");
    filterSongDownload = document.getElementById("filter-song-download");

    grid = main.firstElementChild;
    loadmore = main.lastElementChild;
    window.onresize = function() {
        windowChanged = true;
        rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
        calcItemWidth();
        if (gridFolders.length === 1) {
            for (let f of gridFolders) {
                f.gridItem.style.width = null;
                f.gridItem.style.marginLeft = null;
            }
            gridFolders[0].gridItem.style.width = itemWidth + "px";
            let widthDiff = parseFloat(grid.offsetWidth) - itemWidth;
            gridFolders[0].gridItem.style.marginLeft = (widthDiff/2) + "px";;
        }
        resizeSource();
    };

    loadmore.onclick = function() {
        loadMore();
    }

    searchField.oninput = function() {
        search(searchField.value);
    }

    orderNameCheckbox.onchange = clickNameCheckbox;
    orderDateCheckbox.onchange = clickDateCheckbox;
    sortAscCheckbox.onchange = clickSortAscCheckbox;
    sortDescCheckbox.onchange = clickSortDescCheckbox;
    filterSongDownload.onchange = clickFilterSongDownloadCheckbox;

    mutator = new MutationObserver(function (record) {
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
    });

    mutator.observe(grid, {childList: true});
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
        clickSortDescCheckbox();
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

