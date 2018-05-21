/*eslint-env es6, browser*/

/* TODO
- Change image on download link hover
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
- use imgur as first-stage (uploads remaining)
- minify everything
- smooth load images when changing resolution
- only fade in images if they are not already loaded
- force reload of manifest on update
- slide out sort options
- fade in grid initial load animation only if longer than 0.1 seconds
*/

let itemData = []; //All folders.
let gridFolders = []; //Visible folders that match the current search.
let searchFolders = []; //All folders that match the current search.
let slideShowGridItems = []; //Visible folders that contain multiple images.
let slideShowLoop;
let popups = [];

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
let explorerBox;
let sortOption;
let searchField;
let orderOption;
let filterSongDownload;
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

function imgonerror(event) {
    let e = event.currentTarget;
    let folder = e.parentElement.parentElement.data;
    if (e.src !== folder.images[folder.thumbnailIndex][curr.backup]) {
        e.src = folder.images[folder.thumbnailIndex][curr.backup];
    }
}

function imgonload(event) {
    let e = event.currentTarget;
    let folder = e.parentElement.parentElement.data;
    let rgb = getRGB(folder.images[folder.thumbnailIndex].dominantColorDark);
    folder.gridItem.firstElementChild.firstElementChild.style.backgroundColor = rgb;
    folder.gridItem.firstElementChild.lastElementChild.style.backgroundColor = rgb;
    folder.gridItem.lastElementChild.style.backgroundColor = rgb;
    if (e.shadow !== undefined) {
        e.shadow.style.opacity = 0;
        e.shadow = undefined;
    }
    e.style.opacity = 1;
}

function slideShow() {
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
    let gridHeight = document.body.getBoundingClientRect().height - 2.75*rem - 2*rem;
    if (itemCount !== 1) {
        gridItemsPerRow = Math.floor((gridWidth - (16*rem)) / (17*rem)) + 1;
        let gridItemsFirstRow = Math.min(gridItemsPerRow, folders.length, itemCount);
        let totalItemWidth = gridWidth - (1 * rem * (gridItemsFirstRow-1));
        itemWidth = (totalItemWidth/gridItemsFirstRow);
        itemHeight = ((itemWidth-4)/(16/9))+4;
        if (itemWidth <= thumbSizes[0].width) {
            itemHeight = itemHeight + 34;
        }
        let gridRowsPerPage = Math.max(Math.floor((gridHeight - (9*rem)) / itemHeight), 1);
        firstPageSize = gridRowsPerPage * gridItemsPerRow;
        pageSize = Math.max(gridRowsPerPage * gridItemsPerRow * 3, 10);
        let visibleItems = gridFolders.length;
        if (gridFolders.length === 0) {
            visibleItems = firstPageSize;
        }
        let visibleRows = Math.ceil(visibleItems / gridItemsPerRow);
        pageHeight = (itemHeight * visibleRows) + ((1 * rem) * (visibleRows - 1));
        if (visibleItems < itemCount) {
            pageHeight += (9 * rem);
        }
    } else {
        let fitWidth = (gridHeight - rem)*(16/9);
        if (fitWidth > gridWidth) {
            fitWidth = gridWidth;
        }
        itemWidth = fitWidth;
        itemHeight = (itemWidth/(16/9)) + rem;
        if (itemWidth <= thumbSizes[0].width) {
            itemHeight += 42;
        }
        pageHeight = mainHeight;
    }

    if ((pageHeight > mainHeight) && main.style.paddingRight !== "calc(3rem - " + scrollBarWidth + "px)") {
        main.style.paddingRight = "calc(3rem - " + scrollBarWidth + "px)";
    } else if ((pageHeight <= mainHeight) && main.style.paddingRight !== "3rem") {
        main.style.paddingRight = "3rem";
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
            imgurl = "https://i.imgur.com/" + folder.images[folder.thumbnailIndex].imgurId + curr.name + ".jpg";
        } else {
            imgurl = folder.images[folder.thumbnailIndex][curr.backup];
        }

        if (folder.gridItem.lastElementChild.firstElementChild.src !== imgurl) {
            folder.gridItem.lastElementChild.firstElementChild.src = imgurl;
        }
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
    if (gridFolders.length === 1) {
        for (let f of gridFolders) {
            f.gridItem.style.marginLeft = null;
        }
    }

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

    if (gridFolders < searchFolders) {
        loadmore.style.display = "grid";
    } else {
        loadmore.style.display = "none";
    }
    if (gridFolders.length === 1) {
        let widthDiff = parseFloat(grid.offsetWidth) - itemWidth;
        gridFolders[0].gridItem.style.marginLeft = (widthDiff/2) + "px";
    }
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
        url += modstring;
    }
    if (url != baseurl) {
        window.history.replaceState("", "", url);
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

function setupHooks() {
    main = document.getElementsByClassName("main")[0];
    searchField = document.getElementsByClassName("search-field")[0];
    orderOption = document.getElementById("order-select");
    sortOption = document.getElementById("sort-select");
    filterSongDownload = document.getElementById("filtersong-select");

    explorerBox = document.getElementsByClassName("explorer-box")[0];
    grid = main.firstElementChild;
    loadmore = main.lastElementChild;
    mainHeight = document.documentElement.scrollHeight - (2.75 * rem) - (2 * rem);
    window.onresize = function() {
        rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
        mainHeight = main.offsetHeight - (2 * rem);
        calcItemWidth(gridFolders.length);
        calcViewer();
        if (gridFolders.length === 1) {
            for (let f of gridFolders) {
                f.gridItem.style.marginLeft = null;
            }
            let widthDiff = parseFloat(grid.offsetWidth) - itemWidth;
            gridFolders[0].gridItem.style.marginLeft = (widthDiff/2) + "px";;
        }
        resizeSource();
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

    requestAnimationFrame(function(){
        filterSongDownload.removeAttribute("noanim");
    })

    window.onclick = function() {
        for (let pop of popups) {
            pop.removeAttribute("active");
        }
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

function calcViewer() {
    if (parseFloat(explorerBox.offsetHeight) <= explorerBox.parentNode.offsetHeight) {
        if (parseFloat(explorerBox.style.height) * rem > explorerBox.parentNode.offsetHeight) {
            requestAnimationFrame(monitorViewerScrollbarAdd);
        } else {
            requestAnimationFrame(monitorViewerScrollbarRemove);
        }
    } else {
        if (parseFloat(explorerBox.style.height) * rem <= explorerBox.parentNode.offsetHeight) {
            requestAnimationFrame(monitorViewerScrollbarRemove);
        } else {
            requestAnimationFrame(monitorViewerScrollbarAdd);
        }
    }
}

function monitorViewerScrollbarAdd() {
    if (explorerBox.offsetHeight > explorerBox.parentNode.offsetHeight) {
        if (explorerBox.parentNode.style.paddingRight !== "0px") {
            explorerBox.parentNode.style.paddingRight = "0px";
        }
    } else {
        requestAnimationFrame(monitorViewerScrollbarAdd);
    }
}

function monitorViewerScrollbarRemove() {
    if (explorerBox.offsetHeight <= explorerBox.parentNode.offsetHeight) {
        if (explorerBox.parentNode.style.paddingRight !== "0.5rem") {
            explorerBox.parentNode.style.paddingRight = "0.5rem";
        }
    } else {
        requestAnimationFrame(monitorViewerScrollbarRemove);
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
    for (let pop of popups) {
        pop.removeAttribute("active");
    }
    event.currentTarget.setAttribute("active", "");
    popups.push(event.currentTarget);
    event.stopPropagation();
}



async function galleryInit() {
    await window.preload;
    storeData(window.folders);
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
    setupHooks();
    handleUrlArguments();
    getScrollBarWidth();
}

document.addEventListener("DOMContentLoaded", galleryInit);
preloader();

