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
- Test colorify, vibrant, rgbaster, imgcolr, chameleon

*/

let nextData = undefined, slideShowGridItems = [], folderElements = [], gridElements = new Set(), itemData = new Map(), visibleElements = 0, urlParams, waitForPreload = false, sortBy = "date", orderBy = "ascending", filterSong = false, searchEnabled = false, colorThief = new ColorThief(), smoothLoad = true;

function returnNewEmptyGridItem() {
    let item = document.createElement('div');
    item.setAttribute("class", "grid-item");
    item.innerHTML =
        "<div class='image-ui-container'>\
            <div class='image-bar'>\
                <span class='image-menubutton'><div></div><div></div><div></div></span>\
                <span class='image-title'></span>\
            </div>\
            <div class='image-frame'></div>\
        </div>\
        <div class='sixteenbynine'>\
        </div>";
    return $(item);
}

function returnNewEmptyDownloadBox() {
    let box = document.createElement('div');
    box.setAttribute("class", "download-box");
    box.innerHTML =
            "<div class='title'></div>\
            <div class='images'><b>Images</b></div>\
            <div class='files'><b>Tracks</b></div>\
            <div class='image-list'></div>\
            <div class='file-list'></div>";
    return $(box);
}

function createImageDownloadButton(imageData) {
    let form = document.createElement('form');
    form.setAttribute("method", "GET");
    form.setAttribute("class", "button-form");

    let button = document.createElement('input');
    button.setAttribute("type", "submit");
    button.setAttribute("class", "download-button");

    let url = imageData["@content.downloadUrl"] + "/" + getFilename(imageData);
    let value = "Download Image";
    let type = getFilenameType(imageData);
    if (!isNaN(type)) {
        value += " " + type;
        url = url.substring(0, url.lastIndexOf(".")) + " " + type + url.substring(url.lastIndexOf("."));
    }
    form.setAttribute("action", url);
    button.setAttribute("value", value);

    form.appendChild(button);

    return $(form);
}

function createFileDownloadButton(fileData) {
    let form = document.createElement('form');
    form.setAttribute("method", "GET");
    form.setAttribute("class", "button-form");

    let button = document.createElement('input');
    button.setAttribute("type", "submit");
    button.setAttribute("class", "download-button");

    let url = fileData["@content.downloadUrl"] + "/" + getFilename(fileData);
    let value = "Download " + getFilenameType(fileData);
    form.setAttribute("action", url);
    button.setAttribute("value", value);

    form.appendChild(button);

    return $(form);
}

function slideShow() {
    for (let i = 0; i < slideShowGridItems.length; i++) {
        let folder = slideShowGridItems[i];
        if (!gridElements.has(folder.gridItem)) {
            continue;
        }
        let index = folder.thumbnailIndex;
        let thumbnails = slideShowGridItems[i].thumbnails;
        let e1 = folder.gridItem.children().eq(1).children().eq(index);
        index = folder.thumbnailIndex = ((index + 1) % thumbnails.length);
        let e2 = folder.gridItem.children().eq(1).children().eq(index);
        let e3 = folder.gridItem.children().eq(1).children().eq((index+1)%thumbnails.length);
        if (e3 === e1) {
            e3 = undefined;
        }
        folder.gridItem.children().first().children().first().css("background-color", folder.darkColor[index]);
        folder.gridItem.children().first().children().eq(1).css("background-color", folder.darkColor[index]);
        e1.css("opacity", 0);
        e2.css("opacity", 1);

        if (e3 === undefined || folder.darkColor[(index+1)%thumbnails.length] !== undefined) {
            return
        }

        e3.attr("src", thumbnails[(index+1)%thumbnails.length]);
        let img = new Image();
        img.onload = function() {
            let color = colorThief.getColor(img);
            folder.brightColor[(index+1)%thumbnails.length] = "rgb("+color[0]+","+color[1]+","+color[2]+")";
            let colorMod = ((color[0] + color[1] + color[2])/3)/32;
            color[0] = Math.round(color[0]/colorMod);
            color[1] = Math.round(color[1]/colorMod);
            color[2] = Math.round(color[2]/colorMod);
            folder.darkColor[(index+1)%thumbnails.length] = "rgb("+color[0]+","+color[1]+","+color[2]+")";
        }
        img.crossOrigin = "Anonymous";
        img.src = folder.smallThumbnails[(index+1)%thumbnails.length];
    }
}

function createGridItem(folder) {
    let title = folder.name.split("(")[0];
    let thumbnails = [];
    let smallThumbnails = [];
    for (let i = 0; i < folder.thumbnails.length; i++) {
        thumbnails.unshift(folder.thumbnails[i].large.url);
        smallThumbnails.unshift(folder.thumbnails[i].small.url);
    }

    let gridItem = returnNewEmptyGridItem();
    let imageCount = thumbnails.length;
    let fileCount = folder.folder.childCount - thumbnails.length;
    let extra = "- ";
    gridItem.children().first().children().first().children().eq(1).text(title);

    /*
    extra += imageCount + " Image";
    if (imageCount > 1) { extra += "s" }
    if (fileCount !== 0) {
        extra += " / " + fileCount + " Track";
        if (fileCount > 1) { extra += "s" }
    }
    element.children().eq(1).children().eq(1).text(extra);
    */

    folder.thumbnails = thumbnails;
    folder.smallThumbnails = smallThumbnails;
    folder.thumbnailIndex = 0;
    folder.hasMetadata = false;
    folder.gridItem = gridItem;
    gridItem.prop("data", folder);

    let thumbElements = [];
    for (let i=0; i<thumbnails.length; i++) {
        let img = $(
            "<img class='gallery-image' " +
            "alt='" + title + "' " +
            "crossOrigin='Anonymous' " +
            ">");
        if (thumbElements.length !== 0) {
            img.css("opacity", 0);
        }
        thumbElements.push(img);
    }
    gridItem.children().eq(1).append(thumbElements);

    folder.darkColor = [];
    folder.brightColor = [];

    if (thumbnails.length > 1) {
        slideShowGridItems.push(folder);
    }
}

function getFilenameType(fileData) {
    if (fileData.image !== undefined) {
        return parseInt(fileData.name.substring(fileData.name.lastIndexOf(" "), fileData.name.indexOf(".")));
    } else {
        let filename = fileData.name.split(".")[0];
        if (filename.endsWith(" (Original)")) {
            return "Original";
        } else if (filename.endsWith(" (Video Edit)")) {
            return "Video Edit";
        } else if (filename.endsWith(" (Nightcore)")) {
            return "Nightcore";
        }
    }
}

function getFilename(fileData) {
    if (fileData.image !== undefined) {
        return fileData.parentReference.name + fileData.name.substring(fileData.name.indexOf("."));
    } else {
        let filename = fileData.name.split(".")[0];
        let fileEnding = fileData.name.substring(fileData.name.indexOf("."));
        if (filename.endsWith(" (Original)")) {
            filename = filename.split(" (Original)")[0]
        }
        return filename + fileEnding;
    }
}

function getTrackname(filename) {
    filename = filename.split(".")[0];
    if (filename.endsWith(" (Nightcore)")) {
        filename = filename.split(" (Nightcore)")[0]
    } else if (filename.endsWith(" (Video Edit)")) {
        filename = filename.split(" (Video Edit)")[0]
    }
    return filename;
}

function expandDownloads(event) {
    let element = $($.Event(event).target.parentNode.parentNode.parentNode);
    let imagedownload = element.children().first();
    imagedownload.on("transitionend", function() {
        imagedownload.off("transitionend");
        imagedownload.css("transition", "height 0s");
        element.mouseleave(unexpandDownloads);
    })
    console.log(imagedownload);
    imagedownload.css("transition", "height 0.5s");
    imagedownload.css("height", "0px");
    imagedownload.removeClass("hover");
    element.children().eq(1).css("background-color", "rgb(0,0,0,0.9)");
    imagedownload.children(".button-form").children(".download-button").css("display", "none");
}

function unexpandDownloads(event) {
    let element = $($.Event(event).currentTarget);
    let imagedownload = element.children().first();
    imagedownload.on("transitionend", function() {
        imagedownload.off("transitionend");
        imagedownload.css("transition", "height 0s");
    })
    element.off("mouseleave");
    imagedownload.css("transition", "height 0.5s");
    imagedownload.css("height", "calc(100% - 1.75vw)");
    imagedownload.addClass("hover");
    element.children().eq(1).css("background-color", "rgb(0,0,0,0.5)");
    imagedownload.children(".button-form").children(".download-button").css("display", "initial");
}

function prepareFolderMetaData(folderElement) {
    folderElement.images = [];
    folderElement.files = [];
    let folderUrl = "https://api.onedrive.com/v1.0/shares/s!AqeaU-N5JvJ_gYJLVTUOUyNy1NFPHA/items/" + folderElement.prop("id") + "/children?select=image,@content.downloadUrl,parentReference,name";
    $.get(folderUrl, function(data) {
        for (let i = 0; i < data.value.length; i++) {
            if(data.value[i].image !== undefined) {
                folderElement.images.push(data.value[i]);
            } else {
                folderElement.files.push(data.value[i]);
            }
        }

        if (data.value.length === 1) {
            folderElement.children().children().attr("action", folderElement.images[0]["@content.downloadUrl"] + "/" + getFilename(folderElement.images[0]));
            folderElement.children().children().children().attr("value", "Download Image");
            folderElement.children().children().children().attr("type", "submit");
            /*
            if (folderElements.length === 1) {
                let img = new Image();
                img.onload = function() {
                    folderElement.css("background-image", "url(" + img.src + ")");
                }
                img.src = folderElement.images[0]["@content.downloadUrl"];
            }
            */
        } else {
            let downloadBox = returnNewEmptyDownloadBox();

            downloadBox.children().first().text(getTrackname(getFilename(folderElement.files[0])));
            downloadBox.appendTo(folderElement);

            function unexpandPrevention(event) {
                folderElement.off("mouseleave");
                $(window).blur(function() {
                    $(window).off("blur");
                    folderElement.mousemove(function() {
                        folderElement.off("mousemove");
                        folderElement.mouseleave(unexpandDownloads);
                    });
                })
            }

            for (let i = 0; i < folderElement.images.length; i++) {
                let form = createImageDownloadButton(folderElement.images[i]);
                form.appendTo(downloadBox.children().eq(3));
                form.children().click(unexpandPrevention);

                /*
                if (folderElements.length === 1) {
                    let img = new Image();
                    img.onload = function() {
                        folderElement.thumbnails[i] = img.src;
                    }
                    img.src = folderElement.images[i]["@content.downloadUrl"];
                }
                */
            }

            folderElement.files.sort(function(e1, e2) {
                function nameToNumber(name) {
                    if (name === "Original") {return 1}
                    if (name === "Video Edit") {return 2}
                    if (name === "Nightcore") {return 3}
                }
                let name1 = nameToNumber(getFilenameType(e1));
                let name2 = nameToNumber(getFilenameType(e2));

                return (name1 > name2);
            });

            for (let i = 0; i < folderElement.files.length; i++) {
                let form = createFileDownloadButton(folderElement.files[i]);
                form.appendTo(downloadBox.children().eq(4));
                form.children().click(unexpandPrevention);
            }

            folderElement.children().first().children().first().children().first().attr("value", "View Downloads");
            folderElement.children().first().children().first().children().first().attr("onclick", "expandDownloads(event)");
        }
    });
}

function prepareFoldersMetaData() {
    for (let i = 0; i < folderElements.length; i++) {
        if (folderElements[i].prop("hasMetadata") === false) {
            prepareFolderMetaData(folderElements[i]);
            folderElements[i].prop("hasMetadata", true);
        }
    }

}
function sort(folders) {
    folders.sort(function(a, b) {
        aData = a.prop("data");
        bData = b.prop("data");
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

function imagePrepare(folder) {
    folder.thumbnailIndex = 0;
    let smooth = smoothLoad;
    if (smooth) {
        folder.gridItem.css("opacity", 0);
    }
    let element = folder.gridItem.children().eq(1).children().first();
    if (element.attr("src") !== undefined) {
        return;
    }

    element.attr("src", folder.thumbnails[0]);

    let img = new Image();
    img.onload = function() {
        if (smooth) {
            folder.gridItem.css("opacity", 1);
        }
        folder.gridItem.children().eq(1).children().first().css("opacity", 1);
        let color = colorThief.getColor(img);
        folder.brightColor[0] = "rgb("+color[0]+","+color[1]+","+color[2]+")";
        let colorMod = ((color[0] + color[1] + color[2])/3)/32;
        color[0] = Math.round(color[0]/colorMod);
        color[1] = Math.round(color[1]/colorMod);
        color[2] = Math.round(color[2]/colorMod);
        folder.darkColor[0] = "rgb("+color[0]+","+color[1]+","+color[2]+")";
        folder.gridItem.children().first().children().first().css("background-color", folder.darkColor);
        folder.gridItem.children().first().children().eq(1).css("background-color", folder.darkColor);
    }
    img.crossOrigin = "Anonymous";
    img.src = folder.thumbnails[0]

    if (folder.thumbnails.length > 1) {
        let element = folder.gridItem.children().eq(1).children().eq(1);
        element.attr("src", folder.thumbnails[1]);

        let img = new Image();
        img.onload = function() {
            let color = colorThief.getColor(img);
            folder.brightColor[1] = "rgb("+color[0]+","+color[1]+","+color[2]+")";
            let colorMod = ((color[0] + color[1] + color[2])/3)/32;
            color[0] = Math.round(color[0]/colorMod);
            color[1] = Math.round(color[1]/colorMod);
            color[2] = Math.round(color[2]/colorMod);
            folder.darkColor[1] = "rgb("+color[0]+","+color[1]+","+color[2]+")";
        }
        img.crossOrigin = "Anonymous";
        img.src = folder.smallThumbnails[1];
    }
}

function fillGrid(folders) {
    if (gridElements.size === 1) {
        gridElements.forEach(function(e) {
            e.get(0).style.width = null;
            e.get(0).style.marginLeft = null;
        })
    }

    folderElements = [];
    gridElements.clear();
    visibleElements = 50;
    for (let folder of folders) {
        if(folder.name !== "Mix") {
            folderElements.push(folder);
            if (gridElements.size < visibleElements) {
                gridElements.add(folder.gridItem);
                imagePrepare(folder);
            }
        }
    }

    let grid = $(".grid");
    grid.children().remove();
    let arr = Array.from(gridElements);
    sort(arr)
    grid.append(arr);
    if (gridElements.size === 1) {
        let fitWidth = ($(".main").height())*(16/9);
        if (fitWidth > parseFloat(folderElements[0].gridItem.children().eq(1).css("width"))) {
            fitWidth = grid.width();
        }
        folderElements[0].gridItem.css("width", fitWidth);
        let widthDiff = grid.width() - fitWidth;
        folderElements[0].gridItem.css("margin-left", widthDiff/2);
    }
}

function storeData(data) {
    for (let folder of data) {
        if (!itemData.has(folder.id)) {
            createGridItem(folder);
            itemData.set(folder.id, folder);
        }
    }
}

function preloadData(link) {
    $.get(link, function(data) {
        storeData(data.value);
        finishPreload();
    });
}

var finishPreload = (function() {
    var executed = false;
    return function() {
        if (!executed) {
            executed = true;
            let searchfield = $(".search-field");
            let sidebarcover = $(".sidebar-cover");
            $(".search-symbol").css("opacity", 100);
            sidebarcover.on("transitionend", function() {
                sidebarcover.css("visibility", "hidden");
            })

            sidebarcover.css("opacity", 0);
            sidebarcover.css("pointer-events", "none");
            if (waitForPreload) {
                waitForPreload = false;
                $(".loading").remove();
                let s = getUrlParams("s");
                if (!$.isEmptyObject(s)) {
                    searchfield.val(s);
                }
            }
            search(searchfield.val());
            smoothLoad = false;
        }
    };
})();

function searchItem(item, string) {
    if (!item.name.toLowerCase().includes(string.toLowerCase())) {
        return false;
    }
    if (filterSong === true && item.thumbnails.length >= item.folder.childCount) {
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
    visibleElements = 0;
    fillGrid(results);
}

function setupHooks() {
    $(window).resize(function() {
        if (folderElements.length === 1) {
            folderElements[0].gridItem.get(0).style.width = null;
            folderElements[0].gridItem.get(0).style.marginLeft = null;
            let fitWidth = ($(".main").height())*(16/9);
            if (fitWidth > parseFloat(folderElements[0].gridItem.children().eq(1).css("width"))) {
                fitWidth = $(".grid").width();
            }
            folderElements[0].gridItem.css("width", fitWidth);
            let widthDiff = $(".grid").width() - fitWidth;
            folderElements[0].gridItem.css("margin-left", widthDiff/2);
        }
    });

    let searchField = $(".search-field");
    let orderNameCheckbox = $(".order-name-checkbox");
    let orderDateCheckbox = $(".order-date-checkbox");
    let sortAscCheckbox = $(".sort-asc-checkbox");
    let sortDescCheckbox = $(".sort-desc-checkbox");
    let filterSongDownload = $(".filter-song-download-checkbox");

    searchField.on("input", function() {
        search(searchField.val());
    })

    orderNameCheckbox.change(function() {
        orderNameCheckbox.attr("disabled", true);
        orderDateCheckbox.removeAttr("disabled");
        orderDateCheckbox.prop("checked", false);
        sortBy = "name";
        if(orderBy === "descending") {
            search(searchField.val());
        } else {
            sortDescCheckbox.click();
        }
    })

    orderDateCheckbox.change(function() {
        orderDateCheckbox.attr("disabled", true);
        orderNameCheckbox.removeAttr("disabled");
        orderNameCheckbox.prop("checked", false);
        sortBy = "date";
        if(orderBy === "ascending") {
            search(searchField.val());
        } else {
            sortAscCheckbox.click();
        }
    })

    sortAscCheckbox.change(function() {
        sortAscCheckbox.attr("disabled", true);
        sortDescCheckbox.removeAttr("disabled");
        sortDescCheckbox.prop("checked", false);
        orderBy = "ascending";
        search(searchField.val());
    })

    sortDescCheckbox.change(function() {
        sortDescCheckbox.attr("disabled", true);
        sortAscCheckbox.removeAttr("disabled");
        sortAscCheckbox.prop("checked", false);
        orderBy = "descending";
        search(searchField.val());
    })

    filterSongDownload.change(function() {
        filterSong = !filterSong;
        search(searchField.val());
    })


}

function handleUrlArguments() {
    let s = getUrlParams("s");
    let sb = getUrlParams("sb");
    let o = getUrlParams("o");
    let f = getUrlParams("f");

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
        search(s);
        waitForPreload = true;
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

function galleryInit() {
    setupHooks();
    handleUrlArguments();
    if (!waitForPreload) {
        $(".loading").remove();
    }
    let galleryUrl = "https://api.onedrive.com/v1.0/shares/s!AqeaU-N5JvJ_gYJLVTUOUyNy1NFPHA/root/children?select=folder,id,name,thumbnails,createdDateTime&filter=folder ne null and name ne 'Mix'&";
    if (sortBy === "name") {
        galleryUrl += "orderby=name ";
    } else if (sortBy === "date") {
        galleryUrl += "orderby=createdDateTime ";
    }
    if (orderBy === "descending") {
        galleryUrl += "asc";
    } else if (orderBy === "ascending") {
        galleryUrl += "desc";
    }
    galleryUrl += "&expand=thumbnails&top=50";
    searchEnabled = true;
    preloadData(galleryUrl.replace("top=50","top=2000"));
    $.get(galleryUrl, function(data) {
        console.log(data);
        nextData = data['@odata.nextLink'];
        storeData(data.value);
        if (!waitForPreload || nextData === undefined) {
            finishPreload();
        }
        //prepareFoldersMetaData();
    });
    setInterval(slideShow, 7000);
}
document.addEventListener("DOMContentLoaded", galleryInit);
