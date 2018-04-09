/*eslint-env es6, jquery, browser*/

/* TODO
- Change image on download link hover
- Song preview
- Filter by song download available
- Sort by name or date
- Sharpen preview button
- Header with link to YouTube channel, short about section
- Appearance and polish
- Favicon
- Support for more hosting services
- Optimize network requests
- Grid area margins based on viewport so that when viewing a single image, the entire image is in view
- filter requests

*/

let nextData, slideShowGridItems = [], folderElements = [], gridElements = new Set(), itemData = new Map(), visibleElements = 0;

function returnNewEmptyGridItem() {
    let item = document.createElement('div');
    item.setAttribute("class", "sixteenbynine");
    item.innerHTML =
        "<div class='gallery-image'>\
            <div class='image-download hover'>\
                <form method='get' class='button-form'>\
                     <input type='button' class='download-button' value='Please Wait...'>\
                </form>\
            </div>\
            <div class='image-bar'>\
                <span class='image-tooltip'></span>\
                <span class='image-tooltip-extra'></span>\
            </div>\
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
        if (!gridElements.has(slideShowGridItems[i])) {
            continue;
        }
        slideShowGridItems[i].thumbnailIndex = (slideShowGridItems[i].thumbnailIndex + 1) % (slideShowGridItems[i].thumbnails.length);
        let img = new Image();
        img.onload = function() {
            slideShowGridItems[i].css("background-image", "url(" + img.src + ")");
        }
        img.src = slideShowGridItems[i].thumbnails[slideShowGridItems[i].thumbnailIndex];
    }
}

function createGridItem(folder) {
    let title = folder.name.split("(")[0];
    let thumbnails = [];
    for (let i = 0; i < folder.thumbnails.length; i++) {
        thumbnails.unshift(folder.thumbnails[i].large.url);
    }

    let root = returnNewEmptyGridItem();
    let element = root.children();
    element.children().eq(1).children().first().html(title);
    element.css("background-image", "url("+ thumbnails[0] +")");
    element.thumbnails = thumbnails;
    element.thumbnailIndex = 0;
    element.id = folder.id;
    element.hasMetadata = false;

    if (thumbnails.length > 1) {
        slideShowGridItems.push(element);
    }

    folder.gridItem = element;
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
    let folderUrl = "https://api.onedrive.com/v1.0/shares/s!AqeaU-N5JvJ_gYJLVTUOUyNy1NFPHA/items/" + folderElement.id + "/children?select=image,@content.downloadUrl,parentReference, name";
    $.get(folderUrl, function(data) {
        for (let i = 0; i < data.value.length; i++) {
            if(data.value[i].image !== undefined) {
                folderElement.images.push(data.value[i]);
            } else {
                folderElement.files.push(data.value[i]);
            }
        }

        let extra = "&nbsp;- ";

        if (data.value.length === 1) {
            extra += folderElement.images[0].image.width + "x" + folderElement.images[0].image.height;
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

            extra += folderElement.images.length + " Image";
            if (folderElement.images.length > 1) { extra += "s" }
            extra += " / " + folderElement.files.length + " Track";
            if (folderElement.files.length > 1) { extra += "s" }
            downloadBox.children().first().html(getTrackname(getFilename(folderElement.files[0])));
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

            folderElement.children().children().children().attr("value", "View Downloads");
            folderElement.children().children().children().attr("onclick", "expandDownloads(event)");
        }
        folderElement.children().eq(1).children().eq(1).html(extra);
    });
}

function prepareFoldersMetaData() {
    for (let i = 0; i < folderElements.length; i++) {
        if (folderElements[i].hasMetadata === false) {
            prepareFolderMetaData(folderElements[i]);
            folderElements[i].hasMetadata = true;
        }
    }
}

function fillGrid(folders) {
    if (gridElements.size === 1) {
        console.log("here");
        gridElements.forEach(function(o) {
            o.removeAttr("style");
        })
    }
    folderElements = [];
    gridElements.clear();
    visibleElements = 50;
    for (let folder of folders) {
        if(folder.name !== "Mix" && folder.folder !== undefined) {
            if (folder.gridItem === undefined) {
                createGridItem(folder);
            }
            folderElements.push(folder.gridItem);
            if (gridElements.size < visibleElements) {
                gridElements.add(folder.gridItem.parent());
            }
        }
    }
    let grid = $(".grid");
    grid.children().remove();
    grid.append(Array.from(gridElements));
    if (folderElements.length === 1) {
        let fitWidth = ($(".main").height()-6)*(16/9);
        if (fitWidth > parseFloat(folderElements[0].parent().css("width"))) {
            fitWidth = grid.width()-6;
        }
        folderElements[0].parent().css("width", fitWidth);
        folderElements[0].parent().css("padding-top", fitWidth/(16/9));
        let widthDiff = grid.width() - fitWidth;
        folderElements[0].parent().css("margin-left", widthDiff/2);
    }
}

function storeData(data) {
    for (let folder of data) {
        if (!itemData.has(folder.id)) {
            itemData.set(folder.id, folder);
        }
    }
}

function preloadData(link) {
    link = String(link).replace("top=50","top=2000");
    $.get(link, function(data) {
        storeData(data.value);
        console.log("preloaded");
    });
}

function searchItem(item, string) {
    if (item.name.toLowerCase().includes(string.toLowerCase())) {
        return true;
    }

    return false;
}

function search(string) {
    console.log("searching for " + string);
    results = [];
    for (item of itemData) {
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
            let fitWidth = ($(".main").height()-6)*(16/9);
            if (fitWidth > parseFloat($(".grid").css("width"))) {
                fitWidth = $(".grid").width()-6;
            }
            folderElements[0].parent().css("width", fitWidth);
            folderElements[0].parent().css("padding-top", fitWidth/(16/9));
            let widthDiff = $(".grid").width() - fitWidth;
            folderElements[0].parent().css("margin-left", widthDiff/2);
        }
    });

    $(".search-field").on("input", function(event) {
        search(event.currentTarget.value);
    })
}

function galleryInit() {
    let galleryUrl = "https://api.onedrive.com/v1.0/shares/s!AqeaU-N5JvJ_gYJLVTUOUyNy1NFPHA/root/children?select=folder,id,name,thumbnails&orderby=createdDateTime desc&expand=thumbnails&top=50";
    $.get(galleryUrl, function(data) {
        console.log(data);
        $(".loading").remove();
        nextData = data['@odata.nextLink'];
        storeData(data.value);
        fillGrid(itemData.values());
        prepareFoldersMetaData();
        setupHooks();
        preloadData(nextData);
    });

    setInterval(slideShow, 7000);
}

$(document).ready(galleryInit());
